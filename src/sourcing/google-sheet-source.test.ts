import Fastify, { type FastifyInstance } from 'fastify';
import { gaxios, JWT } from 'google-auth-library';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGoogleJwt,
  GoogleSheetSource,
  googleTokenProvider,
  SHEETS_READ_ONLY_SCOPE,
} from './google-sheet-source.ts';
import { SheetReadError } from './sheet-source.ts';

// A local stand-in for the Sheets API: canned answers per spreadsheet id, every request recorded.
const requests: { method: string; url: string; authorization?: string }[] = [];
let server: FastifyInstance;
let baseUrl: string;

const tabs = {
  sheets: [
    { properties: { sheetId: 7, title: "Bob's second tab", index: 1 } },
    { properties: { sheetId: 0, title: 'Leads', index: 0 } },
  ],
};
const firstTab = [
  ['Business', 'Email', 'Email sent'],
  ['Harbour Roasters', 'hello@harbour.example', 'TRUE'],
  ['Short row'],
];
const secondTab = [
  ['Business', 'Email'],
  ['Second Tab Shop', 'second@tab.example'],
];

beforeAll(async () => {
  // Closing drops every connection: after the time-out test, Node's fetch reconnects without
  // sending a request, and the server would otherwise wait for that connection forever.
  server = Fastify({ logger: false, forceCloseConnections: true });
  server.addHook('onRequest', async (request) => {
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
    });
  });
  server.all('/v4/spreadsheets/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const status = Number(/^status-(\d+)$/.exec(id)?.[1]);
    if (status) return reply.code(status).send({ error: { code: status } });
    if (id === 'slow') await new Promise((resolve) => setTimeout(resolve, 500));
    return tabs;
  });
  server.all('/v4/spreadsheets/:id/values/:range', async (request) => {
    const { range } = request.params as { range: string };
    if (range.startsWith("'Leads'!")) return { range, values: firstTab };
    return { range, values: secondTab };
  });
  // A stand-in for Google's token endpoint, answering the status in its path.
  server.post('/token/:status', async (request, reply) => {
    const status = Number((request.params as { status: string }).status);
    return reply.code(status).send({ error: 'backend_error', error_description: 'Try again.' });
  });
  baseUrl = await server.listen({ port: 0, host: '127.0.0.1' });
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  requests.length = 0;
});

const source = (timeoutMs?: number) =>
  new GoogleSheetSource({ getToken: async () => 'test-token', baseUrl, timeoutMs });

async function readFailure(read: Promise<unknown>): Promise<string> {
  try {
    await read;
  } catch (error) {
    expect(error).toBeInstanceOf(SheetReadError);
    return (error as SheetReadError).kind;
  }
  return expect.fail('expected a SheetReadError');
}

describe('GoogleSheetSource', () => {
  it('reads the first tab as the sheet shows it, rows 1 to 5,002, with the access token', async () => {
    expect(await source().readFirstTab('sheet-1')).toEqual(firstTab);
    expect(requests).toEqual([
      {
        method: 'GET',
        url: '/v4/spreadsheets/sheet-1?fields=sheets.properties',
        authorization: 'Bearer test-token',
      },
      {
        method: 'GET',
        url: `/v4/spreadsheets/sheet-1/values/${encodeURIComponent("'Leads'!1:5002")}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
        authorization: 'Bearer test-token',
      },
    ]);
  });

  it('Only the first tab is read: the tab at index 0, whatever the order of the list', async () => {
    const values = await source().readFirstTab('sheet-1');
    expect(values.flat()).not.toContain('Second Tab Shop');
    expect(requests.filter((request) => request.url.includes('/values/'))).toHaveLength(1);
  });

  it('Sync writes nothing to the sheet: asks for read-only access and makes only GET requests', async () => {
    const jwt = createGoogleJwt({
      clientEmail: 'reader@moq-test.iam.gserviceaccount.com',
      privateKey: 'not-a-real-key',
    });
    expect(jwt.scopes).toEqual(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    expect(SHEETS_READ_ONLY_SCOPE).toBe('https://www.googleapis.com/auth/spreadsheets.readonly');

    await source().readFirstTab('sheet-1');
    await readFailure(source().readFirstTab('status-403'));
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every((request) => request.method === 'GET')).toBe(true);
  });

  it.each([
    [403, 'not-shared'],
    [404, 'not-found'],
    [400, 'not-found'],
    [401, 'access-refused'],
    [429, 'unavailable'],
    [500, 'unavailable'],
    [503, 'unavailable'],
  ])('turns an answer %i into "%s"', async (status, kind) => {
    expect(await readFailure(source().readFirstTab(`status-${status}`))).toBe(kind);
  });

  it('turns a time-out into "unavailable"', async () => {
    expect(await readFailure(source(100).readFirstTab('slow'))).toBe('unavailable');
  });

  it('turns an address that does not answer into "unavailable"', async () => {
    const closed = new GoogleSheetSource({
      getToken: async () => 'test-token',
      baseUrl: 'http://127.0.0.1:1',
    });
    expect(await readFailure(closed.readFirstTab('sheet-1'))).toBe('unavailable');
  });

  it('fails as "not-set-up" without a service account key, asking nothing', async () => {
    const unset = new GoogleSheetSource({ getToken: null, baseUrl });
    expect(await readFailure(unset.readFirstTab('sheet-1'))).toBe('not-set-up');
    expect(requests).toEqual([]);
  });

  it('passes on a token failure as it is', async () => {
    const refused = new GoogleSheetSource({
      getToken: async () => {
        throw new SheetReadError('access-refused');
      },
      baseUrl,
    });
    expect(await readFailure(refused.readFirstTab('sheet-1'))).toBe('access-refused');
    expect(requests).toEqual([]);
  });
});

describe('googleTokenProvider', () => {
  const account = {
    clientEmail: 'reader@moq-test.iam.gserviceaccount.com',
    privateKey: 'not-a-real-key',
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The error Google's HTTP library really gives for a token request to `url`: the request is
  // made, without retries, to the local stand-in or to a closed port, never to Google.
  async function tokenRequestError(url: string): Promise<unknown> {
    try {
      await new gaxios.Gaxios().request({ url, method: 'POST', retry: false });
    } catch (error) {
      return error;
    }
    return expect.fail('expected the token request to fail');
  }

  // Google's token request, as the JWT client makes it, fails with `error`.
  function tokenRequestFailsWith(error: unknown) {
    vi.spyOn(JWT.prototype, 'getAccessToken').mockImplementation(async () => {
      throw error;
    });
  }

  it('turns a key Google cannot use into "access-refused"', async () => {
    const getToken = googleTokenProvider(account);
    expect(await readFailure(getToken())).toBe('access-refused');
  });

  it.each([
    [503, 'unavailable'],
    [500, 'unavailable'],
    [429, 'unavailable'],
    [400, 'access-refused'],
    [401, 'access-refused'],
  ])('turns a token request answered %i into "%s"', async (status, kind) => {
    tokenRequestFailsWith(await tokenRequestError(`${baseUrl}/token/${status}`));
    expect(await readFailure(googleTokenProvider(account)())).toBe(kind);
  });

  it('turns a token request that reaches no server into "unavailable"', async () => {
    tokenRequestFailsWith(await tokenRequestError('http://127.0.0.1:1/token'));
    expect(await readFailure(googleTokenProvider(account)())).toBe('unavailable');
  });

  it('turns an answer without a token into "access-refused"', async () => {
    vi.spyOn(JWT.prototype, 'getAccessToken').mockImplementation(async () => ({ token: null }));
    expect(await readFailure(googleTokenProvider(account)())).toBe('access-refused');
  });
});
