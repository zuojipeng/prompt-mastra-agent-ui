/**
 * V2 DirectorKit API E2E contract test.
 *
 * This test calls the deployed Worker and validates the response shape used by
 * the V2 frontend flow. It intentionally covers only a compact happy path and a
 * validation failure path because the endpoint invokes an LLM.
 *
 * Run:
 *   node scripts/e2e-director-kit-test.mjs
 *
 * Optional:
 *   API_BASE_URL=https://example.workers.dev node scripts/e2e-director-kit-test.mjs
 */

const API_BASE_URL =
  process.env.API_BASE_URL ?? 'https://prompt-optimizer.hahazuo460.workers.dev';
const DIRECTOR_KIT_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/v2/director-kit`;
const USER_ID = `e2e-v2-${Date.now()}`;

let passed = 0;
let failed = 0;

function assert(condition, message, issues) {
  if (!condition) issues.push(message);
}

function isString(value) {
  return typeof value === 'string';
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}

function validateDirectorKit(data) {
  const issues = [];

  assert(data && typeof data === 'object', 'data must be an object', issues);
  if (!data || typeof data !== 'object') return issues;

  const diagnosis = data.diagnosis;
  assert(diagnosis && typeof diagnosis === 'object', 'diagnosis missing', issues);
  if (diagnosis && typeof diagnosis === 'object') {
    assert(
      typeof diagnosis.feasibilityScore === 'number' &&
        diagnosis.feasibilityScore >= 0 &&
        diagnosis.feasibilityScore <= 100,
      'diagnosis.feasibilityScore must be 0-100 number',
      issues,
    );
    assert(['low', 'medium', 'high'].includes(diagnosis.riskLevel), 'diagnosis.riskLevel invalid', issues);
    assert(isStringArray(diagnosis.keyRisks), 'diagnosis.keyRisks must be string[]', issues);
    assert(
      isStringArray(diagnosis.suggestedAdjustments),
      'diagnosis.suggestedAdjustments must be string[]',
      issues,
    );
    assert(isString(diagnosis.recommendedDirection), 'diagnosis.recommendedDirection missing', issues);
  }

  assert(Array.isArray(data.versions) && data.versions.length === 3, 'versions must contain 3 items', issues);
  if (Array.isArray(data.versions)) {
    data.versions.forEach((version, index) => {
      assert(
        ['safest', 'stylish', 'cinematic'].includes(version?.versionType),
        `versions[${index}].versionType invalid`,
        issues,
      );
      ['label', 'summary', 'rewrittenIdea', 'whyThisWorks', 'bestFor'].forEach((key) => {
        assert(isString(version?.[key]), `versions[${index}].${key} missing`, issues);
      });
      assert(isStringArray(version?.reducedRisks), `versions[${index}].reducedRisks must be string[]`, issues);
    });
  }

  assert(data.selectedVersion === null, 'selectedVersion must be null', issues);
  assert(data.storySetting && typeof data.storySetting === 'object', 'storySetting missing', issues);
  ['logline', 'directorIntent', 'protagonist', 'worldSetting', 'visualMotif'].forEach((key) => {
    assert(isString(data.storySetting?.[key]), `storySetting.${key} missing`, issues);
  });

  assert(Array.isArray(data.shotCards) && data.shotCards.length > 0, 'shotCards must be non-empty', issues);
  if (Array.isArray(data.shotCards)) {
    data.shotCards.forEach((card, index) => {
      assert(Number.isInteger(card?.shotId) && card.shotId > 0, `shotCards[${index}].shotId invalid`, issues);
      [
        'duration',
        'purpose',
        'framing',
        'description',
        'action',
        'mood',
        'motion',
        'fixSuggestion',
      ].forEach((key) => {
        assert(isString(card?.[key]), `shotCards[${index}].${key} missing`, issues);
      });
      assert(
        ['text-to-video', 'image-to-video', 'reference-image'].includes(card?.generationMode),
        `shotCards[${index}].generationMode invalid`,
        issues,
      );
      assert(['low', 'medium', 'high'].includes(card?.consistencyNeed), `shotCards[${index}].consistencyNeed invalid`, issues);
      assert(['low', 'medium', 'high'].includes(card?.riskLevel), `shotCards[${index}].riskLevel invalid`, issues);
      assert(isStringArray(card?.riskTags), `shotCards[${index}].riskTags must be string[]`, issues);
    });
  }

  assert(isString(data.masterPrompt), 'masterPrompt missing', issues);
  assert(isString(data.negativePrompt), 'negativePrompt missing', issues);

  assert(Array.isArray(data.platformAdvice), 'platformAdvice must be array', issues);
  if (Array.isArray(data.platformAdvice)) {
    data.platformAdvice.forEach((advice, index) => {
      assert(isString(advice?.platform), `platformAdvice[${index}].platform missing`, issues);
      assert(isString(advice?.note), `platformAdvice[${index}].note missing`, issues);
      assert(typeof advice?.recommended === 'boolean', `platformAdvice[${index}].recommended must be boolean`, issues);
    });
  }

  assert(data.postProductionAdvice && typeof data.postProductionAdvice === 'object', 'postProductionAdvice missing', issues);
  assert(isString(data.postProductionAdvice?.editingRhythm), 'postProductionAdvice.editingRhythm missing', issues);
  assert(isStringArray(data.postProductionAdvice?.soundEffects), 'postProductionAdvice.soundEffects must be string[]', issues);
  assert(isString(data.postProductionAdvice?.music), 'postProductionAdvice.music missing', issues);
  assert(isString(data.postProductionAdvice?.subtitles), 'postProductionAdvice.subtitles missing', issues);

  assert(data.riskRemediation && typeof data.riskRemediation === 'object', 'riskRemediation missing', issues);
  assert(isStringArray(data.riskRemediation?.topRisks), 'riskRemediation.topRisks must be string[]', issues);
  assert(isStringArray(data.riskRemediation?.alternativeShots), 'riskRemediation.alternativeShots must be string[]', issues);
  assert(isStringArray(data.riskRemediation?.backupStrategies), 'riskRemediation.backupStrategies must be string[]', issues);

  return issues;
}

async function postJson(name, payload, expectedStatus = 200) {
  try {
    const response = await fetch(DIRECTOR_KIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': USER_ID,
        'X-Session-Id': `${USER_ID}-session`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const statusOk = response.status === expectedStatus;
    const successOk = expectedStatus >= 400 ? json?.success === false : json?.success === true;
    const issues = [];

    if (expectedStatus === 200) {
      issues.push(...validateDirectorKit(json?.data));
    }

    const ok = statusOk && successOk && issues.length === 0;
    if (ok) passed += 1;
    else failed += 1;

    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    if (!statusOk) console.log(`  expected HTTP ${expectedStatus}, got ${response.status}`);
    if (!successOk) console.log(`  unexpected success flag or body: ${text.slice(0, 500)}`);
    issues.forEach((issue) => console.log(`  ${issue}`));
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name}`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function run() {
  console.log('V2 DirectorKit E2E contract test');
  console.log(`API: ${DIRECTOR_KIT_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  await postJson('happy path: wasteland 30s', {
    message: '废土小镇里，一个旧清洁机器人守护红裙人偶',
    targetDuration: '30s',
    targetType: 'wasteland',
  });

  await postJson('validation: empty message', {
    message: '',
    targetDuration: '30s',
    targetType: 'wasteland',
  }, 400);

  const total = passed + failed;
  console.log('');
  console.log(`Result: ${passed}/${total} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
