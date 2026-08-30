import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'docs/creative-validation/films/film-01/pitches.md');
const filmDir = path.join(root, 'docs/creative-validation/films/film-01');
const outputDir = path.join(filmDir, 'blind-review/packets');
const manifestPath = path.join(filmDir, 'blind-review/manifest.json');
const packetVersion = 2;

const reviewerOrders = {
  H1: ['P04', 'P09', 'P02', 'P07', 'P01', 'P06', 'P03', 'P08', 'P05'],
  H2: ['P07', 'P03', 'P08', 'P01', 'P05', 'P09', 'P04', 'P02', 'P06'],
  H3: ['P02', 'P06', 'P04', 'P08', 'P09', 'P03', 'P05', 'P01', 'P07'],
  H4: ['P09', 'P05', 'P01', 'P03', 'P07', 'P02', 'P08', 'P06', 'P04'],
  H5: ['P05', 'P08', 'P06', 'P04', 'P03', 'P07', 'P02', 'P09', 'P01']
};

function parsePitchSections(source) {
  const internalHeadings = ['\n## 评审提醒', '\n## 合规与隔离声明', '\n## 交接状态'];
  const boundaries = internalHeadings
    .map((heading) => source.indexOf(heading))
    .filter((index) => index >= 0);
  const reviewBoundary = boundaries.length > 0 ? Math.min(...boundaries) : -1;
  const content = reviewBoundary >= 0 ? source.slice(0, reviewBoundary) : source;
  const headings = [...content.matchAll(/^## (P\d{2})[^\n]*/gm)];
  const sections = new Map();

  for (const [index, match] of headings.entries()) {
    const start = match.index;
    const end = headings[index + 1]?.index ?? content.length;
    const blindSection = content
      .slice(start, end)
      .trim()
      .replace(/A\s*组一句话原始创意/g, '一句话创意');
    sections.set(match[1], blindSection);
  }

  if (sections.size !== 9) {
    throw new Error(`Expected 9 pitch sections, found ${sections.size}`);
  }

  return sections;
}

const source = await readFile(sourcePath, 'utf8');
const sections = parsePitchSections(source);
const pitchIds = [...sections.keys()].sort();

for (const [reviewerId, order] of Object.entries(reviewerOrders)) {
  const uniqueOrder = [...new Set(order)].sort();
  if (order.length !== 9 || uniqueOrder.join(',') !== pitchIds.join(',')) {
    throw new Error(`${reviewerId} order must contain every pitch exactly once`);
  }
}

const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const contentHash = sha256([...sections.values()].join('\n\n'));
const brief = await readFile(path.join(filmDir, 'creative-brief.md'), 'utf8');
const ballotTemplate = await readFile(
  path.join(root, 'docs/creative-validation/templates/pitch-ballot.md'),
  'utf8'
);
const manifest = {
  schemaVersion: 1,
  filmId: 'film-01',
  gate: 'pitch-selection',
  packetVersion,
  generator: 'scripts/build-pitch-review-packets.mjs',
  sources: {
    creativeBrief: {
      path: 'docs/creative-validation/films/film-01/creative-brief.md',
      sha256: sha256(brief)
    },
    pitches: {
      path: 'docs/creative-validation/films/film-01/pitches.md',
      sha256: sha256(source)
    },
    ballotTemplate: {
      path: 'docs/creative-validation/templates/pitch-ballot.md',
      sha256: sha256(ballotTemplate)
    }
  },
  blindContentSha256: contentHash,
  packets: {}
};

await mkdir(outputDir, { recursive: true });

for (const [reviewerId, order] of Object.entries(reviewerOrders)) {
  const body = order.map((pitchId) => sections.get(pitchId)).join('\n\n---\n\n');
  const packetId = `F01-PITCH-${reviewerId}-V${packetVersion}`;
  const packet = `# Film 01 匿名提案评审包 · ${reviewerId}\n\n` +
    `盲审包 ID：\`${packetId}\`\n\n` +
    `内容集合 SHA-256：\`${contentHash}\`\n\n` +
    `提案数量：9\n\n` +
    `请严格按照本包顺序独立阅读并填写 \`templates/pitch-ballot.md\`。提交前不得与其他评审讨论，不得搜索提案来源，不得询问作者、模型或创作路径。\n\n---\n\n${body}\n`;

  const packetPath = path.join(outputDir, `${reviewerId}.md`);
  await writeFile(packetPath, packet, 'utf8');
  manifest.packets[reviewerId] = {
    packetId,
    path: `docs/creative-validation/films/film-01/blind-review/packets/${reviewerId}.md`,
    sha256: sha256(packet),
    order
  };
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Built ${Object.keys(reviewerOrders).length} V${packetVersion} blind pitch packets from 9 pitches (${contentHash.slice(0, 12)}...).`);
