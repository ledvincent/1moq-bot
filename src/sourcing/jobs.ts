import type { Queue } from '../platform/queue.ts';

/** The job that runs a sync started by Sync now; its data is the sync's id. */
export const SHEET_SYNC_JOB = 'sheet.sync';
/** The daily sync's schedule and job. */
export const SHEET_SYNC_DAILY_JOB = 'sheet.sync.daily';
/** 06:00 every day, read in the owner's time zone. */
export const DAILY_SYNC_CRON = '0 6 * * *';
export const OWNER_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export interface SheetSyncJob {
  syncId: string;
}

/** What the jobs run: a started sync, and the daily sync (start, then run). */
export interface SheetSyncRunners {
  runSync(syncId: string): Promise<void>;
  runDailySync(): Promise<void>;
}

/**
 * Registers the sync jobs and the daily schedule (06:00 Asia/Ho_Chi_Minh). Neither job is
 * retried: a failed sync is reported, and the owner syncs again or the next day's sync runs.
 */
export async function registerSheetJobs(queue: Queue, runners: SheetSyncRunners): Promise<void> {
  await queue.registerJob<SheetSyncJob>(SHEET_SYNC_JOB, (data) => runners.runSync(data.syncId));
  await queue.registerJob(SHEET_SYNC_DAILY_JOB, () => runners.runDailySync());
  await queue.schedule(
    SHEET_SYNC_DAILY_JOB,
    DAILY_SYNC_CRON,
    {},
    { tz: OWNER_TIME_ZONE, retryLimit: 0 },
  );
}

/** Queues the run of a sync Sync now started, without retry. */
export async function enqueueSheetSync(queue: Queue, syncId: string): Promise<void> {
  await queue.enqueue<SheetSyncJob>(SHEET_SYNC_JOB, { syncId }, { retryLimit: 0 });
}
