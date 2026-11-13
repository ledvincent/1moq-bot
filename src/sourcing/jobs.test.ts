import { PgBoss } from 'pg-boss';
import { describe, expect, it } from 'vitest';
import type { JobHandler, JobOptions, Queue, ScheduleOptions } from '../platform/queue.ts';
import { enqueueSheetSync, registerSheetJobs } from './jobs.ts';

// A queue that records what it is asked and runs a job only when the test says so.
class FakeQueue implements Queue {
  readonly handlers = new Map<string, JobHandler<object>>();
  readonly schedules: { name: string; cron: string; data: object; options?: ScheduleOptions }[] =
    [];
  readonly sent: { name: string; data: object; options?: JobOptions }[] = [];

  async registerJob<T extends object>(name: string, handler: JobHandler<T>) {
    this.handlers.set(name, handler as JobHandler<object>);
  }

  async enqueue<T extends object>(name: string, data: T, options?: JobOptions) {
    this.sent.push({ name, data, options });
    return 'job-id';
  }

  async schedule<T extends object>(name: string, cron: string, data: T, options?: ScheduleOptions) {
    this.schedules.push({ name, cron, data, options });
  }

  async stop() {}

  async run(name: string, data: object) {
    await this.handlers.get(name)!(data, {} as never);
  }
}

function setUp() {
  const queue = new FakeQueue();
  const ran: string[] = [];
  const runners = {
    runSync: async (syncId: string) => void ran.push(`sync ${syncId}`),
    runDailySync: async () => void ran.push('daily'),
  };
  return { queue, ran, register: () => registerSheetJobs(queue, runners) };
}

describe('sheet sync jobs', () => {
  it("Daily sync at six in the owner's morning", async () => {
    const { queue, register } = setUp();
    await register();

    expect(queue.schedules).toEqual([
      {
        name: 'sheet.sync.daily',
        cron: '0 6 * * *',
        data: {},
        options: { tz: 'Asia/Ho_Chi_Minh', retryLimit: 0 },
      },
    ]);
    // Through a whole day (13 Nov 2026 in Asia/Ho_Chi_Minh, UTC+7): one start, at 06:00 there.
    const [schedule] = queue.schedules;
    const boss = new PgBoss('postgres://unused@127.0.0.1:1/unused');
    const dayStart = new Date('2026-11-12T17:00:00Z');
    const dayEnd = new Date('2026-11-13T17:00:00Z');
    const starts = boss
      .previewSchedule(schedule!.cron, { tz: schedule!.options!.tz, from: dayStart, count: 3 })
      .filter((at) => at < dayEnd);
    expect(starts.map((at) => at.toISOString())).toEqual(['2026-11-12T23:00:00.000Z']);
  });

  it('the daily job runs the daily sync', async () => {
    const { queue, ran, register } = setUp();
    await register();
    await queue.run('sheet.sync.daily', {});
    expect(ran).toEqual(['daily']);
  });

  it('the sheet.sync job runs the sync it names', async () => {
    const { queue, ran, register } = setUp();
    await register();
    await queue.run('sheet.sync', { syncId: 'sync-7' });
    expect(ran).toEqual(['sync sync-7']);
  });

  it('queues a Sync now run with its sync id, without retry', async () => {
    const queue = new FakeQueue();
    await enqueueSheetSync(queue, 'sync-8');
    expect(queue.sent).toEqual([
      { name: 'sheet.sync', data: { syncId: 'sync-8' }, options: { retryLimit: 0 } },
    ]);
  });
});
