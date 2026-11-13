import { createDatabase, type Database } from '../../src/platform/db/client.ts';
import { runMigrations } from '../../src/platform/db/migrate.ts';
import { createTestDatabase, type TestDatabase } from './test-db.ts';

export interface MigratedDatabase extends Database {
  url: string;
  // Closes the pool and drops the database.
  drop(): Promise<void>;
}

/** A fresh test database with every migration applied, and a pool on it. */
export async function createMigratedDatabase(): Promise<MigratedDatabase> {
  const testDb: TestDatabase = await createTestDatabase();
  const database = createDatabase(testDb.url);
  await runMigrations(database.db);
  return {
    ...database,
    url: testDb.url,
    async drop() {
      await database.pool.end();
      await testDb.drop();
    },
  };
}
