import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const outDir = join(root, 'out');
const html = await readFile(join(outDir, 'index.html'), 'utf8');

const requiredHtml = [
  'AI 视频分镜 Prompt 工作台',
  '高级导演模式',
  '历史工作台',
  '生成视频 Prompt 套件',
];

for (const text of requiredHtml) {
  if (!html.includes(text)) {
    throw new Error(`Missing expected HTML text: ${text}`);
  }
}

const appChunkDir = join(outDir, '_next/static/chunks/app');
const chunkFiles = await readdir(appChunkDir);
const pageChunk = chunkFiles.find((file) => file.startsWith('page-') && file.endsWith('.js'));

if (!pageChunk) {
  throw new Error('Missing app page chunk');
}

const pageJs = await readFile(join(appChunkDir, pageChunk), 'utf8');

const requiredJs = [
  '历史工作台',
  '高级导演模式',
  '导演连续性',
  '继续优化',
  '优化此镜头',
  'prompt-optimizer.hahazuo460.workers.dev/api/optimize',
];

for (const text of requiredJs) {
  if (!pageJs.includes(text)) {
    throw new Error(`Missing expected JS text: ${text}`);
  }
}

if (pageJs.includes('localhost:8787')) {
  throw new Error('Build output still points to localhost:8787');
}

console.log('Smoke test passed');
