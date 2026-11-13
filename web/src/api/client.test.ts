import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getJson, sendJson } from './client.ts';
import { getLead } from './leads.ts';

function answer(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input');
      return body;
    },
  }));
}

async function failure(call: Promise<unknown>): Promise<ApiError> {
  try {
    await call;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  return expect.fail('expected an ApiError');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('reads the JSON answer of a GET', async () => {
    const fetch = answer(200, { link: null });
    vi.stubGlobal('fetch', fetch);
    expect(await getJson('/api/settings/sheet')).toEqual({ link: null });
    expect(fetch).toHaveBeenCalledWith('/api/settings/sheet', {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
  });

  it('sends a JSON body', async () => {
    const fetch = answer(200, { link: 'x' });
    vi.stubGlobal('fetch', fetch);
    await sendJson('PUT', '/api/settings/sheet', { link: 'x' });
    expect(fetch).toHaveBeenCalledWith('/api/settings/sheet', {
      method: 'PUT',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: '{"link":"x"}',
    });
  });

  it("turns a refusal into the server's own message", async () => {
    vi.stubGlobal('fetch', answer(409, { error: 'A sync is already running' }));
    const error = await failure(sendJson('POST', '/api/sheet-syncs'));
    expect(error.status).toBe(409);
    expect(error.message).toBe('A sync is already running');
  });

  it('turns an error without a message into a plain one naming the status', async () => {
    vi.stubGlobal('fetch', answer(500, undefined));
    const error = await failure(getJson('/api/leads'));
    expect(error.status).toBe(500);
    expect(error.message).toBe('The tool answered with an error (500).');

    vi.stubGlobal('fetch', answer(502, { message: 'Bad gateway' }));
    expect((await failure(getJson('/api/leads'))).message).toBe(
      'The tool answered with an error (502).',
    );
  });

  it('turns a network failure into "could not be reached", status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const error = await failure(getJson('/api/leads'));
    expect(error.status).toBe(0);
    expect(error.message).toBe(
      'The tool could not be reached. Check the connection and try again.',
    );
  });

  it('reads a 404 lead as no lead, and passes other errors on', async () => {
    vi.stubGlobal('fetch', answer(404, { error: 'No lead has this id.' }));
    expect(await getLead('lead-99')).toBeNull();

    vi.stubGlobal('fetch', answer(500, { error: 'Database unavailable' }));
    expect((await failure(getLead('lead-01'))).message).toBe('Database unavailable');
  });
});
