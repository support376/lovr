import 'server-only'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

/**
 * Supabase Postgres 연결 (drizzle + postgres-js).
 *
 * Supabase 프로젝트 > Settings > Database > Connection string > URI (Session pooler 권장)
 * 을 `DATABASE_URL` 로 설정.
 *
 * RLS는 클라이언트 단이 아닌 DB 단에서 적용되는데, 이 연결은
 * **서비스 단 (server actions)** 용이므로 service_role 권한 URL을 쓰면 RLS가 우회된다.
 * 따라서 우리는 일반 URL(anon/pooler)을 쓰면서 서버액션에서 직접 user_id 필터를 건다.
 * (Supabase Auth helper로 가져온 user.id를 매번 where 조건에 추가.)
 */
const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    'DATABASE_URL 환경변수 없음. Supabase Connection string(URI)를 Vercel env에 설정.'
  )
}

const client = postgres(url, {
  prepare: false, // Supabase pooler 호환
  max: 5,
})

export const db = drizzle(client, { schema })

export type DB = typeof db
export * from './schema'
