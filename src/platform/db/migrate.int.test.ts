import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../../tests/helpers/test-db.ts';
import { start } from '../../main.ts';
import { createDatabase, type Database } from './client.ts';
import { migrationsFolder } from './migrate.ts';
import { appSetting } from './schema.ts';

async function migrationCount(): Promise<number> {
  const journal = JSON.parse(
    await readFile(path.join(migrationsFolder, 'meta', '_journal.json'), 'utf8'),
  ) as { entries: unknown[] };
  return journal.entries.length;
}

async function applied(database: Database): Promise<number> {
  const result = await database.pool.query<{ count: string }>(
    'select count(*) as count from drizzle.__drizzle_migrations',
  );
  return Number(result.rows[0]?.count);
}

describe('migrations at start', () => {
  let testDb: TestDatabase;
  let database: Database;

  async function startAndStop(): Promise<void> {
    const service = await start(
      { databaseUrl: testDb.url, port: 0, host: '127.0.0.1', webDir: inject('webDir') },
      { logger: false },
    );
    await service.stop();
  }

  beforeAll(async () => {
    testDb = await createTestDatabase();
    database = createDatabase(testDb.url);
  });

  afterAll(async () => {
    await database.pool.end();
    await testDb.drop();
  });

  it('Migrations on an empty database: applies every migration', async () => {
    const tables = await database.pool.query(
      "select 1 from information_schema.tables where table_schema = 'public'",
    );
    expect(tables.rowCount).toBe(0);

    await startAndStop();

    expect(await applied(database)).toBe(await migrationCount());
    const appSettingTable = await database.pool.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'app_setting'",
    );
    expect(appSettingTable.rowCount).toBe(1);
  });

  it('Migrations on a second start: applies nothing again and keeps the data', async () => {
    await database.db.insert(appSetting).values({ key: 'probe', value: { kept: true } });
    const before = await applied(database);

    await startAndStop();

    expect(await applied(database)).toBe(before);
    const rows = await database.db.select().from(appSetting);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'probe', value: { kept: true } });
  });
});
