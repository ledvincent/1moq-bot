import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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
      { databaseUrl: testDb.url, port: 0, host: '127.0.0.1', webDir: inject('webDir') },
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
});
