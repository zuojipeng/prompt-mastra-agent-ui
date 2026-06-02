import { spawn } from 'node:child_process';

const steps = [
  {
    name: 'Build static export',
    command: 'npm',
    args: ['run', 'build'],
  },
  {
    name: 'TypeScript check',
    command: 'npx',
    args: ['tsc', '--noEmit'],
  },
  {
    name: 'ESLint check',
    command: 'npm',
    args: ['run', 'lint'],
  },
  {
    name: 'V2 QA gate',
    command: 'npm',
    args: ['run', 'qa:v2'],
  },
];

function runStep(step) {
  return new Promise((resolve) => {
    console.log('');
    console.log(`==> ${step.name}`);
    console.log(`$ ${step.command} ${step.args.join(' ')}`);

    const child = spawn(step.command, step.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

async function main() {
  console.log('V2 release gate');
  console.log(`Time: ${new Date().toISOString()}`);

  for (const step of steps) {
    const code = await runStep(step);
    if (code !== 0) {
      console.error('');
      console.error(`Release gate failed at: ${step.name}`);
      process.exit(code);
    }
  }

  console.log('');
  console.log('Release gate passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
