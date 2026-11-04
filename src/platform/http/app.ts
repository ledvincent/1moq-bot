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

export function isPageAddress(url: string): boolean {
  const pathname = url.split('?')[0] ?? '';
  return !['/api', '/u'].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  registerHealth(app, options.pool);
  await app.register(fastifyStatic, { root: path.resolve(options.webDir), prefix: '/' });
  // Page addresses answer the app, which picks the page; /api and /u keep a plain 404.
  app.setNotFoundHandler((request, reply) => {
    if ((request.method === 'GET' || request.method === 'HEAD') && isPageAddress(request.url)) {
      return reply.type('text/html').sendFile('index.html');
    }
    return reply.code(404).send({
      message: `Route ${request.method}:${request.url} not found`,
      error: 'Not Found',
      statusCode: 404,
    });
  });
  return app;
}
