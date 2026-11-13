// Calls to the tool's own /api, same origin. Every failure becomes an ApiError whose message the
// page can show as is.

/** A refused or failed call: `status` is the HTTP status, 0 when the server could not be reached. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const UNREACHABLE = 'The tool could not be reached. Check the connection and try again.';

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, UNREACHABLE);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // The server's own message when it gives one (`{ error }`), else a plain one.
    const error = (body as { error?: unknown } | null)?.error;
    throw new ApiError(
      response.status,
      typeof error === 'string' && error
        ? error
        : `The tool answered with an error (${response.status}).`,
    );
  }
  return body as T;
}

/** GETs a JSON answer. */
export function getJson<T>(path: string): Promise<T> {
  return call<T>(path, { method: 'GET' });
}

/** Sends a JSON body (or none) and reads the JSON answer. */
export function sendJson<T>(method: 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  return call<T>(path, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  });
}
