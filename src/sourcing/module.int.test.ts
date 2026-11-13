import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { testConfig } from '../../tests/helpers/test-config.ts';
import { createTestDatabase, type TestDatabase } from '../../tests/helpers/test-db.ts';
import { start, type Service } from '../main.ts';
import { FakeSheetSource } from './fake-sheet-source.ts';
import { sourcingModule } from './index.ts';

const SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';

describe('sourcing module in the running service', () => {
  let testDb: TestDatabase;
  let service: Service;
  let pool: pg.Pool;
  const sheets = new FakeSheetSource();

  beforeAll(async () => {
    testDb = await createTestDatabase();
    const config = testConfig(testDb.url, inject('webDir'));
    const sourcing = sourcingModule(config, {
      sheetSource: sheets,
      log: { info() {}, error() {} },
    });
    service = await start(config, {
      logger: false,
      queue: { pollingIntervalSeconds: 0.5 },
      registerJobs: (queue, context) => sourcing.registerJobs(queue, context),
      registerRoutes: (app, context) => sourcing.registerRoutes(app, context),
    });
    pool = new pg.Pool({ connectionString: testDb.url });
  });

  afterAll(async () => {
    await pool.end();
    await service.stop();
    await testDb.drop();
  });

  it('runs a Sync now through the queue and stores the daily schedule', async () => {
    sheets.setGrid(SHEET_ID, [
      ['Business', 'Buyer type', 'Email'],
      ['Harbour Roasters', 'Breweries', 'hello@harbour.example'],
    ]);
    const saved = await fetch(`${service.url}/api/settings/sheet`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ link: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit` }),
    });
    expect(saved.status).toBe(200);

    const started = await fetch(`${service.url}/api/sheet-syncs`, { method: 'POST' });
    expect(started.status).toBe(202);

    let latest: { sync: { status: string; createdCount: number } | null } = { sync: null };
    for (let i = 0; i < 60 && latest.sync?.status !== 'done'; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      latest = (await (
        await fetch(`${service.url}/api/sheet-syncs/latest`)
      ).json()) as typeof latest;
    }
    expect(latest.sync).toMatchObject({ status: 'done', createdCount: 1 });

    const { rows } = await pool.query<{ cron: string; timezone: string }>(
      "select cron, timezone from pgboss.schedule where name = 'sheet.sync.daily'",
    );
    expect(rows).toEqual([{ cron: '0 6 * * *', timezone: 'Asia/Ho_Chi_Minh' }]);
  });
});
