import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from './helpers/test-db.ts';

const root = fileURLToPath(new URL('..', import.meta.url));

// Runs a tool from node_modules the way the pnpm scripts do, without Vitest's own environment.
function run(bin: string, args: string[]) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('VITEST')),
  );
  env.NODE_ENV = 'test';
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 120_000,
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

describe('check commands', () => {
  it('Check commands fail on a problem: lint exits non-zero and names the file', () => {
    const result = run('node_modules/eslint/bin/eslint.js', [
      '--no-ignore',
      'tests/fixtures/lint-problem.ts',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('lint-problem.ts');
  });

  it('Check commands fail on a problem: type check exits non-zero and names the file', () => {
    const result = run('node_modules/typescript/bin/tsc', [
      '--noEmit',
      '-p',
      'tests/fixtures/tsconfig.json',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('type-problem.ts');
  });

  it('Check commands fail on a problem: tests exit non-zero and name the file', () => {
    const result = run('node_modules/vitest/vitest.mjs', [
      'run',
      '--config',
      'tests/fixtures/vitest.config.ts',
    ]);
    expect(result.status).not.toBe(0);
    expect(result.output).toContain('failing.fixture.ts');
  });
});

describe('integration database', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await testDb.drop();
  });

  it('Integration tests use a real PostgreSQL', async () => {
    const client = new pg.Client({ connectionString: testDb.url });
    await client.connect();
    try {
      const result = await client.query<{ version: string }>('select version() as version');
      expect(result.rows[0]?.version).toMatch(/^PostgreSQL \d+/);
    } finally {
      await client.end();
    }
  });
});
