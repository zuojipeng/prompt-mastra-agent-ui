import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import { analyticsResponse, creative, directorKitResponse, pause, waitForServer } from './record-demo.mjs';

const appPort = Number(process.env.DEMO_PORT ?? 3301);
const adapterPort = Number(process.env.PROVENANCE_ADAPTER_PORT ?? 8790);
const python = process.env.PROVENANCE_PYTHON;
const appUrl = `http://127.0.0.1:${appPort}`;
const adapterUrl = `http://127.0.0.1:${adapterPort}`;
const outputDir = path.resolve('artifacts/demo');
const rawVideoDir = path.join(outputDir, 'hackathon-raw');
const finalVideo = path.join(outputDir, 'jingci-backblaze-rehearsal.webm');
const screenshotDir = path.resolve('output/playwright');

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return child;
}

async function mockCampaignApi(page) {
  await page.route('**/api/history', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: 'history route not deployed' }),
  }));
  await page.route('**/api/projects', async (route) => {
    const request = route.request();
    const body = request.method() === 'GET'
      ? { success: true, data: { projects: [], count: 0 } }
      : { success: true, data: { id: 'rehearsal-project' } };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/api/projects/*', (route) => route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: 'not found' }),
  }));
  await page.route('**/api/feedback/analytics**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(analyticsResponse),
  }));
  await page.route('**/api/feedback', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'rehearsal-feedback' } }),
  }));
  await page.route('**/api/v2/director-kit', async (route) => {
    await pause(600);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(directorKitResponse) });
  });
}

async function runJudgePath(page, mobile) {
  await mockCampaignApi(page);
  await page.goto(appUrl);
  await pause(500);
  await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
  await page.getByRole('button', { name: '60s' }).click();
  await page.getByRole('button', { name: '赛博朋克' }).click();
  await page.getByRole('button', { name: /先做创意体检/ }).click();
  await page.getByRole('heading', { name: /创意体检报告/ }).waitFor({ timeout: 15_000 });
  await pause(700);
  await page.getByRole('button', { name: /查看重构版本/ }).click();
  await page.getByRole('radio').nth(2).click();
  await page.getByRole('button', { name: /用此版本生成执行包/ }).click();
  await page.getByRole('heading', { name: /导演执行包/ }).waitFor({ timeout: 10_000 });
  if (mobile) await page.getByRole('button', { name: /Execute/ }).click();

  const panel = page.getByRole('region', { name: '镜头 1 生成存证' });
  await panel.getByText('Local adapter').waitFor();
  await panel.scrollIntoViewIfNeeded();
  await pause(600);
  const responsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/v1/provenance-runs') && response.request().method() === 'POST'
  ));
  await panel.getByRole('button', { name: '运行存证演示' }).click();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error(`Local provenance rehearsal returned ${response.status()}`);
  await panel.getByRole('status').filter({ hasText: '存证已验证' }).waitFor();
  await panel.getByText('Verified').waitFor();
  await pause(1_000);
  await panel.screenshot({
    path: path.join(screenshotDir, `hackathon-rehearsal-local-${mobile ? 'mobile' : 'desktop'}.png`),
  });
  return panel;
}

async function main() {
  if (!python) throw new Error('PROVENANCE_PYTHON must point to the campaign virtualenv Python');
  await rm(rawVideoDir, { recursive: true, force: true });
  await mkdir(rawVideoDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
  await mkdir(screenshotDir, { recursive: true });

  const adapter = start(python, ['-m', 'jingci_spike.http_service', '--port', String(adapterPort)], {
    cwd: path.resolve('spikes/genblaze-provenance'),
    env: { ...process.env, PYTHONPATH: '.' },
  });
  const frontend = start('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(appPort)], {
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:9/api/optimize',
      NEXT_PUBLIC_PROVENANCE_API_URL: adapterUrl,
    },
  });

  let browser;
  try {
    await Promise.all([waitForServer(`${adapterUrl}/health`), waitForServer(appUrl)]);
    browser = await chromium.launch();

    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      recordVideo: { dir: rawVideoDir, size: { width: 1440, height: 1000 } },
    });
    const desktopPage = await desktop.newPage();
    const video = desktopPage.video();
    await runJudgePath(desktopPage, false);
    await desktop.close();
    if (!video) throw new Error('Playwright video recording did not start');
    const rawVideo = await video.path();
    await rm(finalVideo, { force: true });
    await rename(rawVideo, finalVideo);

    const mobile = await browser.newContext({ viewport: { width: 393, height: 851 } });
    const mobilePage = await mobile.newPage();
    await runJudgePath(mobilePage, true);
    await mobile.close();

    console.log(`Hackathon rehearsal saved: ${finalVideo}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    frontend.kill('SIGTERM');
    adapter.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
