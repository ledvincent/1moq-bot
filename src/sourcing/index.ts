import type { FastifyInstance } from 'fastify';
import type { Config } from '../platform/config.ts';
import type { Db } from '../platform/db/client.ts';
import type { Queue } from '../platform/queue.ts';
import { GoogleSheetSource, googleTokenProvider } from './google-sheet-source.ts';
import { registerSourcingRoutes } from './http.ts';
import { registerSheetJobs } from './jobs.ts';
import {
  consoleSyncLog,
  failInterruptedSyncs,
  runDailySync,
  runSync,
  type SyncDeps,
  type SyncLog,
} from './sheet-sync.ts';
import type { SheetSource } from './sheet-source.ts';

// The sourcing module's public interface: what main.ts wires into the service.

export interface SourcingOptions {
  // The Google Sheets API by default; a fake in tests.
  sheetSource?: SheetSource;
  log?: SyncLog;
}

/** The sourcing module's hooks for start(): its jobs and its /api routes. */
export function sourcingModule(config: Config, options: SourcingOptions = {}) {
  const account = config.googleServiceAccount;
  const sheetSource =
    options.sheetSource ??
    new GoogleSheetSource({ getToken: account ? googleTokenProvider(account) : null });
  const serviceAccountEmail = account?.clientEmail ?? null;
  const syncDeps = (db: Db): SyncDeps => ({
    db,
    sheetSource,
    matchHashKey: config.matchHashKey,
    serviceAccountEmail,
    log: options.log ?? consoleSyncLog,
  });

  return {
    /** Marks failed any sync a restart cut, then registers the sync jobs and the daily schedule. */
    async registerJobs(queue: Queue, context: { db: Db }): Promise<void> {
      const deps = syncDeps(context.db);
      const interrupted = await failInterruptedSyncs(context.db);
      if (interrupted > 0)
        deps.log.info({ interrupted }, 'Sheet syncs cut by a restart marked failed');
      await registerSheetJobs(queue, {
        runSync: (syncId) => runSync(deps, syncId),
        runDailySync: () => runDailySync(deps),
      });
    },
    registerRoutes(app: FastifyInstance, context: { db: Db; queue: Queue }): void {
      registerSourcingRoutes(app, { db: context.db, queue: context.queue, serviceAccountEmail });
    },
  };
}
