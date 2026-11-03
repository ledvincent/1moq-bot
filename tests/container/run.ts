// Small helpers for the container tests: run a command, wait, make HTTP(S) requests.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

// Git Bash on Windows (the scripts are bash), plain bash elsewhere.
const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
export const bash = process.platform === 'win32' && existsSync(gitBash) ? gitBash : 'bash';

// A path both Windows programs and Git Bash read the same way (forward slashes).
export const portablePath = (file: string) => file.replace(/\\/g, '/');

export interface Result {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  env?: NodeJS.ProcessEnv;
  input?: string | Buffer;
  timeoutMs?: number;
}

export function run(command: string, args: string[], options: RunOptions = {}): Result {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    input: options.input,
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 600_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// Same as run(), with the output kept as bytes (dumps, encrypted files).
export function runBinary(
  command: string,
  args: string[],
  options: RunOptions = {},
): { status: number | null; stdout: Buffer; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: options.env ?? process.env,
    input: options.input,
    timeout: options.timeoutMs ?? 600_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr.toString() };
}

// Runs a command that must succeed, and returns its standard output.
export function must(command: string, args: string[], options: RunOptions = {}): string {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries `check` until it returns a value without throwing, or rethrows its last error.
export async function waitFor<T>(
  check: () => T | Promise<T>,
  timeoutMs: number,
  intervalMs = 1_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await sleep(intervalMs);
    }
  }
}

// A TCP port free on this machine right now.
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() =>
        typeof address === 'object' && address
          ? resolve(address.port)
          : reject(new Error('no port')),
      );
    });
  });
}

export interface Response {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

export interface RequestOptions {
  port: number;
  path: string;
  // The name asked for (Host header and TLS server name); the connection goes to 127.0.0.1.
  host?: string;
  // HTTPS when given: the only certificate authority trusted.
  ca?: string;
}

export function request(options: RequestOptions): Promise<Response> {
  const host = options.host ?? 'localhost';
  return new Promise((resolve, reject) => {
    const common = {
      host: '127.0.0.1',
      port: options.port,
      path: options.path,
      method: 'GET',
      headers: { host },
      timeout: 10_000,
    };
    const onResponse = (response: http.IncomingMessage) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => (body += chunk));
      response.on('end', () =>
        resolve({ status: response.statusCode ?? 0, headers: response.headers, body }),
      );
    };
    const req = options.ca
      ? https.request({ ...common, servername: host, ca: options.ca, agent: false }, onResponse)
      : http.request({ ...common, agent: false }, onResponse);
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
    req.end();
  });
}
