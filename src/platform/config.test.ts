import { describe, expect, it } from 'vitest';
import { loadConfig, MissingSettingError, SettingError } from './config.ts';

describe('config', () => {
  it('Missing required setting: names DATABASE_URL and refuses to load', () => {
    const load = () => loadConfig({ PORT: '3000' });
    expect(load).toThrow(MissingSettingError);
    expect(load).toThrow('Missing required setting: DATABASE_URL');
  });

  it('Missing required setting: a blank value counts as missing', () => {
    expect(() => loadConfig({ DATABASE_URL: '   ' })).toThrow(
      'Missing required setting: DATABASE_URL',
    );
  });

  it('never prints a setting value in its errors', () => {
    const secret = 'not-a-port-s3cret';
    try {
      loadConfig({ DATABASE_URL: 'postgres://u:p@h/db', PORT: secret });
      expect.fail('expected an error');
    } catch (error) {
      expect((error as Error).message).toContain('PORT');
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('applies the defaults for optional settings', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@h/db' })).toEqual({
      databaseUrl: 'postgres://u:p@h/db',
      port: 3000,
      host: '127.0.0.1',
      webDir: 'dist/web',
      dryRun: true,
    });
  });

  describe('DRY_RUN', () => {
    const base = { DATABASE_URL: 'postgres://u:p@h/db' };

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
});
