import type { LeadDetails, LeadSummary } from '../api/leads.ts';
import type { LatestSync, SheetSettings, SyncReport } from '../api/sheet.ts';
import type { FetchHandler } from './render.tsx';

// A stand-in for the tool's /api in the page tests, with invented data only: what the server
// would answer, and every request the page made.

export const SERVICE_ACCOUNT = 'sheet-reader@moq-test.iam.gserviceaccount.com';
export const SHEET_LINK = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOp0123456789/edit';

/** The lead the `connected-by.ts` entries name: `/leads/lead-01`. */
export function leadFixture(overrides: Partial<LeadDetails> = {}): LeadDetails {
  return {
    id: 'lead-01',
    name: 'Harbour Roasters',
    clientType: 'Cafés and roasters',
    status: 'waiting for review',
    statusChangedAt: '2026-11-13T12:00:00.000Z',
    fitLevel: null,
    flags: [],
    language: 'en',
    timeZone: 'Europe/London',
    email: 'Hello@Harbour.example',
    facts: [
      { kind: 'notes', value: 'Line one\nLine two', source: 'Google Sheet' },
      { kind: 'buyer_type', value: 'Cafés and roasters', source: 'Google Sheet' },
      { kind: 'city_area', value: 'Leeds, UK', source: 'Google Sheet' },
      { kind: 'language', value: 'English', source: 'Google Sheet' },
    ],
    sources: [{ source: 'Google Sheet', sheetRow: 5, addedAt: '2026-11-13T12:00:00.000Z' }],
    ...overrides,
  };
}

/** A second lead, flagged, in another status. */
export function flaggedLeadFixture(): LeadDetails {
  return leadFixture({
    id: 'lead-02',
    name: 'Fernleaf Bakehouse',
    clientType: 'Other',
    status: 'approved',
    flags: ['type unknown', 'no language', 'time zone unclear'],
    language: null,
    timeZone: null,
    email: 'fern@fernleaf.example',
    facts: [{ kind: 'buyer_type', value: 'Bakery', source: 'Google Sheet' }],
    sources: [{ source: 'Google Sheet', sheetRow: 6, addedAt: '2026-11-13T12:00:00.000Z' }],
  });
}

export function summaryOf(lead: LeadDetails): LeadSummary {
  const { id, name, clientType, status, statusChangedAt, fitLevel, flags } = lead;
  return {
    id,
    name,
    clientType,
    status,
    statusChangedAt,
    fitLevel,
    flags,
    sources: lead.sources.map((source) => source.source),
  };
}

export function syncReport(overrides: Partial<SyncReport> = {}): SyncReport {
  return {
    id: 'sync-1',
    trigger: 'now',
    status: 'done',
    startedAt: '2026-11-13T12:00:00.000Z',
    finishedAt: '2026-11-13T12:00:04.000Z',
    createdCount: 3,
    flaggedCount: 1,
    skippedCount: 2,
    lines: [
      { row: 3, outcome: 'skipped', reasons: ['no email'] },
      { row: 4, outcome: 'skipped', reasons: ['already contacted'] },
      { row: 5, outcome: 'created', reasons: ['type unknown'] },
    ],
    failure: null,
    ...overrides,
  };
}

interface Answer {
  status: number;
  body: unknown;
}

export interface FakeApiOptions {
  leads?: LeadDetails[];
  // Answered in turn to GET /api/sheet-syncs/latest; the last one is repeated.
  latest?: LatestSync[];
  settings?: SheetSettings;
  startSync?: Answer;
  saveLink?: (link: string) => Answer;
}

// A Response as far as the pages read it: no stream, so it settles in microtasks.
function response({ status, body }: Answer): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

/** A fake /api: `handler` serves fetch; `calls` lists each request as "METHOD path". */
export function fakeApi(options: FakeApiOptions = {}) {
  const leads = options.leads ?? [leadFixture(), flaggedLeadFixture()];
  const latest = [...(options.latest ?? [{ linkSet: true, sync: null }])];
  let settings: SheetSettings = options.settings ?? {
    link: SHEET_LINK,
    serviceAccountEmail: SERVICE_ACCOUNT,
  };
  const calls: string[] = [];
  const bodies: unknown[] = [];

  const answer = (method: string, path: string, body: unknown): Answer => {
    if (method === 'GET' && path === '/api/leads') {
      return { status: 200, body: { leads: leads.map(summaryOf) } };
    }
    const leadPath = /^\/api\/leads\/([^/]+)$/.exec(path);
    if (method === 'GET' && leadPath) {
      const found = leads.find((lead) => lead.id === decodeURIComponent(leadPath[1]!));
      return found
        ? { status: 200, body: found }
        : { status: 404, body: { error: 'No lead has this id.' } };
    }
    if (method === 'GET' && path === '/api/sheet-syncs/latest') {
      return { status: 200, body: latest.length > 1 ? latest.shift() : latest[0] };
    }
    if (method === 'POST' && path === '/api/sheet-syncs') {
      return options.startSync ?? { status: 202, body: { id: 'sync-2' } };
    }
    if (method === 'GET' && path === '/api/settings/sheet') return { status: 200, body: settings };
    if (method === 'PUT' && path === '/api/settings/sheet') {
      const link = (body as { link: string }).link;
      const saved = options.saveLink?.(link) ?? { status: 200, body: { link: link || null } };
      if (saved.status === 200) {
        settings = { ...settings, link: (saved.body as { link: string | null }).link };
      }
      return saved;
    }
    return { status: 404, body: { error: 'Not found' } };
  };

  const handler: FetchHandler = async (input, init) => {
    const method = init?.method ?? 'GET';
    const path = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push(`${method} ${path}`);
    bodies.push(body);
    return response(answer(method, path, body));
  };

  return { handler, calls, bodies };
}
