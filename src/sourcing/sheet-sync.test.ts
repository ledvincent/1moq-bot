import { describe, expect, it } from 'vitest';
import { logSyncEnd, type SyncLog } from './sheet-sync.ts';
import { SheetLayoutError } from './sheet-rows.ts';
import { SheetReadError } from './sheet-source.ts';

function recordingLog() {
  const lines: { level: string; data: object; message: string }[] = [];
  const log: SyncLog = {
    info: (data, message) => lines.push({ level: 'info', data, message }),
    error: (data, message) => lines.push({ level: 'error', data, message }),
  };
  return { log, lines };
}

const sync = { id: 'sync-1', trigger: 'now' as const };

describe('logSyncEnd', () => {
  it("logs a done sync's id, trigger and counts", () => {
    const { log, lines } = recordingLog();
    logSyncEnd(log, sync, { kind: 'done', created: 3, flagged: 1, skipped: 2 });
    expect(lines).toEqual([
      {
        level: 'info',
        message: 'Sheet sync done',
        data: { syncId: 'sync-1', trigger: 'now', created: 3, flagged: 1, skipped: 2 },
      },
    ]);
  });

  it("a failed sync's log line holds no cell value, address or link", () => {
    const { log, lines } = recordingLog();
    // A database error as pg gives it: its message and detail name the row's values.
    const cause = Object.assign(
      new Error(
        'duplicate key value violates unique constraint "lead_email_address_normalised_unique"',
      ),
      {
        code: '23505',
        detail: 'Key (address_normalised)=(owner@harbour.example) already exists.',
      },
    );
    const error = new Error(
      'Failed query: insert into "lead" values ($1) params: Harbour Roasters,owner@harbour.example',
      { cause },
    );
    logSyncEnd(log, { id: 'sync-2', trigger: 'daily' }, { kind: 'failed', error });

    expect(lines).toEqual([
      {
        level: 'error',
        message: 'Sheet sync failed',
        data: {
          syncId: 'sync-2',
          trigger: 'daily',
          failure: 'error',
          errorName: 'Error',
          errorCode: '23505',
        },
      },
    ]);
    expect(JSON.stringify(lines)).not.toMatch(/Harbour|harbour\.example|@|docs\.google/);
  });

  it('logs the kind of a read failure and of a layout failure', () => {
    const { log, lines } = recordingLog();
    logSyncEnd(log, sync, { kind: 'failed', error: new SheetReadError('not-shared') });
    logSyncEnd(log, sync, {
      kind: 'failed',
      error: new SheetLayoutError('The sheet has no "Email" column'),
    });
    expect(lines.map((line) => (line.data as { failure: string }).failure)).toEqual([
      'not-shared',
      'layout',
    ]);
  });

  it('logs no code that is not a short database code', () => {
    const { log, lines } = recordingLog();
    const error = Object.assign(new Error('x'), { code: 'owner@harbour.example' });
    logSyncEnd(log, sync, { kind: 'failed', error });
    expect(lines[0]!.data).not.toHaveProperty('errorCode');
  });
});
