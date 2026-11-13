import { PgBoss, type Job } from 'pg-boss';

// The job queue lives in PostgreSQL (pg-boss, schema `pgboss`): jobs are rows,
// so a job queued before a restart runs after it.

export type JobHandler<T extends object> = (data: T, job: Job<T>) => Promise<void>;

export interface JobOptions {
  // How many times a failed job is tried again (pg-boss default: 2).
  retryLimit?: number;
}

export interface ScheduleOptions extends JobOptions {
  // IANA time zone the cron expression is read in (pg-boss default: UTC).
  tz?: string;
}

export interface Queue {
  registerJob<T extends object>(name: string, handler: JobHandler<T>): Promise<void>;
  enqueue<T extends object>(name: string, data: T, options?: JobOptions): Promise<string | null>;
  /**
   * Queues a job on `name` at each time the cron expression gives, read in `options.tz`.
   * Calling it again for the same name replaces the schedule; the schedule is stored in the
   * database, so it survives a restart.
   */
  schedule<T extends object>(
    name: string,
    cron: string,
    data: T,
    options?: ScheduleOptions,
  ): Promise<void>;
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
    async enqueue<T extends object>(name: string, data: T, jobOptions: JobOptions = {}) {
      await ensureQueue(name);
      return boss.send(name, data, jobOptions);
    },
    async schedule<T extends object>(
      name: string,
      cron: string,
      data: T,
      scheduleOptions: ScheduleOptions = {},
    ) {
      await ensureQueue(name);
      await boss.schedule(name, cron, data, scheduleOptions);
    },
    async stop() {
      await boss.stop({ graceful: true });
    },
  };
}
