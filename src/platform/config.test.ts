import { describe, expect, it } from 'vitest';
import { loadConfig, MissingSettingError, SettingError } from './config.ts';

const KEY = 'k'.repeat(32);
const base = { DATABASE_URL: 'postgres://u:p@h/db', MATCH_HASH_KEY: KEY };

// A service account JSON key as Google gives it, base64-encoded on one line.
function encodedKey(key: object): string {
  return Buffer.from(JSON.stringify(key)).toString('base64');
}

const serviceAccountKey = {
  type: 'service_account',
  project_id: 'moq-test',
  client_email: 'sheet-reader@moq-test.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n', // dirox-security: ignore (placeholder test key, not a real key)
};

function settingError(load: () => unknown): SettingError {
  try {
    load();
  } catch (error) {
    expect(error).toBeInstanceOf(SettingError);
    return error as SettingError;
  }
  return expect.fail('expected a SettingError');
}

describe('config', () => {
  it('Missing required setting: names DATABASE_URL and refuses to load', () => {
    const load = () => loadConfig({ PORT: '3000', MATCH_HASH_KEY: KEY });
    expect(load).toThrow(MissingSettingError);
    expect(load).toThrow('Missing required setting: DATABASE_URL');
  });

  it('Missing required setting: a blank value counts as missing', () => {
    expect(() => loadConfig({ DATABASE_URL: '   ', MATCH_HASH_KEY: KEY })).toThrow(
      'Missing required setting: DATABASE_URL',
    );
  });

  it('never prints a setting value in its errors', () => {
    const secret = 'not-a-port-s3cret';
    try {
      loadConfig({ ...base, PORT: secret });
      expect.fail('expected an error');
    } catch (error) {
      expect((error as Error).message).toContain('PORT');
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('applies the defaults for optional settings', () => {
    expect(loadConfig(base)).toEqual({
      databaseUrl: 'postgres://u:p@h/db',
      port: 3000,
      host: '127.0.0.1',
      webDir: 'dist/web',
      dryRun: true,
      matchHashKey: KEY,
      googleServiceAccount: null,
    });
  });

  describe('DRY_RUN', () => {
    it('Dry-run on when unset: dryRun is true without DRY_RUN or with it blank', () => {
      expect(loadConfig(base).dryRun).toBe(true);
      expect(loadConfig({ ...base, DRY_RUN: '' }).dryRun).toBe(true);
      expect(loadConfig({ ...base, DRY_RUN: '   ' }).dryRun).toBe(true);
      expect(loadConfig({ ...base, DRY_RUN: 'true' }).dryRun).toBe(true);
    });

    it('Dry-run off when set off: dryRun is false only for exactly false', () => {
      expect(loadConfig({ ...base, DRY_RUN: 'false' }).dryRun).toBe(false);
    });

    it.each(['0', 'no', 'FALSE', 'off', 'True', 'yes-s3cret'])(
      'Invalid dry-run value refuses to start: %s names DRY_RUN without the value',
      (value) => {
        try {
          loadConfig({ ...base, DRY_RUN: value });
          expect.fail('expected an error');
        } catch (error) {
          expect(error).toBeInstanceOf(SettingError);
          expect((error as SettingError).setting).toBe('DRY_RUN');
          expect((error as Error).message).toBe('Invalid setting: DRY_RUN must be true or false');
          expect((error as Error).message).not.toContain(value);
        }
      },
    );
  });

  describe('MATCH_HASH_KEY', () => {
    it('is required: missing or blank refuses to load, naming it', () => {
      for (const env of [
        { DATABASE_URL: 'postgres://u:p@h/db' },
        { ...base, MATCH_HASH_KEY: '  ' },
      ]) {
        const error = settingError(() => loadConfig(env));
        expect(error).toBeInstanceOf(MissingSettingError);
        expect(error.message).toBe('Missing required setting: MATCH_HASH_KEY');
      }
    });

    it('refuses a key shorter than 32 characters, naming the setting and not the value', () => {
      const short = 's3cret-short-key-31-characters!';
      expect(short).toHaveLength(31);
      const error = settingError(() => loadConfig({ ...base, MATCH_HASH_KEY: short }));
      expect(error.setting).toBe('MATCH_HASH_KEY');
      expect(error.message).toBe('Invalid setting: MATCH_HASH_KEY must be at least 32 characters');
      expect(error.message).not.toContain(short);
    });

    it('accepts a key of exactly 32 characters', () => {
      expect(loadConfig({ ...base, MATCH_HASH_KEY: 'x'.repeat(32) }).matchHashKey).toBe(
        'x'.repeat(32),
      );
    });
  });

  describe('GOOGLE_SERVICE_ACCOUNT_KEY', () => {
    it('is optional: unset or blank gives no service account', () => {
      expect(loadConfig(base).googleServiceAccount).toBeNull();
      expect(
        loadConfig({ ...base, GOOGLE_SERVICE_ACCOUNT_KEY: ' ' }).googleServiceAccount,
      ).toBeNull();
    });

    it('reads the client email and private key of a base64 service account key', () => {
      const config = loadConfig({
        ...base,
        GOOGLE_SERVICE_ACCOUNT_KEY: encodedKey(serviceAccountKey),
      });
      expect(config.googleServiceAccount).toEqual({
        clientEmail: 'sheet-reader@moq-test.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n', // dirox-security: ignore (placeholder test key, not a real key)
      });
    });

    it.each([
      ['not base64', 'not base64 at all!'],
      ['base64 of something that is not JSON', Buffer.from('s3cret not json').toString('base64')],
      ['raw JSON instead of base64', JSON.stringify(serviceAccountKey)],
      ['JSON that is not an object', encodedKey(['service_account'])],
      ['another key type', encodedKey({ ...serviceAccountKey, type: 'authorized_user' })],
      ['no client_email', encodedKey({ ...serviceAccountKey, client_email: undefined })],
      ['no private_key', encodedKey({ ...serviceAccountKey, private_key: '' })],
    ])('refuses %s, naming the setting and not the value', (_, value) => {
      const error = settingError(() => loadConfig({ ...base, GOOGLE_SERVICE_ACCOUNT_KEY: value }));
      expect(error.setting).toBe('GOOGLE_SERVICE_ACCOUNT_KEY');
      expect(error.message).toBe(
        "Invalid setting: GOOGLE_SERVICE_ACCOUNT_KEY must be the service account's JSON key, base64-encoded",
      );
      expect(error.message).not.toContain(value);
      expect(error.message).not.toContain('PRIVATE KEY');
    });
  });
});
