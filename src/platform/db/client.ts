import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';

export type Db = NodePgDatabase<typeof schema>;

export interface Database {
  pool: pg.Pool;
  db: Db;
}

export function createDatabase(databaseUrl: string, options: pg.PoolConfig = {}): Database {
  const pool = new pg.Pool({ connectionString: databaseUrl, ...options });
  // An idle client losing its connection must not crash the process.
  pool.on('error', () => {});
  const db = drizzle(pool, { schema });
  return { pool, db };
}
