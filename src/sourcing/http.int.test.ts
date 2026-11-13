import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { createMigratedDatabase, type MigratedDatabase } from '../../tests/helpers/migrated-db.ts';
import { TEST_MATCH_HASH_KEY } from '../../tests/helpers/test-config.ts';
import { buildApp } from '../platform/http/app.ts';
import type { JobOptions, Queue } from '../platform/queue.ts';
import { clearSetting } from '../platform/settings.ts';
import { FakeSheetSource } from './fake-sheet-source.ts';
import { registerSourcingRoutes } from './http.ts';
import { SHEET_LINK_SETTING } from './sheet-link.ts';
import { runSync, type SyncDeps } from './sheet-sync.ts';

const SERVICE_ACCOUNT = 'sheet-reader@moq-test.iam.gserviceaccount.com';
const SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
const SHEET_LINK = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0`;
const HEADER = ['Business', 'Buyer type', 'City / area', 'Language', 'Email', 'Notes'];

// Records the jobs the routes queue; a test runs them itself.
class RecordingQueue implements Queue {
  readonly sent: { name: string; data: object; options?: JobOptions }[] = [];
  async registerJob() {}
  async enqueue<T extends object>(name: string, data: T, options?: JobOptions) {
    this.sent.push({ name, data, options });
    return 'job';
  }
  async schedule() {}
  async stop() {}
}

describe('sourcing API', () => {
  let database: MigratedDatabase;
  let app: FastifyInstance;
  let queue: RecordingQueue;
  let sheets: FakeSheetSource;
  let syncDeps: SyncDeps;

  beforeAll(async () => {
    database = await createMigratedDatabase();
    queue = new RecordingQueue();
    app = await buildApp({
      pool: database.pool,
      webDir: inject('webDir'),
      logger: false,
      registerRoutes: (routes) =>
        registerSourcingRoutes(routes, {
          db: database.db,
          queue,
          serviceAccountEmail: SERVICE_ACCOUNT,
        }),
    });
  });

  afterAll(async () => {
    await app.close();
    await database.drop();
  });

  beforeEach(async () => {
    await database.db.execute(sql`truncate lead, sheet_sync cascade`);
    await clearSetting(database.db, SHEET_LINK_SETTING);
    queue.sent.length = 0;
    sheets = new FakeSheetSource();
    syncDeps = {
      db: database.db,
      sheetSource: sheets,
      matchHashKey: TEST_MATCH_HASH_KEY,
      serviceAccountEmail: SERVICE_ACCOUNT,
      log: { info: () => {}, error: () => {} },
    };
  });

  const api = (method: 'GET' | 'PUT' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, payload });

  async function saveLink(link: string | null = SHEET_LINK) {
    const response = await api('PUT', '/api/settings/sheet', { link });
    expect(response.statusCode).toBe(200);
  }

  // Sync now through the API, then the queued job's run.
  async function syncNow() {
    const response = await api('POST', '/api/sheet-syncs');
    expect(response.statusCode).toBe(202);
    const { id } = response.json<{ id: string }>();
    await runSync(syncDeps, id);
    return id;
  }

  describe('sheet link', () => {
    it('Settings shows the service account and saves the link', async () => {
      const before = await api('GET', '/api/settings/sheet');
      expect(before.json()).toEqual({ link: null, serviceAccountEmail: SERVICE_ACCOUNT });

      const saved = await api('PUT', '/api/settings/sheet', { link: `  ${SHEET_LINK} ` });
      expect(saved.statusCode).toBe(200);
      expect(saved.json()).toEqual({ link: SHEET_LINK });

      // As a reload of Settings reads it.
      const after = await api('GET', '/api/settings/sheet');
      expect(after.json()).toEqual({ link: SHEET_LINK, serviceAccountEmail: SERVICE_ACCOUNT });
    });

    it('Link that is not a Google Sheet', async () => {
      await saveLink();
      const refused = await api('PUT', '/api/settings/sheet', {
        link: 'https://shop.example/leads',
      });
      expect(refused.statusCode).toBe(400);
      expect(refused.json()).toEqual({ error: 'This is not a Google Sheets link.' });
      expect((await api('GET', '/api/settings/sheet')).json()).toMatchObject({ link: SHEET_LINK });
    });

    it('clears the link with an empty value', async () => {
      await saveLink();
      const cleared = await api('PUT', '/api/settings/sheet', { link: '  ' });
      expect(cleared.statusCode).toBe(200);
      expect(cleared.json()).toEqual({ link: null });
      expect((await api('GET', '/api/settings/sheet')).json()).toMatchObject({ link: null });
      await saveLink(null);
    });

    it('refuses a body without a link', async () => {
      expect((await api('PUT', '/api/settings/sheet', {})).statusCode).toBe(400);
      expect((await api('PUT', '/api/settings/sheet', { link: 5 })).statusCode).toBe(400);
    });
  });

  describe('syncs', () => {
    it('refuses Sync now without a sheet link', async () => {
      const response = await api('POST', '/api/sheet-syncs');
      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'No sheet link is set' });
      expect(queue.sent).toEqual([]);
    });

    it('starts a sync and queues its run without retry', async () => {
      await saveLink();
      const response = await api('POST', '/api/sheet-syncs');
      expect(response.statusCode).toBe(202);
      const { id } = response.json<{ id: string }>();
      expect(queue.sent).toEqual([
        { name: 'sheet.sync', data: { syncId: id }, options: { retryLimit: 0 } },
      ]);
      const latest = (await api('GET', '/api/sheet-syncs/latest')).json();
      expect(latest).toMatchObject({
        linkSet: true,
        sync: { id, status: 'running', trigger: 'now' },
      });
    });

    it('Second sync while one runs', async () => {
      await saveLink();
      sheets.setGrid(SHEET_ID, [
        HEADER,
        ['Shop A', 'Gyms', 'Leeds, UK', 'EN', 'a@shop.example', ''],
        ['Shop B', 'Gyms', 'Leeds, UK', 'EN', 'b@shop.example', ''],
      ]);
      const first = await api('POST', '/api/sheet-syncs');
      expect(first.statusCode).toBe(202);

      const second = await api('POST', '/api/sheet-syncs');
      expect(second.statusCode).toBe(409);
      expect(second.json()).toEqual({ error: 'A sync is already running' });
      expect(queue.sent).toHaveLength(1);

      // Only the first sync runs: one lead per valid row.
      await runSync(syncDeps, first.json<{ id: string }>().id);
      const leads = (await api('GET', '/api/leads')).json<{ leads: { name: string }[] }>().leads;
      expect(leads.map((lead) => lead.name)).toEqual(['Shop A', 'Shop B']);
    });

    it('answers the last report, with no sync before the first', async () => {
      expect((await api('GET', '/api/sheet-syncs/latest')).json()).toEqual({
        linkSet: false,
        sync: null,
      });
      await saveLink();
      sheets.setGrid(SHEET_ID, [
        HEADER,
        ['Shop A', 'Bakery', 'Leeds, UK', 'EN', 'a@shop.example', ''],
      ]);
      await syncNow();
      const latest = (await api('GET', '/api/sheet-syncs/latest')).json();
      expect(latest).toMatchObject({
        linkSet: true,
        sync: {
          trigger: 'now',
          status: 'done',
          createdCount: 1,
          flaggedCount: 1,
          skippedCount: 0,
          lines: [{ row: 2, outcome: 'created', reasons: ['type unknown'] }],
          failure: null,
        },
      });
      expect(Date.parse(latest.sync.startedAt)).not.toBeNaN();
      expect(Date.parse(latest.sync.finishedAt)).not.toBeNaN();
    });
  });

  describe('leads', () => {
    beforeEach(async () => {
      await saveLink();
      sheets.setGrid(SHEET_ID, [
        HEADER,
        [
          'Harbour Roasters',
          'Cafés and roasters',
          'Leeds, UK',
          'English',
          'Hello@Harbour.example',
          'Line 1\nLine 2',
        ],
        ['Fernleaf', 'Bakery', 'Springfield', '', 'fern@leaf.example', ''],
      ]);
      await syncNow();
    });

    it('Imported leads on the Leads list', async () => {
      const response = await api('GET', '/api/leads');
      expect(response.statusCode).toBe(200);
      const { leads } = response.json();
      expect(leads).toEqual([
        {
          id: expect.any(String),
          name: 'Harbour Roasters',
          clientType: 'Cafés and roasters',
          status: 'waiting for review',
          statusChangedAt: expect.any(String),
          fitLevel: null,
          flags: [],
          sources: ['Google Sheet'],
        },
        {
          id: expect.any(String),
          name: 'Fernleaf',
          clientType: 'Other',
          status: 'waiting for review',
          statusChangedAt: expect.any(String),
          fitLevel: null,
          flags: ['type unknown', 'no language', 'time zone unclear'],
          sources: ['Google Sheet'],
        },
      ]);
    });

    it("Imported lead's own page", async () => {
      const { leads } = (await api('GET', '/api/leads')).json<{ leads: { id: string }[] }>();
      const response = await api('GET', `/api/leads/${leads[0]!.id}`);
      expect(response.statusCode).toBe(200);
      const found = response.json();
      expect(found).toMatchObject({
        id: leads[0]!.id,
        name: 'Harbour Roasters',
        status: 'waiting for review',
        clientType: 'Cafés and roasters',
        flags: [],
        language: 'en',
        timeZone: 'Europe/London',
        email: 'Hello@Harbour.example',
        sources: [{ source: 'Google Sheet', sheetRow: 2, addedAt: expect.any(String) }],
      });
      expect(found.facts).toEqual(
        expect.arrayContaining([
          { kind: 'buyer_type', value: 'Cafés and roasters', source: 'Google Sheet' },
          { kind: 'city_area', value: 'Leeds, UK', source: 'Google Sheet' },
          { kind: 'language', value: 'English', source: 'Google Sheet' },
          { kind: 'notes', value: 'Line 1\nLine 2', source: 'Google Sheet' },
        ]),
      );
      expect(found.facts).toHaveLength(4);
    });

    it('answers 404 for an unknown or malformed lead id', async () => {
      for (const id of ['00000000-0000-4000-8000-000000000000', 'lead-01', 'x'.repeat(40)]) {
        const response = await api('GET', `/api/leads/${id}`);
        expect(response.statusCode, id).toBe(404);
        expect(response.json(), id).toEqual({ error: 'No lead has this id.' });
      }
    });
  });
});
