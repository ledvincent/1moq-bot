import { randomBytes } from 'node:crypto';
import pg from 'pg';

export interface TestDatabase {
  url: string;
  name: string;
  drop(): Promise<void>;
}

function adminUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set: integration tests need a PostgreSQL admin connection (see .env.example)',
    );
  }
  return url;
}

async function withAdmin<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

// A fresh, empty, randomly named database; call drop() when the test file is done.
export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `test_${randomBytes(6).toString('hex')}`;
  await withAdmin((client) => client.query(`create database "${name}"`));
  const url = new URL(adminUrl());
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    name,
    async drop() {
      await withAdmin((client) => client.query(`drop database if exists "${name}" with (force)`));
    },
  };
}
