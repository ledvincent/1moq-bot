import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

// `run:` commands of the workflow's steps, in order.
const runs = [...workflow.matchAll(/^\s+run:\s*(.+)$/gm)].map((match) => match[1]?.trim());

describe('.github/workflows/ci.yml', () => {
  it('CI runs the checks on a pull request', () => {
    expect(workflow).toMatch(/^on:\s*\n(?:\s+.*\n)*?\s+pull_request:/m);
    expect(workflow).toMatch(/^\s+services:\s*\n\s+postgres:\s*\n\s+image:\s*postgres:18/m);
    expect(workflow).toMatch(/TEST_DATABASE_URL:\s*postgres:\/\/\S+@localhost:5432\//);
    expect(runs).toEqual([
      'pnpm install --frozen-lockfile',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
    ]);
  });

  it('CI fails when a check fails', () => {
    expect(workflow).not.toContain('continue-on-error');
    expect(runs.every((command) => command && !command.includes('||'))).toBe(true);
  });
});
