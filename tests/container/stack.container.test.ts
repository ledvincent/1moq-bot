import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request, waitFor } from './run.ts';
import { createStack, type Stack } from './stack.ts';

interface Publisher {
  TargetPort: number;
  PublishedPort: number;
  Protocol: string;
}

interface ComposeService {
  Service: string;
  Publishers?: Publisher[] | null;
}

// `docker compose ps --format json` prints one object per line (or one array, in older versions).
function parsePs(output: string): ComposeService[] {
  const text = output.trim();
  if (text.startsWith('[')) return JSON.parse(text) as ComposeService[];
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as ComposeService);
}

describe('production stack', () => {
  let stack: Stack;

  beforeAll(async () => {
    stack = await createStack();
    await stack.up();
  });

  afterAll(() => {
    stack?.down();
  });

  it('Proxy redirects to HTTPS with a local certificate: HTTP redirects, HTTPS reaches /health', async () => {
    const plain = await waitFor(async () => {
      const response = await request({ port: stack.httpPort, path: '/health' });
      if (response.status < 300 || response.status >= 400) {
        throw new Error(`plain HTTP answered ${response.status}`);
      }
      return response;
    }, 60_000);
    expect([301, 308]).toContain(plain.status);
    expect(plain.headers.location).toBe('https://localhost/health');

    const secure = await stack.httpsGet('/health');
    expect(secure.status).toBe(200);
  });

  it('Only the proxy publishes ports: caddy publishes 80 and 443, postgres and app none', () => {
    const result = stack.compose(['ps', '--all', '--format', 'json']);
    expect(result.status).toBe(0);
    const services = parsePs(result.stdout);
    expect(services.map((service) => service.Service).sort()).toEqual(['app', 'caddy', 'postgres']);

    const published = (name: string) =>
      (services.find((service) => service.Service === name)?.Publishers ?? []).filter(
        (publisher) => publisher.PublishedPort > 0,
      );
    expect(published('app')).toEqual([]);
    expect(published('postgres')).toEqual([]);

    const caddy = published('caddy');
    expect(
      [...new Set(caddy.map((publisher) => publisher.TargetPort))].sort((a, b) => a - b),
    ).toEqual([80, 443]);
    expect(new Set(caddy.map((publisher) => publisher.Protocol))).toEqual(new Set(['tcp']));
    expect(
      [...new Set(caddy.map((publisher) => publisher.PublishedPort))].sort((a, b) => a - b),
    ).toEqual([stack.httpPort, stack.httpsPort].sort((a, b) => a - b));
  });
});
