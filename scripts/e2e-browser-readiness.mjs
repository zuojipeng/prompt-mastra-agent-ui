/**
 * Browser E2E readiness check.
 *
 * This project does not currently ship a browser automation runner. The check
 * fails with actionable setup guidance until Playwright is added deliberately.
 */

function resolvePackage(name) {
  try {
    return import.meta.resolve(name);
  } catch {
    return null;
  }
}

const playwrightTest = resolvePackage('@playwright/test');
const playwrightCore = resolvePackage('playwright');

console.log('V2 browser E2E readiness check');
console.log(`@playwright/test: ${playwrightTest ? 'available' : 'missing'}`);
console.log(`playwright: ${playwrightCore ? 'available' : 'missing'}`);

if (!playwrightTest) {
  console.error('');
  console.error('Browser E2E is not ready.');
  console.error('');
  console.error('Recommended setup:');
  console.error('  npm install -D @playwright/test');
  console.error('  npx playwright install chromium');
  console.error('');
  console.error('Then add a real V2 journey spec for:');
  console.error('  input -> loading -> diagnosis -> reconstruct -> result');
  process.exit(1);
}

console.log('Browser E2E runner is available.');
