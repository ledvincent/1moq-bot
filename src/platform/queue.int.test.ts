import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createTestDatabase, type TestDatabase } from '../../tests/helpers/test-db.ts';
import { start, type Service } from '../main.ts';
import { startQueue } from './queue.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('job did not run')), ms)),
  ]);
}

describe('job queue', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await testDb.drop();
  });

  function startService(registerJobs: (service: Service['queue']) => Promise<void>) {
    return start(
      {
        databaseUrl: testDb.url,
        port: 0,
        host: '127.0.0.1',
        webDir: inject('webDir'),
        dryRun: true,
      },
      { logger: false, queue: { pollingIntervalSeconds: 0.5 }, registerJobs },
    );
  }

  it('Queued job runs in the same process', async () => {
    const ran = deferred<{ n: number }>();
    const service = await startService((queue) =>
      queue.registerJob<{ n: number }>('test.same-process', async (data) => ran.resolve(data)),
    );
    try {
      await service.queue.enqueue('test.same-process', { n: 1 });
      await expect(within(ran.promise, 20_000)).resolves.toEqual({ n: 1 });
    } finally {
      await service.stop();
    }
  });

  it('Queued job survives a restart', async () => {
    // Queue the job with an instance that has no worker, then stop it.
    const before = await startQueue(testDb.url);
    await before.enqueue('test.restart', { n: 2 });
    await before.stop();

    const ran = deferred<{ n: number }>();
    const service = await startService((queue) =>
      queue.registerJob<{ n: number }>('test.restart', async (data) => ran.resolve(data)),
    );
    try {
      await expect(within(ran.promise, 20_000)).resolves.toEqual({ n: 2 });
    } finally {
      await service.stop();
    }
  });
});
