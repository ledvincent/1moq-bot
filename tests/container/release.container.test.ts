import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { must, run } from './run.ts';
import { countDifferences, createStack, imageUnderTest, seedRows, type Stack } from './stack.ts';

describe('deploy script', () => {
  const id = randomBytes(4).toString('hex');
  const repository = '1moq-bot-release-test';
  const first = `first-${id}`;
  const second = `second-${id}`;
  const imageId = (reference: string) =>
    must('docker', ['image', 'inspect', '--format', '{{.Id}}', reference]).trim();
  let stack: Stack;

  beforeAll(async () => {
    // Two distinct local releases: the image under test, and the same with one label added.
    must('docker', ['tag', imageUnderTest().image, `${repository}:${first}`]);
    must('docker', ['build', '--quiet', '-t', `${repository}:${second}`, '-'], {
      input: `FROM ${repository}:${first}\nLABEL org.opencontainers.image.version=${second}\n`,
    });
    expect(imageId(`${repository}:${second}`)).not.toBe(imageId(`${repository}:${first}`));

    stack = await createStack();
    stack.setRelease(repository, first);
    await stack.up();
  });

  afterAll(() => {
    stack?.down();
    run('docker', ['image', 'rm', `${repository}:${second}`, `${repository}:${first}`]);
  });

  const runningImage = () => {
    const container = must('docker', [
      'ps',
      '--quiet',
      '--filter',
      `label=com.docker.compose.project=${stack.project}`,
      '--filter',
      'label=com.docker.compose.service=app',
    ]).trim();
    expect(container).not.toBe('');
    return must('docker', ['inspect', '--format', '{{.Image}}', container]).trim();
  };

  it('Redeploy the previous image: the previous image runs, /health 200, rows unchanged', async () => {
    const deployFirst = stack.script('deploy/deploy.sh', [first]);
    expect(deployFirst.status, `${deployFirst.stdout}\n${deployFirst.stderr}`).toBe(0);
    seedRows(stack, 'release', 30);

    const deploySecond = stack.script('deploy/deploy.sh', [second]);
    expect(deploySecond.status, `${deploySecond.stdout}\n${deploySecond.stderr}`).toBe(0);
    expect(runningImage()).toBe(imageId(`${repository}:${second}`));
    const counts = stack.tableCounts();
    expect(counts).toMatch(/^public\.app_setting 30$/m);

    const rollback = stack.script('deploy/deploy.sh', ['--previous']);
    expect(rollback.status, `${rollback.stdout}\n${rollback.stderr}`).toBe(0);

    expect(runningImage()).toBe(imageId(`${repository}:${first}`));
    expect(readFileSync(`${stack.etc}/release.env`, 'utf8')).toMatch(
      new RegExp(`^IMAGE_TAG=${first}$`, 'm'),
    );
    const health = await stack.httpsGetWhenReady('/health');
    expect(health.status).toBe(200);
    const after = stack.tableCounts();
    expect(countDifferences(counts, after)).toEqual([]);
    expect(after).toMatch(/^public\.app_setting 30$/m);

    // Each release is recorded, and a backup was taken before each one.
    const log = readFileSync(`${stack.state}/releases.log`, 'utf8').trim().split(/\r?\n/);
    expect(log.map((line) => line.split(' ').slice(1).join(' '))).toEqual([
      `${first} ok`,
      `${second} ok`,
      `${first} ok`,
    ]);
    expect(readdirSync(stack.backups).filter((file) => file.endsWith('.dump.age'))).toHaveLength(3);
  });
});
