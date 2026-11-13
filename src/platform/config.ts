// Settings read from the environment and checked at start.
// Error messages name the setting, never its value.

export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  webDir: string;
  // On unless DRY_RUN is exactly `false`: the send gate then sends to the internal test address.
  dryRun: boolean;
  // Key of the keyed hashes (do-not-contact list, seen businesses): part of the data, never changed.
  matchHashKey: string;
  // The Google service account the sheet is shared with; null when GOOGLE_SERVICE_ACCOUNT_KEY is unset.
  googleServiceAccount: GoogleServiceAccount | null;
}

/** The parts of a Google service account's JSON key the tool uses. */
export interface GoogleServiceAccount {
  clientEmail: string;
  privateKey: string;
}

const MATCH_HASH_KEY_MIN_LENGTH = 32;

export class SettingError extends Error {
  readonly setting: string;

  constructor(setting: string, message: string) {
    super(message);
    this.name = 'SettingError';
    this.setting = setting;
  }
}

export class MissingSettingError extends SettingError {
  constructor(setting: string) {
    super(setting, `Missing required setting: ${setting}`);
    this.name = 'MissingSettingError';
  }
}

type Env = Record<string, string | undefined>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new MissingSettingError(name);
  return value;
}

function optional(env: Env, name: string, fallback: string): string {
  const value = env[name]?.trim();
  return value ? value : fallback;
}

function port(env: Env, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 65535) {
    throw new SettingError(name, `Invalid setting: ${name} must be a port number`);
  }
  return value;
}

// Fails closed: unset or blank is on, only exactly `true` or `false` is accepted.
function dryRun(env: Env, name: string): boolean {
  const raw = env[name]?.trim();
  if (!raw || raw === 'true') return true;
  if (raw === 'false') return false;
  throw new SettingError(name, `Invalid setting: ${name} must be true or false`);
}

// Required, never defaulted: the do-not-contact check must not run without its key.
function matchHashKey(env: Env, name: string): string {
  const value = required(env, name);
  if (value.length < MATCH_HASH_KEY_MIN_LENGTH) {
    throw new SettingError(
      name,
      `Invalid setting: ${name} must be at least ${MATCH_HASH_KEY_MIN_LENGTH} characters`,
    );
  }
  return value;
}

// The JSON key file is base64-encoded on one line: an app.env line cannot hold multi-line JSON.
function googleServiceAccount(env: Env, name: string): GoogleServiceAccount | null {
  const raw = env[name]?.trim();
  if (!raw) return null;
  const invalid = () =>
    new SettingError(
      name,
      `Invalid setting: ${name} must be the service account's JSON key, base64-encoded`,
    );
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(raw)) throw invalid();
  let key: unknown;
  try {
    key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (typeof key !== 'object' || key === null) throw invalid();
  const {
    type,
    client_email: clientEmail,
    private_key: privateKey,
  } = key as Record<string, unknown>;
  if (
    type !== 'service_account' ||
    typeof clientEmail !== 'string' ||
    !clientEmail ||
    typeof privateKey !== 'string' ||
    !privateKey
  ) {
    throw invalid();
  }
  return { clientEmail, privateKey };
}

/** Reads and checks every setting; throws a SettingError naming the first bad one, never its value. */
export function loadConfig(env: Env = process.env): Config {
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    port: port(env, 'PORT', 3000),
    host: optional(env, 'HOST', '127.0.0.1'),
    webDir: optional(env, 'WEB_DIR', 'dist/web'),
    dryRun: dryRun(env, 'DRY_RUN'),
    matchHashKey: matchHashKey(env, 'MATCH_HASH_KEY'),
    googleServiceAccount: googleServiceAccount(env, 'GOOGLE_SERVICE_ACCOUNT_KEY'),
  };
}
