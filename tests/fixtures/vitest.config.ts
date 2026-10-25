// Fixture for tests/check-commands.int.test.ts: runs only the failing fixture test.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['failing.fixture.ts'],
  },
});
