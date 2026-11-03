import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, request, run, waitFor } from './run.ts';
import { imageUnderTest } from './stack.ts';

const { image } = imageUnderTest();
const postgresImage = 'postgres:18.6';

describe('container image', () => {
  const id = randomBytes(4).toString('hex');
  const network = `moq-image-${id}`;
  const postgres = `moq-image-pg-${id}`;
  const app = `moq-image-app-${id}`;
  const password = randomBytes(16).toString('hex');
  const psql = (query: string) =>
    must('docker', ['exec', postgres, 'psql', '-U', 'moq', '-d', 'moq', '-tAc', query]).trim();

  beforeAll(async () => {
    must('docker', ['network', 'create', network]);
    must('docker', [
      'run',
      '-d',
      '--name',
      postgres,
      '--network',
      network,
      '-e',
      'POSTGRES_USER=moq',
      '-e',
      `POSTGRES_PASSWORD=${password}`,
      '-e',
      'POSTGRES_DB=moq',
      postgresImage,
    ]);
    // Over TCP: the first-start setup server listens on the socket only.
    await waitFor(
      () =>
        must('docker', [
          'exec',
          postgres,
          'pg_isready',
          '-h',
          '127.0.0.1',
          '-U',
          'moq',
          '-d',
          'moq',
        ]),
      120_000,
    );
  });

  afterAll(() => {
    run('docker', ['rm', '-f', app, postgres]);
    run('docker', ['network', 'rm', network]);
  });

  it('Container image serves the UI and health: migrations applied, one process, / and /health', async () => {
    must('docker', [
      'run',
      '-d',
      '--name',
      app,
      '--network',
      network,
      '-e',
      `DATABASE_URL=postgres://moq:${password}@${postgres}:5432/moq`,
      '-p',
      '127.0.0.1::3000',
      image,
    ]);
    const port = Number(/:(\d+)\s*$/m.exec(must('docker', ['port', app, '3000/tcp']))?.[1]);
    expect(port).toBeGreaterThan(0);

    const health = await waitFor(async () => {
      const response = await request({ port, path: '/health' });
      if (response.status !== 200) throw new Error(`/health answered ${response.status}`);
      return response;
    }, 120_000).catch((error: unknown) => {
      throw new Error(`${String(error)}\n${run('docker', ['logs', app]).stdout}`);
    });
    expect(health.status).toBe(200);

    const page = await request({ port, path: '/' });
    expect(page.status).toBe(200);
    expect(page.headers['content-type']).toContain('text/html');
    expect(page.body).toContain('<div id="root"></div>');

    // Migrations applied at start, and the job queue's schema exists.
    expect(Number(psql('select count(*) from drizzle.__drizzle_migrations'))).toBeGreaterThan(0);
    expect(psql("select to_regclass('public.app_setting') is not null")).toBe('t');
    expect(
      psql("select count(*) from information_schema.schemata where schema_name = 'pgboss'"),
    ).toBe('1');

    // One process runs the web server and the worker.
    const processes = must('docker', ['top', app])
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .filter((line) => line.trim());
    expect(processes).toHaveLength(1);
    expect(processes[0]).toContain('node src/main.ts');
  });

  it('Container without a required secret refuses to start: exits non-zero naming DATABASE_URL', () => {
    const marker = `s3cret${randomBytes(8).toString('hex')}`;
    const result = run(
      'docker',
      [
        'run',
        '--rm',
        '-e',
        `ANTHROPIC_API_KEY=${marker}`,
        '-e',
        `MAILBOX_PASSWORD=${marker}`,
        image,
      ],
      { timeoutMs: 120_000 },
    );

    expect(result.status).not.toBe(0);
    expect(result.status).not.toBeNull();
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain('Missing required setting: DATABASE_URL');
    expect(output).not.toContain(marker);
    expect(output).not.toContain('Server listening');
  });

  it('Image holds no secret values: no settings file and no secret setting in its configuration', () => {
    // Configuration: only non-secret defaults.
    const config = JSON.parse(
      must('docker', ['image', 'inspect', '--format', '{{json .Config}}', image]),
    ) as { Env?: string[]; User?: string };
    const names = (config.Env ?? []).map((entry) => entry.slice(0, entry.indexOf('=')));
    expect(names.filter((name) => /PASSWORD|SECRET|TOKEN|KEY|^DATABASE_URL$/i.test(name))).toEqual(
      [],
    );
    expect(config.User).toBe('node');

    // Build history: no build argument or variable named after a secret.
    const history = must('docker', ['history', '--no-trunc', '--format', '{{.CreatedBy}}', image]);
    expect(history).not.toMatch(/PASSWORD|SECRET|TOKEN|DATABASE_URL|\.env\b/i);

    // Files: no settings file in the app folder, and no local settings folder.
    const found = must('docker', [
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      image,
      '-c',
      "find /app \\( -path /app/node_modules -prune \\) -o \\( -name '.env*' -o -name '*.env' -o -name '.deploy-local' \\) -print; find /app/node_modules -name '.env' -print",
    ]).trim();
    expect(found).toBe('');
  });
});
