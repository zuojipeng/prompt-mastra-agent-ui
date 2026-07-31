import { spawnSync } from 'node:child_process';
import path from 'node:path';

const major = Number.parseInt(process.versions.node.split('.')[0], 10);
if (major < 20) {
  console.error('Public demo build requires Node 20 or newer');
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run public demo build through npm so npm_execpath is available');
  process.exit(1);
}

function runNode(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runNode([npmCli, 'run', 'build'], {
  ...process.env,
  NEXT_PUBLIC_DEMO_MODE: 'fixture',
  NEXT_PUBLIC_API_URL: 'https://public-demo-network.invalid/api/optimize',
  NEXT_PUBLIC_PROVENANCE_API_URL: '/api/provenance',
});
runNode([path.resolve('scripts/package-hackathon-public-demo.mjs')]);
