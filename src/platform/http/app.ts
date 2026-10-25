import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import type pg from 'pg';
import { registerHealth } from './health.ts';

export interface AppOptions {
  pool: pg.Pool;
  webDir: string;
  logger?: boolean;
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  registerHealth(app, options.pool);
  await app.register(fastifyStatic, { root: path.resolve(options.webDir), prefix: '/' });
  return app;
}
