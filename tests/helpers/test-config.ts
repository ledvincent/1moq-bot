import type { Config } from '../../src/platform/config.ts';

// A test-only value: never a real key.
export const TEST_MATCH_HASH_KEY = 'test-only-match-hash-key-not-a-secret-0123456789';

/** The settings of a service started by a test, on its own database and UI folder. */
export function testConfig(
  databaseUrl: string,
  webDir: string,
  overrides: Partial<Config> = {},
): Config {
  return {
    databaseUrl,
    port: 0,
    host: '127.0.0.1',
    webDir,
    dryRun: true,
    matchHashKey: TEST_MATCH_HASH_KEY,
    googleServiceAccount: null,
    ...overrides,
  };
}
