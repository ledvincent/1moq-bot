import { PgBoss, type Job } from 'pg-boss';

// The job queue lives in PostgreSQL (pg-boss, schema `pgboss`): jobs are rows,
// so a job queued before a restart runs after it.

export type JobHandler<T extends object> = (data: T, job: Job<T>) => Promise<void>;

export interface Queue {
  registerJob<T extends object>(name: string, handler: JobHandler<T>): Promise<void>;
  enqueue<T extends object>(name: string, data: T): Promise<string | null>;
  stop(): Promise<void>;
}

export interface QueueOptions {
  // How often a worker looks for new jobs, in seconds (pg-boss minimum 0.5).
  pollingIntervalSeconds?: number;
}

export async function startQueue(databaseUrl: string, options: QueueOptions = {}): Promise<Queue> {
  const boss = new PgBoss(databaseUrl);
  boss.on('error', (error) => {
    console.error('Job queue error:', error.message);
  });
  await boss.start();

  const created = new Set<string>();
  async function ensureQueue(name: string): Promise<void> {
    if (created.has(name)) return;
    await boss.createQueue(name);
    created.add(name);
  }

  return {
    async registerJob<T extends object>(name: string, handler: JobHandler<T>) {
      await ensureQueue(name);
      await boss.work<T>(
        name,
        { pollingIntervalSeconds: options.pollingIntervalSeconds ?? 2 },
        async (jobs: Job<T>[]) => {
          for (const job of jobs) await handler(job.data, job);
        },
      );
    },
    async enqueue<T extends object>(name: string, data: T) {
      await ensureQueue(name);
      return boss.send(name, data);
    },
    async stop() {
      await boss.stop({ graceful: true });
    },
  };
}
