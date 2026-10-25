import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createDatabase, type Database } from '../db/client.ts';
import { createTestDatabase, type TestDatabase } from '../../../tests/helpers/test-db.ts';
import { buildApp } from './app.ts';

describe('GET /health', () => {
  let testDb: TestDatabase;
  let database: Database;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    database = createDatabase(testDb.url);
  });

  afterAll(async () => {
    await database.pool.end();
    await testDb.drop();
  });

  it('Health with the database up: answers 200 without signing in', async () => {
    const app = await buildApp({ pool: database.pool, webDir: inject('webDir'), logger: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('Health with the database down: answers 503 and shows no error detail', async () => {
    // Nothing listens on port 1: the database is unreachable.
    const down = createDatabase('postgres://user:secret@127.0.0.1:1/none', {
      connectionTimeoutMillis: 1000,
    });
    const app = await buildApp({ pool: down.pool, webDir: inject('webDir'), logger: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/health' });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ status: 'unavailable' });
    } finally {
      await app.close();
      await down.pool.end();
    }
  });
});
