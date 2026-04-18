import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

const url = process.env.DATABASE_URL ?? 'file:./luvos.db'
const authToken = process.env.TURSO_AUTH_TOKEN

// 로컬(file:...)은 authToken 필요 없음. Turso 원격은 필수.
const client = createClient(authToken ? { url, authToken } : { url })

export const db = drizzle(client, { schema })

export type DB = typeof db
export * from './schema'
