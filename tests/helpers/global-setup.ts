import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    webDir: string;
  }
}

// Integration tests: require a real PostgreSQL and build the UI once into a temp folder.
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  if (!process.env.TEST_DATABASE_URL) {
    const message =
      'TEST_DATABASE_URL is not set. Integration tests need a real PostgreSQL: run `pnpm db:up` and set TEST_DATABASE_URL (see .env.example).';
    // Printed here as well: Vitest's report of a global setup error can lose the message.
    console.error(`\n${message}\n`);
    throw new Error(message);
  }

  const webDir = await mkdtemp(path.join(tmpdir(), '1moq-web-'));
  await build({
    configFile: path.resolve('vite.config.ts'),
    logLevel: 'warn',
    build: { outDir: webDir, emptyOutDir: true },
  });
  project.provide('webDir', webDir);

  return async () => {
    await rm(webDir, { recursive: true, force: true });
  };
}
