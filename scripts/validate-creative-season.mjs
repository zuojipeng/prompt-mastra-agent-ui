import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const seasonPath = path.join(root, 'docs/creative-validation/season.json');

const requiredArtifacts = [
  'docs/creative-validation/README.md',
  'docs/creative-validation/decision-record.md',
  'docs/creative-validation/freeze-admission.md',
  'docs/creative-validation/roles-and-authority.md',
  'docs/creative-validation/six-week-program.md',
  'docs/creative-validation/review-protocol.md',
  'docs/creative-validation/slate/README.md',
  'docs/creative-validation/films/film-01/creative-brief.md',
  'docs/creative-validation/films/film-01/pitches.md',
  'docs/creative-validation/films/film-01/provenance.md',
  'docs/creative-validation/films/film-01/comparison-manifest.json',
  'docs/creative-validation/films/film-01/writer-drafts/writer-a.md',
  'docs/creative-validation/films/film-01/writer-drafts/writer-b.md',
  'docs/creative-validation/films/film-01/writer-drafts/writer-c.md',
  'docs/creative-validation/films/film-01/blind-review/README.md',
  'docs/creative-validation/films/film-01/blind-review/manifest.json',
  'docs/creative-validation/films/film-01/blind-review/panel.json',
  'docs/creative-validation/films/film-01/blind-review/packets/H1.md',
  'docs/creative-validation/films/film-01/blind-review/packets/H2.md',
  'docs/creative-validation/films/film-01/blind-review/packets/H3.md',
  'docs/creative-validation/films/film-01/blind-review/packets/H4.md',
  'docs/creative-validation/films/film-01/blind-review/packets/H5.md',
  'docs/creative-validation/templates/pitch-ballot.md',
  'docs/creative-validation/templates/pitch-ballot-record.example.json',
  'docs/creative-validation/templates/script-scorecard.md',
  'docs/creative-validation/templates/directorkit-fidelity-matrix.md',
  'docs/creative-validation/templates/screening-scorecard.md',
  'docs/creative-validation/templates/failure-attribution.md',
  'docs/creative-validation/films/film-02/research-brief.md',
  'docs/creative-validation/films/film-02/observation-log.md'
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const season = JSON.parse(await readFile(seasonPath, 'utf8'));

assert(season.schemaVersion === 1, 'season schemaVersion must be 1');
assert(season.status === 'active', 'creative validation season must be active');
assert(season.durationWeeks === 6, 'creative validation season must last 6 weeks');
assert(season.developmentFreeze?.active === true, 'development freeze must be active');
assert(season.developmentFreeze?.repeatedBlockerMinimumFilms === 2, 'product blockers require evidence from 2 films');
assert(season.humanPanel?.size === 5, 'human blind panel must contain 5 reviewers');
assert(season.humanPanel?.blindReviewRequired === true, 'human review must be blind');
assert(season.qualityGates?.scriptAverageMinimum === 4, 'script average threshold must be 4');
assert(season.qualityGates?.scriptDimensionMinimum === 3.5, 'script dimension threshold must be 3.5');
assert(season.qualityGates?.criticalBeatTraceabilityPercent === 100, 'critical beat traceability must be 100%');
assert(season.qualityGates?.criticalOmissionsMaximum === 0, 'critical omissions must be zero');
assert(season.qualityGates?.unsupportedCriticalAdditionsMaximum === 0, 'unsupported critical additions must be zero');
assert(season.qualityGates?.comprehensionMinimumReviewers === 4, 'at least 4 reviewers must comprehend the film');
assert(season.qualityGates?.viewingIntentAverageMinimum === 4, 'viewing intent threshold must be 4');
assert(season.qualityGates?.severeContinuityErrorsMaximum === 0, 'severe continuity errors must be zero');
assert(Array.isArray(season.films) && season.films.length === 3, 'benchmark slate must contain 3 films');
assert(season.films.map((film) => film.durationSeconds).join(',') === '30,60,90', 'film durations must be 30, 60, 90 seconds');
assert(Object.keys(season.comparisonGroups ?? {}).join(',') === 'A,B,C', 'comparison groups A, B and C are required');
assert(season.films[0].status === 'pitch-review', 'Film 01 must be at pitch review');
assert(season.films[1].status === 'research', 'Film 02 must be in research');
assert(season.films[2].status === 'queued', 'Film 03 must remain queued');

for (const artifact of requiredArtifacts) {
  await access(path.join(root, artifact));
}

console.log(`Creative validation structure valid for current phase: ${season.films.length} films, ${requiredArtifacts.length} required artifacts. Human gates are evaluated separately.`);
