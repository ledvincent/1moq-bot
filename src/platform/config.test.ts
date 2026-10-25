import { describe, expect, it } from 'vitest';
import { loadConfig, MissingSettingError } from './config.ts';

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
    });
  });
});
