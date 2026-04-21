import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { currentUserId } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Probe = { name: string; ok: boolean; detail?: string; err?: string }

async function probe(
  name: string,
  fn: () => Promise<unknown>
): Promise<Probe> {
  try {
    const out = await fn()
    return {
      name,
      ok: true,
      detail: typeof out === 'string' ? out : JSON.stringify(out),
    }
  } catch (e) {
    return { name, ok: false, err: (e as Error).message }
  }
}

export async function GET() {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  }

  const probes = await Promise.all([
    probe('auth.currentUserId', async () => {
      const uid = await currentUserId()
      return uid ? 'authed:' + uid.slice(0, 8) : 'unauthed'
    }),
    probe('db.ping', async () => {
      const r = await db.execute(sql`select 1 as ok`)
      return r
    }),
    probe('tables.exist', async () => {
      const r = await db.execute<{ table_name: string }>(sql`
        select table_name from information_schema.tables
        where table_schema = 'public'
        order by table_name
      `)
      return Array.isArray(r) ? r.map((x) => x.table_name) : r
    }),
    probe('relationships.columns', async () => {
      const r = await db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'relationships'
        order by ordinal_position
      `)
      return Array.isArray(r) ? r.map((x) => x.column_name) : r
    }),
    probe('actors.columns', async () => {
      const r = await db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'actors'
        order by ordinal_position
      `)
      return Array.isArray(r) ? r.map((x) => x.column_name) : r
    }),
    probe('conversations.columns', async () => {
      const r = await db.execute<{ column_name: string }>(sql`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'conversations'
        order by ordinal_position
      `)
      return Array.isArray(r) ? r.map((x) => x.column_name) : r
    }),
    probe('relationships.sample', async () => {
      const r = await db.execute(sql`
        select id, state, goal, status from relationships limit 3
      `)
      return r
    }),
  ])

  return NextResponse.json({ env, probes }, { status: 200 })
}
