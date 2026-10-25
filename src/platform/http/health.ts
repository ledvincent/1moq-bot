import type { FastifyInstance } from 'fastify';
import type pg from 'pg';

const TIMEOUT_MS = 2000;

async function databaseAnswers(pool: pg.Pool): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Database health check timed out')), TIMEOUT_MS);
  });
  try {
    await Promise.race([pool.query('select 1'), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// GET /health: public, for the host. Shows only whether the database answers.
export function registerHealth(app: FastifyInstance, pool: pg.Pool): void {
  app.get('/health', async (request, reply) => {
    try {
      await databaseAnswers(pool);
      return reply.code(200).send({ status: 'ok' });
    } catch (error) {
      request.log.error({ err: error }, 'Health check: database unavailable');
      return reply.code(503).send({ status: 'unavailable' });
    }
  });
}
