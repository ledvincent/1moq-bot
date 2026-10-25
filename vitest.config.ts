import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Same local settings as `pnpm start` (TEST_DATABASE_URL); CI sets them in the environment.
if (existsSync('.env')) process.loadEnvFile('.env');

const exclude = ['node_modules/**', 'dist/**', 'tests/fixtures/**'];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
          exclude: [...exclude, '**/*.int.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.int.test.ts', 'tests/**/*.int.test.ts'],
          exclude,
          globalSetup: ['tests/helpers/global-setup.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
