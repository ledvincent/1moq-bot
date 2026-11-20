import { JWT } from 'google-auth-library';
import type { GoogleServiceAccount } from '../platform/config.ts';
import { MAX_SHEET_ROWS } from './sheet-rows.ts';
import { SheetReadError, type SheetSource } from './sheet-source.ts';

// Google's Sheets API v4, read-only, with the service account the owner shares the sheet with
// (okf/decisions/MOQ-31-google-sheet-lead-source.md, okf/integrations/google-sheets.md).

/** The only access the tool asks Google for: reading spreadsheets. */
export const SHEETS_READ_ONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

/** The Sheets API's address. */
export const SHEETS_API = 'https://sheets.googleapis.com';

// Long enough for 2,002 rows, short enough that a hung request fails the sync.
const TIMEOUT_MS = 20_000;

/** Gives an access token for the Sheets API; throws a SheetReadError when it cannot. */
export type TokenProvider = () => Promise<string>;

/** Google's JWT client for the service account, asking for the read-only scope only. */
export function createGoogleJwt(account: GoogleServiceAccount): JWT {
  return new JWT({
    email: account.clientEmail,
    key: account.privateKey,
    scopes: [SHEETS_READ_ONLY_SCOPE],
  });
}

// A failed token request: Google unreachable or failing is "unavailable", anything else (an
// invalid key, a refused account) is "access-refused".
function tokenFailure(error: unknown): SheetReadError {
  const status = (error as { response?: { status?: number }; status?: number }).response?.status;
  const code = (error as { code?: unknown }).code;
  const network =
    typeof code === 'string' &&
    ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT'].includes(code);
  if (network || (status !== undefined && (status === 429 || status >= 500))) {
    return new SheetReadError('unavailable');
  }
  return new SheetReadError('access-refused');
}

/** The token provider of a service account; tokens are cached and renewed by Google's library. */
export function googleTokenProvider(account: GoogleServiceAccount): TokenProvider {
  const jwt = createGoogleJwt(account);
  return async () => {
    try {
      const { token } = await jwt.getAccessToken();
      if (!token) throw new Error('No access token');
      return token;
    } catch (error) {
      throw tokenFailure(error);
    }
  };
}

export interface GoogleSheetSourceOptions {
  // Null when GOOGLE_SERVICE_ACCOUNT_KEY is not set: every read fails as "not-set-up".
  getToken: TokenProvider | null;
  baseUrl?: string;
  timeoutMs?: number;
}

function statusFailure(status: number): Error {
  if (status === 403) return new SheetReadError('not-shared');
  // 400 is Google's answer to a malformed spreadsheet id.
  if (status === 404 || status === 400) return new SheetReadError('not-found');
  if (status === 401) return new SheetReadError('access-refused');
  if (status === 429 || status >= 500) return new SheetReadError('unavailable');
  return new Error(`Sheets API answered ${status}`);
}

// A sheet title in A1 notation: quoted, its quotes doubled.
const quotedTitle = (title: string) => `'${title.replace(/'/g, "''")}'`;

/**
 * Reads the first tab of a spreadsheet with two GET requests: the tab list, then the first tab's
 * values, rows 1 to 5,002 (the header, 5,000 rows and one more, so a sheet over the limit shows).
 */
export class GoogleSheetSource implements SheetSource {
  readonly #getToken: TokenProvider | null;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;

  constructor(options: GoogleSheetSourceOptions) {
    this.#getToken = options.getToken;
    this.#baseUrl = (options.baseUrl ?? SHEETS_API).replace(/\/+$/, '');
    this.#timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  }

  async #get<T>(path: string, token: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}${path}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch {
      // Time-out or network error.
      throw new SheetReadError('unavailable');
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw statusFailure(response.status);
    }
    return (await response.json()) as T;
  }

  async readFirstTab(spreadsheetId: string): Promise<string[][]> {
    if (!this.#getToken) throw new SheetReadError('not-set-up');
    const token = await this.#getToken();
    const id = encodeURIComponent(spreadsheetId);

    const spreadsheet = await this.#get<{
      sheets?: { properties?: { title?: string; index?: number } }[];
    }>(`/v4/spreadsheets/${id}?fields=sheets.properties`, token);
    const tabs = (spreadsheet.sheets ?? [])
      .map((sheet) => sheet.properties ?? {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const first = tabs[0];
    if (first?.title === undefined) throw new SheetReadError('not-found');

    const range = encodeURIComponent(`${quotedTitle(first.title)}!1:${MAX_SHEET_ROWS + 2}`);
    const values = await this.#get<{ values?: unknown[][] }>(
      `/v4/spreadsheets/${id}/values/${range}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`,
      token,
    );
    return (values.values ?? []).map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
    );
  }
}
