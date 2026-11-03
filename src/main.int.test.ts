import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../tests/helpers/test-db.ts';
import { start } from './main.ts';

const mainFile = fileURLToPath(new URL('./main.ts', import.meta.url));

describe('service start', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await testDb.drop();
  });

  it('Local start serves the UI shell: one start() runs the web server and the worker', async () => {
    let ran!: (value: string) => void;
    const jobRan = new Promise<string>((resolve) => (ran = resolve));
    const service = await start(
      {
        databaseUrl: testDb.url,
        port: 0,
        host: '127.0.0.1',
        webDir: inject('webDir'),
        dryRun: true,
      },
      {
        logger: false,
        queue: { pollingIntervalSeconds: 0.5 },
        registerJobs: (queue) =>
          queue.registerJob<{ id: string }>('test.shell', async (data) => ran(data.id)),
      },
    );
    try {
      // The worker in this process runs a queued job.
      await service.queue.enqueue('test.shell', { id: 'from-start' });
      await expect(jobRan).resolves.toBe('from-start');

      // The web server serves the React UI shell at /.
      const page = await fetch(`${service.url}/`);
      expect(page.status).toBe(200);
      expect(page.headers.get('content-type')).toContain('text/html');
      const html = await page.text();
      expect(html).toContain('<div id="root"></div>');
      const script = /<script type="module"[^>]*src="([^"]+)"/.exec(html)?.[1];
      expect(script).toBeDefined();

      const bundle = await fetch(new URL(script!, service.url));
      expect(bundle.status).toBe(200);
      expect(await bundle.text()).toContain('1moq-bot');
    } finally {
      await service.stop();
    }
  });

  it('Missing required setting: the process exits with code 1 naming DATABASE_URL', () => {
    const env: NodeJS.ProcessEnv = { ...process.env, PORT: '0' };
    delete env.DATABASE_URL;
    const result = spawnSync(process.execPath, [mainFile], {
      env,
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required setting: DATABASE_URL');
  });

  it('Dry-run on when unset: the start-up log says dry-run is on', async () => {
    const env = serviceEnv(testDb.url);
    delete env.DRY_RUN;
    const run = await runUntilListening(env);
    expect(run.listening).toBe(true);
    expect(run.stdout).toContain('Dry-run is on: every email goes to the internal test address');
    expect(run.stdout).not.toContain('Dry-run is off');
  });

  it('Dry-run off when set off: the start-up log says dry-run is off', async () => {
    const run = await runUntilListening({ ...serviceEnv(testDb.url), DRY_RUN: 'false' });
    expect(run.listening).toBe(true);
    expect(run.stdout).toContain('Dry-run is off: emails go to their recipients');
    expect(run.stdout).not.toContain('Dry-run is on');
  });

  it('Invalid dry-run value refuses to start: exit 1 naming DRY_RUN, without the value', () => {
    const value = 'maybe-7f3c9e';
    const result = spawnSync(process.execPath, [mainFile], {
      env: { ...serviceEnv(testDb.url), DRY_RUN: value },
      encoding: 'utf8',
      timeout: 30_000,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DRY_RUN');
    expect(`${result.stdout}${result.stderr}`).not.toContain(value);
    expect(result.stdout).not.toContain('Server listening');
  });
});

describe('service start with secret settings', () => {
  const marker = `s3cret${randomBytes(8).toString('hex')}`;
  const role = `test_role_${randomBytes(6).toString('hex')}`;
  let testDb: TestDatabase;
  let databaseUrl: string;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    // A role whose password is the marker owns the test database, so the service starts for real.
    await asAdmin(async (client) => {
      await client.query(`create role "${role}" login password '${marker}'`);
      await client.query(`alter database "${testDb.name}" owner to "${role}"`);
    });
    const url = new URL(testDb.url);
    url.username = role;
    url.password = marker;
    databaseUrl = url.toString();
  });

  afterAll(async () => {
    await testDb.drop();
    await asAdmin((client) => client.query(`drop role if exists "${role}"`));
  });

  it('Start-up log holds no setting values: the output never holds a secret value', async () => {
    const run = await runUntilListening({
      ...serviceEnv(databaseUrl),
      ANTHROPIC_API_KEY: `${marker}-api`,
      MAILBOX_PASSWORD: `${marker}-mailbox`,
    });

    expect(run.listening).toBe(true);
    expect(run.stdout).toContain('Dry-run is on');
    expect(`${run.stdout}${run.stderr}`).not.toContain(marker);
  });
});

// The environment of a spawned service: no value inherited from the developer's .env.
function serviceEnv(databaseUrl: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl, PORT: '0' };
  delete env.DRY_RUN;
  env.WEB_DIR = inject('webDir');
  return env;
}

interface Run {
  listening: boolean;
  stdout: string;
  stderr: string;
}

// Starts `node src/main.ts`, waits until the server listens or the process exits, then stops it.
function runUntilListening(env: NodeJS.ProcessEnv, timeoutMs = 30_000): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [mainFile], { env });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (listening: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.removeAllListeners('exit');
      child.once('exit', () => resolve({ listening, stdout, stderr }));
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      else resolve({ listening, stdout, stderr });
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.includes('Server listening')) finish(true);
    });
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('exit', () => finish(false));
  });
}

async function asAdmin<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}
