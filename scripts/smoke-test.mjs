import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const outDir = join(root, 'out');

// ── Stage 1: HTML smoke (static prerender) ──
console.log('■ Stage 1: Static HTML content');
const html = await readFile(join(outDir, 'index.html'), 'utf8');

const requiredHtml = [
  'Seedance 视频创作搭档',
  '导演模式',
  '多镜头连续叙事',
  '输入你的视频创意',
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
  '优化此镜头',        // P0: Refinement UI
  '高级导演',          // P1: Project Bible (高级导演模式)
  '导出到',             // P1: Platform export dropdown
  '小云雀',             // P1: XYQ platform export
  'Seedance',           // P1: Seedance platform
  'Kling',              // P1: Kling platform
  'Runway',             // P1: Runway platform
  'Pika',               // P1: Pika platform
  'Sora',               // P1: Sora platform
  '生成中',             // UX: Skeleton loading (heading text)
  '重试',               // UX: Retry button
  '请输入视频创意',     // UX: Input validation
  'prompt-optimizer.hahazuo460.workers.dev/api/optimize', // API endpoint
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

// ── Stage 4: No localhost leak ──
console.log('■ Stage 4: No development leak');
if (pageJs.includes('localhost:8787')) {
  throw new Error('[FAIL] Build output still points to localhost:8787');
}
console.log('  ✓ No localhost references');

console.log('\n✅ Full smoke test passed');
