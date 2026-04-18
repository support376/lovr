import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Turso(영속) 우선. 없으면 DATABASE_URL, 그것도 없으면 로컬 SQLite 파일.
const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'file:./luvos.db'
const authToken = process.env.TURSO_AUTH_TOKEN

const client = createClient(authToken ? { url, authToken } : { url })

export const db = drizzle(client, { schema })

export type DB = typeof db
export * from './schema'
