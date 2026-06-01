import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const outDir = join(root, 'out');

// ── Stage 1: HTML smoke (static prerender) ──
console.log('■ Stage 1: Static HTML content');
const html = await readFile(join(outDir, 'index.html'), 'utf8');

const requiredHtml = [
  '镜词',
  '时长',
  '历史记录',
];

for (const text of requiredHtml) {
  if (!html.includes(text)) {
    throw new Error(`[FAIL] Missing expected HTML: "${text}"`);
  }
}
console.log('  ✓ All required HTML strings found');

// ── Stage 2: JS bundle smoke (client-rendered features) ──
console.log('■ Stage 2: JS bundle feature check');
const appChunkDir = join(outDir, '_next/static/chunks/app');
const chunkFiles = await readdir(appChunkDir);
const pageChunk = chunkFiles.find((file) => file.startsWith('page-') && file.endsWith('.js'));

if (!pageChunk) {
  throw new Error('[FAIL] Missing app page chunk');
}

const pageJs = await readFile(join(appChunkDir, pageChunk), 'utf8');

const requiredJs = [
  '创意体检',           // P0: V2 creative diagnosis
  '导演执行包',          // P0: V2 director kit result
  '可拍性',              // P0: feasibility score
  '风险补救',            // P0: risk remediation
  '正在生成导演执行包',    // Slice 2: visible loading state
  '重试生成',             // Slice 2: recoverable error action
  '执行包内容不完整',      // Slice 2: incomplete result fallback
  'Seedance',            // P1: Seedance platform
  'api/optimize',        // API endpoint
];

for (const text of requiredJs) {
  if (!pageJs.includes(text)) {
    throw new Error(`[FAIL] Missing expected JS text: "${text}"`);
  }
}
console.log('  ✓ All required JS feature strings found');

// ── Stage 3: Bundle size sanity ──
console.log('■ Stage 3: Bundle size check');
if (pageJs.length < 5000) {
  throw new Error(`[FAIL] Page chunk too small: ${pageJs.length} bytes`);
}
if (pageJs.length > 500_000) {
  throw new Error(`[FAIL] Page chunk too large: ${pageJs.length} bytes`);
}
console.log(`  ✓ Size: ${(pageJs.length / 1024).toFixed(1)} KB`);

console.log('\n✅ Full smoke test passed');
