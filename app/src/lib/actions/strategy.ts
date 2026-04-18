'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '../db/client'
import { strategies, targets } from '../db/schema'
import { ensureSchema } from '../db/init'
import { generateStrategy } from '../ai/strategy-engine'
import { updateTargetProfile } from '../ai/profile-updater'
import { updateSelfProfile } from '../ai/self-profiler'
import { getSelfOrThrow } from './self'

export async function generateStrategyAction(targetId: string) {
  await ensureSchema()
  const self = await getSelfOrThrow()
  const [target] = await db.select().from(targets).where(eq(targets.id, targetId)).limit(1)
  if (!target) throw new Error('대상을 찾을 수 없습니다')

  const strategy = await generateStrategy(self, target)
  revalidatePath(`/t/${targetId}`)
  revalidatePath(`/t/${targetId}/strategy`)
  return strategy
}

export async function reprofileAction(targetId: string) {
  await ensureSchema()
  const self = await getSelfOrThrow()
  const [target] = await db.select().from(targets).where(eq(targets.id, targetId)).limit(1)
  if (!target) throw new Error('대상을 찾을 수 없습니다')

  const result = await updateTargetProfile(self, target)
  revalidatePath(`/t/${targetId}`)
  return result
}

export async function chooseStrategyOption(input: {
  strategyId: string
  optionId: string
}) {
  await ensureSchema()
  const [s] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, input.strategyId))
    .limit(1)
  if (!s) throw new Error('전략을 찾을 수 없습니다')

  await db
    .update(strategies)
    .set({ chosenOptionId: input.optionId })
    .where(eq(strategies.id, input.strategyId))

  revalidatePath(`/t/${s.targetId}`)
}

export async function toggleStrategyTodo(input: {
  strategyId: string
  todoId: string
  done: boolean
}) {
  await ensureSchema()
  const [s] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, input.strategyId))
    .limit(1)
  if (!s) throw new Error('전략을 찾을 수 없습니다')

  const updated = s.todos.map((t) =>
    t.id === input.todoId
      ? { ...t, done: input.done, doneAt: input.done ? Date.now() : undefined }
      : t
  )

  await db
    .update(strategies)
    .set({ todos: updated })
    .where(eq(strategies.id, input.strategyId))

  revalidatePath(`/t/${s.targetId}`)
  revalidatePath(`/t/${s.targetId}/strategy`)
}

export async function addCustomTodo(input: {
  strategyId: string
  text: string
  when?: string
  priority?: 'high' | 'medium' | 'low'
}) {
  await ensureSchema()
  const [s] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, input.strategyId))
    .limit(1)
  if (!s) throw new Error('전략을 찾을 수 없습니다')

  const { randomUUID } = await import('node:crypto')
  const next = [
    ...s.todos,
    {
      id: randomUUID(),
      text: input.text,
      when: input.when ?? '언제든',
      priority: input.priority ?? 'medium',
      done: false,
    },
  ]

  await db
    .update(strategies)
    .set({ todos: next })
    .where(eq(strategies.id, input.strategyId))

  revalidatePath(`/t/${s.targetId}/strategy`)
}

export async function setStrategyOutcome(input: {
  strategyId: string
  outcome: 'good' | 'bad' | 'neutral'
  note?: string
}) {
  await ensureSchema()
  const [s] = await db
    .select()
    .from(strategies)
    .where(eq(strategies.id, input.strategyId))
    .limit(1)
  if (!s) throw new Error('전략을 찾을 수 없습니다')

  await db
    .update(strategies)
    .set({ outcome: input.outcome, outcomeNote: input.note ?? null })
    .where(eq(strategies.id, input.strategyId))

  // 클로즈드 루프 핵심: outcome 라벨 직후 Self 프로파일(= playbook, weaknesses 등)
  // 재집계. LLM 실패해도 라벨 저장은 유지.
  try {
    const self = await getSelfOrThrow()
    await updateSelfProfile(self)
  } catch (err) {
    console.error('[self reprofile after outcome failed]', err)
  }

  revalidatePath(`/t/${s.targetId}`)
  revalidatePath('/me')
  revalidatePath('/')
}
