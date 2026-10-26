import { spawnSync } from 'node:child_process';
import { bash } from './run.ts';

// Container tests: they need the built image (IMAGE), Docker with the Compose plugin, bash
// (Git Bash on Windows) and age. Anything missing fails the run with a clear message, never a skip.
export default function setup(): void {
  const problems: string[] = [];
  const image = process.env.IMAGE;
  if (!image) {
    problems.push(
      'IMAGE is not set: build the image (docker build -f deploy/Dockerfile -t 1moq-bot:local .) and run the tests with IMAGE=1moq-bot:local pnpm test:container',
    );
  }

  const works = (command: string, args: string[]) => {
    const result = spawnSync(command, args, { encoding: 'utf8', timeout: 60_000 });
    return !result.error && result.status === 0;
  };
  const tools: [string, string, string[], string][] = [
    ['Docker', 'docker', ['version'], 'install Docker and start it'],
    ['Docker Compose', 'docker', ['compose', 'version'], 'install the Docker Compose plugin'],
    ['bash', bash, ['--version'], 'install Git for Windows (Git Bash) or bash'],
    ['age', 'age', ['--version'], 'install age, for example winget install FiloSottile.age'],
    ['age-keygen', 'age-keygen', ['--version'], 'install age (it brings age-keygen)'],
  ];
  for (const [name, command, args, fix] of tools) {
    if (!works(command, args)) problems.push(`${name} is not available: ${fix}`);
  }
  if (image && problems.length === 0 && !works('docker', ['image', 'inspect', image])) {
    problems.push(
      `The image ${image} is not built: docker build -f deploy/Dockerfile -t ${image} .`,
    );
  }

  if (problems.length > 0) {
    const message = `Container tests cannot run:\n- ${problems.join('\n- ')}`;
    // Printed here as well: Vitest's report of a global setup error can lose the message.
    console.error(`\n${message}\n`);
    throw new Error(message);
  }
}
