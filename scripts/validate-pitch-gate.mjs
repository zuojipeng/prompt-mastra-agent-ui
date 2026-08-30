import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const gateDir = path.join(root, 'docs/creative-validation/films/film-01/blind-review');
const ballotDir = path.join(gateDir, 'ballots');
const dimensions = ['hook', 'clarity', 'causality', 'originality', 'visualFeasibility', 'payoffPotential'];
const pitchIds = Array.from({ length: 9 }, (_, index) => `P${String(index + 1).padStart(2, '0')}`);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseBlindPitchContent(source) {
  const internalHeadings = ['\n## 评审提醒', '\n## 合规与隔离声明', '\n## 交接状态'];
  const boundaries = internalHeadings
    .map((heading) => source.indexOf(heading))
    .filter((index) => index >= 0);
  const reviewBoundary = boundaries.length > 0 ? Math.min(...boundaries) : -1;
  const content = reviewBoundary >= 0 ? source.slice(0, reviewBoundary) : source;
  const headings = [...content.matchAll(/^## (P\d{2})[^\n]*/gm)];
  const sections = [];

  for (const [index, match] of headings.entries()) {
    const end = headings[index + 1]?.index ?? content.length;
    sections.push(content
      .slice(match.index, end)
      .trim()
      .replace(/A\s*组一句话原始创意/g, '一句话创意'));
  }

  assert(sections.length === 9, `Expected 9 blind pitch sections, found ${sections.length}`);
  return sections.join('\n\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = JSON.parse(await readFile(path.join(gateDir, 'manifest.json'), 'utf8'));
const panel = JSON.parse(await readFile(path.join(gateDir, 'panel.json'), 'utf8'));

assert(manifest.packetVersion === 2, 'Only V2 pitch packets are valid');
assert(manifest.filmId === 'film-01' && manifest.gate === 'pitch-selection', 'Manifest is for the wrong film or gate');
assert(panel.reviewers?.length === 5, 'Panel must contain exactly 5 reviewer slots');
assert(panel.reviewers.filter((reviewer) => reviewer.role === 'target-audience').length === 3, 'Panel needs 3 target-audience reviewers');
assert(panel.reviewers.filter((reviewer) => reviewer.role === 'owner').length === 1, 'Panel needs 1 owner reviewer');
assert(panel.reviewers.filter((reviewer) => reviewer.role === 'film-practitioner').length === 1, 'Panel needs 1 film practitioner');
assert(Object.keys(manifest.packets).sort().join(',') === 'H1,H2,H3,H4,H5', 'Manifest must contain H1-H5 packets');

const sourceContents = new Map();
for (const source of Object.values(manifest.sources)) {
  const content = await readFile(path.join(root, source.path), 'utf8');
  assert(sha256(content) === source.sha256, `${source.path} changed after packet lock`);
  sourceContents.set(source.path, content);
}

const pitchSourcePath = manifest.sources.pitches?.path;
assert(pitchSourcePath, 'Manifest must identify the pitch source');
assert(
  sha256(parseBlindPitchContent(sourceContents.get(pitchSourcePath))) === manifest.blindContentSha256,
  'Blind content hash no longer matches the locked pitch source'
);

for (const [reviewerId, packet] of Object.entries(manifest.packets)) {
  const content = await readFile(path.join(root, packet.path), 'utf8');
  assert(sha256(content) === packet.sha256, `${reviewerId} packet hash mismatch`);
  assert(!/A\s*组一句话/.test(content), `${reviewerId} packet leaks experiment group metadata`);
  assert(!content.includes('来源结构'), `${reviewerId} packet leaks production provenance`);
}

let ballotFiles = [];
try {
  ballotFiles = (await readdir(ballotDir)).filter((file) => file.endsWith('.json')).sort();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (ballotFiles.length !== 5) {
  console.error(JSON.stringify({ status: 'HUMAN_GATE_PENDING', validBallots: ballotFiles.length, required: 5 }));
  process.exitCode = 2;
} else {
  assert(panel.status === 'locked', 'Panel must be locked before aggregation');
  const ballots = await Promise.all(
    ballotFiles.map(async (file) => JSON.parse(await readFile(path.join(ballotDir, file), 'utf8')))
  );
  const reviewerIds = new Set();

  for (const ballot of ballots) {
    const reviewer = panel.reviewers.find((entry) => entry.reviewerId === ballot.reviewerId);
    assert(reviewer, `Unknown reviewer ${ballot.reviewerId}`);
    assert(!reviewerIds.has(ballot.reviewerId), `Duplicate reviewer ${ballot.reviewerId}`);
    reviewerIds.add(ballot.reviewerId);
    assert(reviewer.eligibilityStatus === 'eligible', `${ballot.reviewerId} is not marked eligible`);
    assert(ballot.locked === true && ballot.conflictFree === true && ballot.independenceConfirmed === true, `${ballot.reviewerId} ballot is not independently locked`);
    assert(ballot.packetId === manifest.packets[ballot.reviewerId].packetId, `${ballot.reviewerId} packet ID mismatch`);
    assert(ballot.packetSha256 === manifest.packets[ballot.reviewerId].sha256, `${ballot.reviewerId} packet hash mismatch`);

    for (const pitchId of pitchIds) {
      const score = ballot.scores?.[pitchId];
      assert(score, `${ballot.reviewerId} missing ${pitchId}`);
      for (const dimension of dimensions) {
        assert(Number.isInteger(score[dimension]) && score[dimension] >= 1 && score[dimension] <= 5, `${ballot.reviewerId} ${pitchId} ${dimension} must be integer 1-5`);
      }
      assert(Number.isInteger(score.severeFeasibilityRisks) && score.severeFeasibilityRisks >= 0, `${ballot.reviewerId} ${pitchId} severeFeasibilityRisks must be a non-negative integer`);
    }
  }

  const results = pitchIds.map((pitchId) => {
    const dimensionMeans = Object.fromEntries(dimensions.map((dimension) => [
      dimension,
      ballots.reduce((sum, ballot) => sum + ballot.scores[pitchId][dimension], 0) / 5
    ]));
    const overallMean = dimensions.reduce((sum, dimension) => sum + dimensionMeans[dimension], 0) / dimensions.length;
    const lowestDimensionMean = Math.min(...Object.values(dimensionMeans));
    const severeFeasibilityRisks = ballots.reduce((sum, ballot) => sum + ballot.scores[pitchId].severeFeasibilityRisks, 0);
    return { pitchId, dimensionMeans, overallMean, lowestDimensionMean, severeFeasibilityRisks };
  }).sort((a, b) => b.overallMean - a.overallMean || b.lowestDimensionMean - a.lowestDimensionMean || a.severeFeasibilityRisks - b.severeFeasibilityRisks);

  const first = results[0];
  const second = results[1];
  const unresolvedTie = first.overallMean === second.overallMean &&
    first.lowestDimensionMean === second.lowestDimensionMean &&
    first.severeFeasibilityRisks === second.severeFeasibilityRisks;

  console.log(JSON.stringify({
    status: unresolvedTie ? 'REVOTE_REQUIRED' : 'SELECTION_READY',
    winner: unresolvedTie ? null : first.pitchId,
    results
  }, null, 2));
  if (unresolvedTie) process.exitCode = 3;
}
