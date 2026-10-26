import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

const compose = read('deploy/compose.yml');
const caddyfile = read('deploy/Caddyfile');
const gitignore = read('.gitignore');
const dockerignore = read('.dockerignore');

// The placeholder address of the templates: `.example` is reserved and never resolves.
const placeholderDomain = 'app.1moq.example';

// The block of one service in compose.yml: its lines up to the next service or top-level key.
function service(name: string): string {
  const lines = compose.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `  ${name}:`);
  expect(start, `service ${name} in deploy/compose.yml`).toBeGreaterThan(-1);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {0,2}\S/.test(line));
  return rest.slice(0, end === -1 ? undefined : end).join('\n');
}

// The service names: the two-space keys of the top-level `services:` section.
const services = (/^services:\s*\n([\s\S]*?)(?=^\S)/m.exec(compose)?.[1] ?? '')
  .split(/\r?\n/)
  .flatMap((line) => /^ {2}([a-z][\w-]*):\s*$/.exec(line)?.[1] ?? []);

// Every `KEY=value` line of a settings template.
function settings(file: string): Map<string, string> {
  return new Map(
    read(file)
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as [string, string];
      }),
  );
}

const templates = [
  'deploy/app.env.example',
  'deploy/backup.env.example',
  'deploy/release.env.example',
];

// Files under deploy/, recursively.
function deployFiles(dir = 'deploy'): string[] {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const file = `${dir}/${name}`;
    return statSync(path.join(root, file)).isDirectory() ? deployFiles(file) : [file];
  });
}

// Ignore patterns of a .gitignore-style file, comments and blanks dropped.
const patterns = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

describe('deploy/compose.yml', () => {
  it('Production deploy keeps dry-run on: DRY_RUN is "true" in the app environment', () => {
    const app = service('app');
    const environment = /^ {4}environment:\s*\n((?: {6}.*\n?|\s*#.*\n?)+)/m.exec(app)?.[1];
    expect(environment).toBeDefined();
    expect(environment).toMatch(/^ {6}DRY_RUN: ['"]true['"]\s*$/m);
    // Written in the file, never taken from the settings files.
    expect(compose).not.toMatch(/DRY_RUN:\s*\$\{/);
    expect(compose.match(/DRY_RUN/g)).toHaveLength(1);
  });

  it('Only the proxy publishes ports: no ports on postgres or app, only 80 and 443 on caddy', () => {
    expect(services).toEqual(['app', 'postgres', 'caddy']);
    for (const name of services.filter((name) => name !== 'caddy')) {
      expect(service(name), `${name} publishes no port`).not.toMatch(/^\s+(ports|expose):/m);
    }
    const ports = [...service('caddy').matchAll(/^\s+- ['"]?([^'"\n]+)['"]?\s*$/gm)]
      .map((match) => match[1]!)
      .filter((entry) => /:\d+$/.test(entry));
    expect(ports).toEqual(['${HTTP_PORT:-80}:80', '${HTTPS_PORT:-443}:443']);
  });

  it('Settings files stay outside the repository: the app reads its settings from MOQ_ETC', () => {
    expect(service('app')).toMatch(/^ {4}env_file: \$\{MOQ_ETC:-\/etc\/1moq\}\/app\.env\s*$/m);
    expect(read('deploy/lib.sh')).toContain('--env-file "$MOQ_ETC/app.env"');
    expect(read('deploy/lib.sh')).toContain('--env-file "$MOQ_ETC/release.env"');
    expect(read('deploy/lib.sh')).toContain('MOQ_ETC="${MOQ_ETC:-/etc/1moq}"');
  });
});

describe('settings files and templates', () => {
  it('Settings files stay outside the repository: git and the image build ignore them', () => {
    const git = patterns(gitignore);
    expect(git).toEqual(
      expect.arrayContaining([
        '.env',
        '.env.*',
        '.deploy-local/',
        'deploy/*.env',
        '!deploy/*.env.example',
      ]),
    );
    const docker = patterns(dockerignore);
    expect(docker).toEqual(
      expect.arrayContaining(['.env', '.env.*', '**/*.env', '!**/*.env.example', '.deploy-local']),
    );
    // No settings file sits in deploy/: only the templates.
    expect(deployFiles().filter((file) => /\.env$/.test(file))).toEqual([]);
  });

  it('Settings files stay outside the repository: the templates hold placeholders only', () => {
    const allowed = new Set([
      'change-me',
      placeholderDomain,
      `change-me@${placeholderDomain}`,
      '1moq-bot',
    ]);
    for (const file of templates) {
      const values = settings(file);
      expect(values.size, `${file} has settings`).toBeGreaterThan(0);
      for (const [key, value] of values) {
        expect(allowed.has(value), `${file}: ${key} holds a placeholder`).toBe(true);
      }
    }
    expect(settings('deploy/app.env.example').get('POSTGRES_PASSWORD')).toBe('change-me');
    expect(settings('deploy/backup.env.example').get('BACKUP_RECIPIENT')).toBe('change-me');
  });
});

describe('the public address', () => {
  it('Public address comes from a setting: the Caddy site is {$APP_DOMAIN}', () => {
    const sites = caddyfile
      .split(/\r?\n/)
      .filter((line) => /^(?:[^\s#].*\s)?\{\s*$/.test(line))
      .map((line) => line.replace(/\{\s*$/, '').trim());
    // The global options block, then one site.
    expect(sites).toEqual(['', '{$APP_DOMAIN}']);
    expect(service('app')).toMatch(/PUBLIC_URL: https:\/\/\$\{APP_DOMAIN:\?[^}]*\}/);
    expect(service('caddy')).toMatch(/APP_DOMAIN: \$\{APP_DOMAIN:\?[^}]*\}/);
    expect(settings('deploy/app.env.example').get('APP_DOMAIN')).toBe(placeholderDomain);
  });

  it('Public address comes from a setting: no domain is written in the code or under deploy/', () => {
    // A host name with a public top-level domain, or the placeholder outside the templates.
    const domain = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|app|vn|fr|de|eu|example)\b/gi;
    const allowed = new Set<string>();
    for (const file of deployFiles()) {
      if (templates.includes(file)) continue;
      const found = (read(file).match(domain) ?? []).filter((name) => !allowed.has(name));
      expect(found, `${file} names no domain`).toEqual([]);
      expect(read(file), `${file} holds no placeholder address`).not.toContain(placeholderDomain);
    }
    for (const file of [...sourceFiles('src'), ...sourceFiles('web')]) {
      expect(read(file), `${file} holds no address`).not.toContain(placeholderDomain);
      expect(read(file), `${file} holds no address`).not.toMatch(
        /https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i,
      );
    }
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir)).flatMap((name) => {
    const file = `${dir}/${name}`;
    if (statSync(path.join(root, file)).isDirectory()) return sourceFiles(file);
    return /\.test\.ts$/.test(name) || !/\.tsx?$/.test(name) ? [] : [file];
  });
}
