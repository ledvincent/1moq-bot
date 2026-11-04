// The production stack (deploy/compose.yml) started the way the scripts start it, through
// deploy/lib.sh, with throw-away settings folders, a random PostgreSQL password, APP_DOMAIN=localhost,
// free random HTTP and HTTPS ports, a unique project name and a throw-away age key pair.
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bash, freePort, must, portablePath, request, run, waitFor, type Result } from './run.ts';

// The image under test, as given by IMAGE (checked in global-setup.ts).
export function imageUnderTest(): { image: string; repository: string; tag: string } {
  const image = process.env.IMAGE ?? '';
  const slash = image.lastIndexOf('/');
  const colon = image.lastIndexOf(':');
  return colon > slash
    ? { image, repository: image.slice(0, colon), tag: image.slice(colon + 1) }
    : { image, repository: image, tag: 'latest' };
}

// Settings the stack takes from its files only: never inherited from the test environment.
const stackSettings = [
  'POSTGRES_PASSWORD',
  'APP_DOMAIN',
  'ACME_EMAIL',
  'APP_IMAGE',
  'IMAGE_TAG',
  'DRY_RUN',
  'DATABASE_URL',
  'BACKUP_RECIPIENT',
];

export interface Stack {
  project: string;
  etc: string;
  backups: string;
  state: string;
  // The backup private key file: outside the settings and backup folders, as on a real setup.
  identity: string;
  recipient: string;
  httpPort: number;
  httpsPort: number;
  env: NodeJS.ProcessEnv;
  // `moq_compose <args>` from deploy/lib.sh.
  compose(args: string[], input?: string | Buffer): Result;
  // A deploy script run with bash, e.g. script('deploy/backup/backup.sh').
  script(file: string, args?: string[]): Result;
  setRelease(repository: string, tag: string): void;
  up(): Promise<void>;
  sql(query: string): string;
  tableCounts(): string;
  // GET over HTTPS through the proxy, trusting only Caddy's local root certificate.
  httpsGet(pathname: string): Promise<{ status: number; body: string }>;
  // The same, retried until the proxy answers 200 (Caddy issues its certificate after start).
  httpsGetWhenReady(pathname: string): Promise<{ status: number; body: string }>;
  caddyRoot(): string;
  down(): void;
}

export async function createStack(): Promise<Stack> {
  const project = `moqtest${randomBytes(4).toString('hex')}`;
  const root = mkdtempSync(path.join(tmpdir(), `${project}-`));
  const folder = (name: string) => {
    const dir = path.join(root, name);
    mkdirSync(dir, { recursive: true });
    return portablePath(dir);
  };
  const etc = folder('etc');
  const backups = folder('backups');
  const state = folder('state');
  const keys = folder('keys');
  const httpPort = await freePort();
  let httpsPort = await freePort();
  while (httpsPort === httpPort) httpsPort = await freePort();

  const identity = `${keys}/backup.key`;
  must('age-keygen', ['-o', identity]);
  const recipient = must('age-keygen', ['-y', identity]).trim();

  writeFileSync(
    `${etc}/app.env`,
    [
      `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`,
      'APP_DOMAIN=localhost',
      'ACME_EMAIL=moq-test@localhost',
      '',
    ].join('\n'),
  );
  writeFileSync(`${etc}/backup.env`, `BACKUP_RECIPIENT=${recipient}\n`);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    MOQ_ETC: etc,
    MOQ_BACKUP_DIR: backups,
    MOQ_STATE: state,
    COMPOSE_PROJECT_NAME: project,
    HTTP_PORT: String(httpPort),
    HTTPS_PORT: String(httpsPort),
  };
  for (const name of stackSettings) delete env[name];

  const compose = (args: string[], input?: string | Buffer) =>
    run(bash, ['-c', 'source deploy/lib.sh && moq_compose "$@"', 'moq_compose', ...args], {
      env,
      input,
    });
  const mustCompose = (args: string[], input?: string) => {
    const result = compose(args, input);
    if (result.status !== 0) {
      throw new Error(`moq_compose ${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
    }
    return result.stdout;
  };

  const stack: Stack = {
    project,
    etc,
    backups,
    state,
    identity,
    recipient,
    httpPort,
    httpsPort,
    env,
    compose,
    script: (file, args = []) => run(bash, [file, ...args], { env }),
    setRelease(repository, tag) {
      writeFileSync(`${etc}/release.env`, `APP_IMAGE=${repository}\nIMAGE_TAG=${tag}\n`);
    },
    async up() {
      mustCompose(['up', '-d']);
      const healthy = run(
        bash,
        ['-c', 'source deploy/lib.sh && moq_wait_healthy app 180', 'moq_wait_healthy'],
        { env },
      );
      if (healthy.status !== 0) {
        throw new Error(`the app is not healthy\n${compose(['logs', '--tail', '100']).stdout}`);
      }
      await stack.httpsGetWhenReady('/health');
    },
    httpsGetWhenReady: (pathname) =>
      waitFor(async () => {
        const response = await stack.httpsGet(pathname);
        if (response.status !== 200) throw new Error(`the proxy answered ${response.status}`);
        return response;
      }, 60_000),
    sql: (query) =>
      mustCompose(['exec', '-T', 'postgres', 'psql', '-U', 'moq', '-d', 'moq', '-tAc', query]),
    tableCounts: () =>
      mustCompose(
        [
          'exec',
          '-T',
          'postgres',
          'psql',
          '-U',
          'moq',
          '-d',
          'moq',
          '-tA',
          '-F',
          ' ',
          '-v',
          'ON_ERROR_STOP=1',
        ],
        readFileSync(new URL('../../deploy/backup/table-counts.sql', import.meta.url), 'utf8'),
      ).trim(),
    caddyRoot: () =>
      mustCompose(['exec', '-T', 'caddy', 'cat', '/data/caddy/pki/authorities/local/root.crt']),
    async httpsGet(pathname) {
      const response = await request({ port: httpsPort, path: pathname, ca: stack.caddyRoot() });
      return { status: response.status, body: response.body };
    },
    down() {
      compose(['down', '-v', '--remove-orphans', '--timeout', '5']);
      rmSync(root, { recursive: true, force: true });
    },
  };
  const { repository, tag } = imageUnderTest();
  stack.setRelease(repository, tag);
  return stack;
}

// pg-boss's register of worker processes: each start of the app adds its own row, so a restore
// or a rollback (both restart the app) keeps every earlier row and adds one.
const processRegisters = new Set(['pgboss.instance']);

// Checks that `after` holds the same tables as `before`, each with the same number of rows; a
// process register may only have gained rows. Returns the differences, empty when none.
export function countDifferences(before: string, after: string): string[] {
  const parse = (counts: string) =>
    new Map(
      counts
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => {
          const [table = '', rows = ''] = line.trim().split(' ');
          return [table, Number(rows)] as const;
        }),
    );
  const was = parse(before);
  const now = parse(after);
  const differences: string[] = [];
  for (const table of new Set([...was.keys(), ...now.keys()])) {
    const a = was.get(table);
    const b = now.get(table);
    const same = processRegisters.has(table)
      ? a !== undefined && b !== undefined && b >= a
      : a !== undefined && a === b;
    if (!same) differences.push(`${table}: ${a ?? 'missing'} before, ${b ?? 'missing'} after`);
  }
  return differences;
}

// Rows the tests add, so a dump, a restore and a rollback carry real data.
export function seedRows(stack: Stack, prefix: string, count = 25): void {
  stack.sql(
    `insert into app_setting (key, value) select '${prefix}-' || g, to_jsonb(g) from generate_series(1, ${count}) g`,
  );
}
