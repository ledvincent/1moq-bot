import { pathToFileURL } from 'node:url';
import { loadConfig, SettingError, type Config } from './platform/config.ts';
import { createDatabase } from './platform/db/client.ts';
import { runMigrations } from './platform/db/migrate.ts';
import { startQueue, type Queue, type QueueOptions } from './platform/queue.ts';
import { buildApp } from './platform/http/app.ts';

export interface Service {
  // Address the web server listens on, e.g. http://127.0.0.1:3000
  url: string;
  queue: Queue;
  stop(): Promise<void>;
}

export interface StartOptions {
  logger?: boolean;
  queue?: QueueOptions;
  // Called after the queue starts and before the server listens: where workers are registered.
  registerJobs?: (queue: Queue) => Promise<void>;
}

// Starts the web server and the job worker in this one process.
export async function start(config: Config, options: StartOptions = {}): Promise<Service> {
  const database = createDatabase(config.databaseUrl);
  let queue: Queue | undefined;
  try {
    await runMigrations(database.db);
    queue = await startQueue(config.databaseUrl, options.queue);
    await options.registerJobs?.(queue);
    const app = await buildApp({
      pool: database.pool,
      webDir: config.webDir,
      logger: options.logger,
    });
    const url = await app.listen({ port: config.port, host: config.host });
    const runningQueue = queue;
    return {
      url,
      queue: runningQueue,
      async stop() {
        await app.close();
        await runningQueue.stop();
        await database.pool.end();
      },
    };
  } catch (error) {
    await queue?.stop().catch(() => {});
    await database.pool.end().catch(() => {});
    throw error;
  }
}

async function main(): Promise<void> {
  let config: Config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof SettingError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const service = await start(config);
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`${signal} received, stopping`);
    try {
      await service.stop();
      process.exit(0);
    } catch (error) {
      console.error('Shutdown failed:', error);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error('Start failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
