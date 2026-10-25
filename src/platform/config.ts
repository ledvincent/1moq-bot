// Settings read from the environment and checked at start.
// Error messages name the setting, never its value.

export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  webDir: string;
}

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

export function loadConfig(env: Env = process.env): Config {
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    port: port(env, 'PORT', 3000),
    host: optional(env, 'HOST', '127.0.0.1'),
    webDir: optional(env, 'WEB_DIR', 'dist/web'),
  };
}
