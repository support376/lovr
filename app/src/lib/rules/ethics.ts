/**
 * 최소 하드라인만 남김. warning 급 룰은 제거 (유저 판단 존중).
 *
 * 유지:
 *  - 미성년자: blocked (법적 하드라인)
 *  - 명시적 스토킹 패턴: blocked (거절 후 접근 구체 지시)
 */

import type { Actor, Goal } from '../db/schema'

export type Severity = 'ok' | 'blocked'

export type RuleResult = {
  ruleId: string
  severity: Severity
  reason: string
  law?: string
}

export type Evaluation = {
  status: Severity
  results: RuleResult[]
  applicableLaws: string[]
}

export function evaluateGoal(_params: {
  self: Actor
  partner: Actor
  partnerAge?: number
  goalCategory: Goal['category']
}): Evaluation {
  const results: RuleResult[] = []
  if (_params.partnerAge != null && _params.partnerAge < 19) {
    results.push({
      ruleId: 'minor_protection',
      severity: 'blocked',
      reason: '상대가 미성년자. 시스템 사용 불가.',
    })
  }
  return summarize(results)
}

export function evaluateActionText(params: {
  actionContent: string
  self: Actor
  partner: Actor
  partnerAge?: number
}): Evaluation {
  const results: RuleResult[] = []
  const text = params.actionContent.toLowerCase()

  if (params.partnerAge != null && params.partnerAge < 19) {
    results.push({
      ruleId: 'minor_protection',
      severity: 'blocked',
      reason: '상대 미성년.',
    })
  }

  // 명시적 스토킹 패턴만
  const explicit = [
    /거절.*?접근/,
    /차단.*?반복.*?연락/,
    /거주지.*?찾아가/,
    /반복.*?문자.*?보내.*?(무시|싫다고)/,
  ]
  if (explicit.some((p) => p.test(text))) {
    results.push({
      ruleId: 'stalking_explicit',
      severity: 'blocked',
      reason: '거절 후 반복 접근/추적 지시 감지.',
      law: '스토킹처벌법',
    })
  }

  return summarize(results)
}

function summarize(results: RuleResult[]): Evaluation {
  const blocked = results.find((r) => r.severity === 'blocked')
  const laws = new Set<string>()
  for (const r of results) if (r.law) laws.add(r.law)
  return {
    status: blocked ? 'blocked' : 'ok',
    results,
    applicableLaws: Array.from(laws),
  }
}
