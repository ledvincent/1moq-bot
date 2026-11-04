import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Same local settings as `pnpm start` (TEST_DATABASE_URL); CI sets them in the environment.
if (existsSync('.env')) process.loadEnvFile('.env');

// Container tests need Docker and a built image: only `pnpm test:container` runs them
// (`pnpm test` selects the unit and integration projects).
const container = '**/*.container.test.ts';
const exclude = ['node_modules/**', 'dist/**', 'tests/fixtures/**', container];

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
      {
        test: {
          name: 'container',
          environment: 'node',
          include: [`tests/${container}`],
          exclude: ['node_modules/**', 'dist/**', 'tests/fixtures/**'],
          globalSetup: ['tests/container/global-setup.ts'],
          // One file at a time: CI memory and host ports stay simple.
          fileParallelism: false,
          testTimeout: 300_000,
          hookTimeout: 300_000,
        },
      },
    ],
  },
});
