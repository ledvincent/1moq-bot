import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, portablePath, runBinary } from './run.ts';
import { createStack, seedRows, type Stack } from './stack.ts';

const dumpName = /^moq-\d{8}T\d{6}Z\.dump\.age$/;

// The name of a dump taken `days` days ago.
function dumpOf(daysAgo: number): string {
  const stamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  return `moq-${stamp}.dump.age`;
}

describe('backup script', () => {
  let stack: Stack;
  const files = () => readdirSync(stack.backups).sort();

  beforeAll(async () => {
    stack = await createStack();
    await stack.up();
    seedRows(stack, 'backup');
  });

  afterAll(() => {
    stack?.down();
  });

  it('Backup writes an encrypted dump: readable only with the private key, a complete dump', () => {
    const before = files();
    const result = stack.script('deploy/backup/backup.sh');
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/^backup: ok .+\.dump\.age$/m);

    const added = files().filter((file) => !before.includes(file));
    expect(added).toHaveLength(1);
    expect(added[0]).toMatch(dumpName);
    expect(files().some((file) => file.endsWith('.partial'))).toBe(false);

    // Encrypted: an age file, not a PostgreSQL dump.
    const dump = `${stack.backups}/${added[0]}`;
    const bytes = readFileSync(dump);
    expect(bytes.subarray(0, 21).toString('latin1')).toBe('age-encryption.org/v1');
    expect(bytes.includes(Buffer.from('PGDMP'))).toBe(false);

    // The private key is not in the stack's settings or backup folders.
    for (const folder of [stack.etc, stack.backups]) {
      for (const file of readdirSync(folder)) {
        expect(readFileSync(path.join(folder, file)).includes('AGE-SECRET-KEY')).toBe(false);
      }
    }

    // Another key cannot read it.
    const other = portablePath(mkdtempSync(path.join(tmpdir(), 'moq-other-key-')));
    try {
      must('age-keygen', ['-o', `${other}/other.key`]);
      expect(runBinary('age', ['-d', '-i', `${other}/other.key`, dump]).status).not.toBe(0);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }

    // Decrypted with the private key, it is a complete PostgreSQL dump of the database.
    const decrypted = runBinary('age', ['-d', '-i', stack.identity, dump]);
    expect(decrypted.status, decrypted.stderr).toBe(0);
    expect(decrypted.stdout.subarray(0, 5).toString('latin1')).toBe('PGDMP');
    const list = stack.compose(
      ['exec', '-T', 'postgres', 'pg_restore', '--list'],
      decrypted.stdout,
    );
    expect(list.status, list.stderr).toBe(0);
    expect(list.stdout).toMatch(/TABLE DATA public app_setting/);
    expect(list.stdout).toMatch(/TABLE DATA drizzle __drizzle_migrations/);
    expect(list.stdout).toMatch(/SCHEMA - pgboss/);
  });

  it('Dumps older than 30 days are removed: an old dump goes, the last 30 days stay', () => {
    const old = dumpOf(31);
    const recent = dumpOf(1);
    writeFileSync(`${stack.backups}/${old}`, 'old dump');
    writeFileSync(`${stack.backups}/${recent}`, 'recent dump');
    const before = files();

    const result = stack.script('deploy/backup/backup.sh');
    expect(result.status, result.stderr).toBe(0);

    const after = files();
    expect(after).not.toContain(old);
    expect(after).toContain(recent);
    // Earlier dumps of today are kept, and a new one is added.
    expect(before.filter((file) => file !== old).every((file) => after.includes(file))).toBe(true);
    expect(after.filter((file) => !before.includes(file))).toHaveLength(1);
  });

  it('Failed backup exits with an error: non-zero, a FAILED line, no new file', () => {
    const stopped = stack.compose(['stop', 'postgres']);
    expect(stopped.status, stopped.stderr).toBe(0);
    const before = files();

    const result = stack.script('deploy/backup/backup.sh');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/^backup: FAILED at \w+/m);
    expect(result.stdout).not.toContain('backup: ok');
    expect(files()).toEqual(before);
  });
});
