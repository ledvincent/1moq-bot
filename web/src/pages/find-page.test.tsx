import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, syncReport } from '../test/fake-api.ts';
import { byText, click, renderAt, settle, spyOnRequests } from '../test/render.tsx';

function sheetSection(root: HTMLElement) {
  return root.querySelector<HTMLElement>('section[data-section="google-sheet"]')!;
}

function syncButton(root: HTMLElement) {
  return byText(sheetSection(root), 'button', 'Sync now') as HTMLButtonElement;
}

const text = (element: Element) => element.textContent ?? '';

afterEach(() => {
  vi.useRealTimers();
});

describe('Find leads, Google Sheet section', () => {
  it('Sync now without a sheet link', async () => {
    const api = fakeApi({ latest: [{ linkSet: false, sync: null }] });
    spyOnRequests(api.handler);
    const root = await renderAt('/find');

    const button = syncButton(root);
    expect(button.disabled).toBe(true);
    await click(button);
    expect(api.calls).not.toContain('POST /api/sheet-syncs');

    const link = byText(sheetSection(root), 'a', 'Set the sheet link in Settings');
    expect(link.getAttribute('href')).toBe('/settings');
    await click(link);
    expect(location.pathname).toBe('/settings');
  });

  it('starts a sync with Sync now, then shows it running', async () => {
    const running = syncReport({ status: 'running', finishedAt: null, lines: null });
    const api = fakeApi({
      latest: [
        { linkSet: true, sync: null },
        { linkSet: true, sync: running },
      ],
    });
    spyOnRequests(api.handler);
    const root = await renderAt('/find');
    expect(syncButton(root).disabled).toBe(false);
    expect(text(sheetSection(root))).not.toContain('Set the sheet link in Settings');

    await click(syncButton(root));

    expect(api.calls).toEqual([
      'GET /api/sheet-syncs/latest',
      'POST /api/sheet-syncs',
      'GET /api/sheet-syncs/latest',
    ]);
    expect(syncButton(root).disabled).toBe(true);
    expect(root.querySelector('[data-sync-running]')!.textContent).toMatch(
      /^Sync running since 13 Nov 2026, \d\d:\d\d$/,
    );
  });

  it('asks for the report every 2 seconds while a sync runs, and shows it once done', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const api = fakeApi({
      latest: [
        { linkSet: true, sync: syncReport({ status: 'running', finishedAt: null, lines: null }) },
        { linkSet: true, sync: syncReport() },
      ],
    });
    spyOnRequests(api.handler);
    const root = await renderAt('/find');
    expect(root.querySelector('[data-sync-running]')).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    await settle();
    expect(api.calls).toEqual(['GET /api/sheet-syncs/latest']);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    await settle();
    expect(api.calls).toEqual(['GET /api/sheet-syncs/latest', 'GET /api/sheet-syncs/latest']);
    expect(root.querySelector('[data-sync-running]')).toBeNull();
    expect(root.querySelector('[data-sync-report]')).not.toBeNull();
    expect(syncButton(root).disabled).toBe(false);
  });

  it('Second sync while one runs', async () => {
    const api = fakeApi({
      latest: [{ linkSet: true, sync: syncReport() }],
      startSync: { status: 409, body: { error: 'A sync is already running' } },
    });
    spyOnRequests(api.handler);
    const root = await renderAt('/find');

    await click(syncButton(root));

    expect(sheetSection(root).querySelector('[role="alert"]')!.textContent).toBe(
      'A sync is already running',
    );
  });

  it('Report counts and lists rows: when, which trigger, the counts, No email and each listed row', async () => {
    spyOnRequests(fakeApi({ latest: [{ linkSet: true, sync: syncReport() }] }).handler);
    const root = await renderAt('/find');

    const report = root.querySelector<HTMLElement>('[data-sync-report]')!;
    expect(text(report)).toMatch(/13 Nov 2026, \d\d:\d\d, Sync now/);
    expect(text(report)).toContain('3 leads created, of which 1 flagged · 2 rows skipped');
    expect(report.querySelector('[data-sync-no-email]')!.textContent).toBe('No email: 1 row');
    const rows = Array.from(report.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ['4', 'Skipped', 'already contacted'],
      ['5', 'Created', 'type unknown'],
    ]);
  });

  it('shows "No email: <n> rows" for more than one row with no email', async () => {
    const sync = syncReport({ skippedCount: 13, noEmailCount: 12 });
    spyOnRequests(fakeApi({ latest: [{ linkSet: true, sync }] }).handler);
    const root = await renderAt('/find');

    expect(root.querySelector('[data-sync-no-email]')!.textContent).toBe('No email: 12 rows');
  });

  it.each([0, null])('shows no "No email" count when it is %s', async (noEmailCount) => {
    const sync = syncReport({ skippedCount: 1, noEmailCount });
    spyOnRequests(fakeApi({ latest: [{ linkSet: true, sync }] }).handler);
    const root = await renderAt('/find');

    expect(root.querySelector('[data-sync-report]')).not.toBeNull();
    expect(root.querySelector('[data-sync-no-email]')).toBeNull();
    expect(text(root.querySelector<HTMLElement>('[data-sync-report]')!)).not.toContain('No email');
  });

  it('Daily sync failure shown', async () => {
    const failed = syncReport({
      trigger: 'daily',
      status: 'failed',
      createdCount: null,
      flaggedCount: null,
      skippedCount: null,
      lines: null,
      failure:
        'The sheet is not shared with the tool. Share it with sheet-reader@moq-test.iam.gserviceaccount.com as Viewer.',
    });
    spyOnRequests(fakeApi({ latest: [{ linkSet: true, sync: failed }] }).handler);
    const root = await renderAt('/find');

    expect(root.querySelector('[data-sync-failure]')!.textContent).toMatch(
      /^Sync failed, 13 Nov 2026, \d\d:\d\d, daily sync: The sheet is not shared with the tool\. Share it with sheet-reader@moq-test\.iam\.gserviceaccount\.com as Viewer\.$/,
    );
    expect(root.querySelector('[data-sync-report]')).toBeNull();
  });

  it('shows why the report could not be read', async () => {
    spyOnRequests();
    const root = await renderAt('/find');
    expect(sheetSection(root).querySelector('[role="alert"]')!.textContent).toBe(
      'The tool could not be reached. Check the connection and try again.',
    );
    expect(syncButton(root).disabled).toBe(true);
  });
});
