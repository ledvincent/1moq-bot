import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.ts';

const INDEX = '<!doctype html><title>test app</title><div id="root"></div>';

let webDir: string;
let app: FastifyInstance;

beforeAll(async () => {
  webDir = mkdtempSync(path.join(tmpdir(), 'moq-web-'));
  writeFileSync(path.join(webDir, 'index.html'), INDEX);
  mkdirSync(path.join(webDir, 'assets'));
  writeFileSync(path.join(webDir, 'assets', 'app.js'), 'console.log(1)');
  const pool = { query: async () => ({ rows: [{ '?column?': 1 }] }) } as unknown as pg.Pool;
  app = await buildApp({ pool, webDir, logger: false });
});

afterAll(async () => {
  await app.close();
  rmSync(webDir, { recursive: true, force: true });
});

async function expectApp(url: string, method: 'GET' | 'HEAD' = 'GET') {
  const response = await app.inject({ method, url });
  expect(response.statusCode, url).toBe(200);
  expect(response.headers['content-type'], url).toContain('text/html');
  if (method === 'GET') expect(response.body, url).toBe(INDEX);
}

async function expectPlain404(url: string, method: 'GET' | 'POST' | 'PUT' = 'GET') {
  const response = await app.inject({ method, url });
  expect(response.statusCode, `${method} ${url}`).toBe(404);
  expect(response.headers['content-type'], url).toContain('application/json');
  expect(response.body, url).not.toContain('<div id="root">');
}

describe('page addresses', () => {
  it('Reload keeps the page: each page address and a lead page answer index.html', async () => {
    for (const url of [
      '/',
      '/find',
      '/review',
      '/leads',
      '/leads/',
      '/leads/lead-01',
      '/emails',
      '/templates',
      '/results',
      '/settings?x=1',
    ]) {
      await expectApp(url);
    }
  });

  it('answers HEAD on a page address with the app', async () => {
    await expectApp('/leads', 'HEAD');
  });

  it('Unknown address shows Page not found: an unknown page address answers index.html', async () => {
    await expectApp('/no-such-page');
    await expectApp('/apix');
    await expectApp('/unsubscribe');
  });

  it('Unknown API or unsubscribe address gets a plain 404, and GET /health answers as before', async () => {
    await expectPlain404('/api');
    await expectPlain404('/api/nope');
    await expectPlain404('/api/nope', 'POST');
    await expectPlain404('/u');
    await expectPlain404('/u/nope');
    await expectPlain404('/u/nope?x=1');
    await expectPlain404('/leads', 'POST');
    await expectPlain404('/settings', 'PUT');

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok' });
  });

  it('still serves static files', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('console.log(1)');
  });
});
