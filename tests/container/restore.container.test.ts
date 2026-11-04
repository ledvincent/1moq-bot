import { readdirSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { countDifferences, createStack, seedRows, type Stack } from './stack.ts';

describe('restore script', () => {
  const stacks: Stack[] = [];

  afterAll(() => {
    for (const stack of stacks) stack.down();
  });

  it('Restore into an empty stack: every table has the same rows and /health answers 200', async () => {
    // The backed-up stack, with data, and quiet while it is counted and dumped.
    const source = await createStack();
    stacks.push(source);
    await source.up();
    seedRows(source, 'restore', 40);
    const stopped = source.compose(['stop', 'app']);
    expect(stopped.status, stopped.stderr).toBe(0);
    const counts = source.tableCounts();
    expect(counts).toMatch(/^public\.app_setting 40$/m);
    expect(counts).toMatch(/^drizzle\.__drizzle_migrations [1-9]\d*$/m);

    const backup = source.script('deploy/backup/backup.sh');
    expect(backup.status, backup.stderr).toBe(0);
    const [dump] = readdirSync(source.backups).filter((file) => file.endsWith('.dump.age'));
    expect(dump).toBeDefined();

    // A fresh stack: its own project, so an empty database volume.
    const target = await createStack();
    stacks.push(target);
    const restore = target.script('deploy/backup/restore.sh', [
      `${source.backups}/${dump}`,
      source.identity,
    ]);
    expect(restore.status, `${restore.stdout}\n${restore.stderr}`).toBe(0);
    expect(restore.stdout).toContain('restore: ok');

    const restored = target.tableCounts();
    expect(countDifferences(counts, restored)).toEqual([]);
    expect(restored).toMatch(/^public\.app_setting 40$/m);
    const health = await target.httpsGetWhenReady('/health');
    expect(health.status).toBe(200);

    // A second restore into the now non-empty database is refused and changes nothing.
    const again = target.script('deploy/backup/restore.sh', [
      `${source.backups}/${dump}`,
      source.identity,
    ]);
    expect(again.status).not.toBe(0);
    expect(again.stderr).toContain('restore: REFUSED');
    expect(target.tableCounts()).toBe(restored);
  });
});
