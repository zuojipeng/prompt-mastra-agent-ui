import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const sourceDir = path.resolve('out');
const targetDir = path.resolve('output/hackathon-public-demo-static');
const forbiddenPath = /(?:^|\/)(?:functions?|\.env(?:\.|$))/i;
const forbiddenContent = /B2_APP_KEY|B2_KEY_ID|RUNWAYML_API_SECRET|CF_ACCESS_TEAM_DOMAIN|CF_ACCESS_AUD/;

async function filesBelow(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(absolute));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error(`Unsupported staging entry: ${absolute}`);
  }
  return files;
}

async function main() {
  await readFile(path.join(sourceDir, 'index.html'));
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter: (source) => path.basename(source) !== '_routes.json',
  });

  await writeFile(path.join(targetDir, 'public-demo-package.json'), `${JSON.stringify({
    schema_version: 'jingci.public-demo-package.v1',
    mode: 'fixture',
    functions: 0,
    cloud_writes: false,
    external_api_calls: false,
  }, null, 2)}\n`);

  const files = await filesBelow(targetDir);
  if (files.length === 0) throw new Error('Public demo staging package is empty');
  for (const file of files) {
    const relative = path.relative(targetDir, file);
    if (forbiddenPath.test(relative)) throw new Error(`Forbidden public demo path: ${relative}`);
    const body = await readFile(file);
    if (forbiddenContent.test(body.toString('utf8'))) {
      throw new Error(`Forbidden binding name in public demo file: ${relative}`);
    }
  }
  const hasBanner = await Promise.all(files.map(async (file) => (
    (await readFile(file)).includes(Buffer.from('Public judge demo'))
  )));
  if (!hasBanner.some(Boolean)) throw new Error('Public demo status banner is missing from the static package');

  console.log(`Public demo package ready: ${path.relative(process.cwd(), targetDir)} (${files.length} files)`);
  console.log('functions=0 routes_file=0 secrets=0');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
