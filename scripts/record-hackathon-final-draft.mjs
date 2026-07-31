import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';

const publicUrl = 'https://jingci-genmedia-judge-demo-2026.pages.dev';
const allowedHost = new URL(publicUrl).hostname;
const outputDir = path.resolve('artifacts/demo/final-draft');
const rawVideoDir = path.join(outputDir, 'raw');
const flowVideo = path.join(outputDir, 'public-flow.webm');
const evidenceSlide = path.join(outputDir, 'evidence-slide.png');
const closingSlide = path.join(outputDir, 'closing-slide.png');
const narration = path.join(outputDir, 'narration.aiff');
const finalVideo = path.resolve('artifacts/demo/jingci-genmedia-final-draft.mp4');
const runwayVideo = path.resolve('artifacts/demo/jingci-runway-gen45-20260717.mp4');
const retryImage = path.resolve('output/playwright/provenance-desktop.png');
const voiceoverFile = path.resolve('docs/campaigns/backblaze-genmedia-2026/docs/final-video-voiceover.txt');
const captionsFile = path.resolve('docs/campaigns/backblaze-genmedia-2026/docs/final-video-captions.srt');
const creative = '废土小镇里，一个旧清洁机器人守护红裙人偶';

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args) {
  execFileSync(command, args, { cwd: process.cwd(), stdio: 'inherit' });
}

async function renderSlide(page, body, output) {
  await page.setContent(`<!doctype html>
    <html><head><meta charset="utf-8"><style>
      *{box-sizing:border-box} body{margin:0;width:1280px;height:720px;background:#081019;color:#f4f7f8;
      font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0}
      main{height:100%;padding:64px 76px;display:flex;flex-direction:column;justify-content:center}
      .brand{font-size:18px;color:#67e8f9;font-weight:700;margin-bottom:22px}.title{font-size:48px;line-height:1.08;font-weight:760;max-width:1000px}
      .rule{width:90px;height:3px;background:#e11d48;margin:28px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .item{border:1px solid #334155;background:#101b27;padding:20px}.label{font-size:13px;color:#94a3b8;text-transform:uppercase;font-weight:700}
      .value{font-size:21px;line-height:1.35;margin-top:7px}.note{font-size:17px;line-height:1.45;color:#cbd5e1;max-width:1080px}
      .url{font-size:18px;color:#67e8f9;margin-top:22px}
    </style></head><body><main>${body}</main></body></html>`);
  await page.screenshot({ path: output });
}

async function recordPublicFlow(browser) {
  await rm(rawVideoDir, { recursive: true, force: true });
  await mkdir(rawVideoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawVideoDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();
  const forbiddenRequests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== allowedHost) {
      forbiddenRequests.push(request.url());
    }
  });

  await page.goto(publicUrl, { waitUntil: 'networkidle' });
  await page.getByRole('status').filter({ hasText: 'Public judge demo' }).waitFor();
  await pause(6_000);
  await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
  await pause(2_000);
  await page.getByRole('button', { name: /先做创意体检/ }).click();
  await page.getByRole('heading', { name: /创意体检报告/ }).waitFor();
  await pause(8_000);
  await page.getByRole('button', { name: /查看重构版本/ }).click();
  await pause(7_000);
  await page.getByRole('radio').nth(2).click();
  await page.getByRole('button', { name: /用此版本生成执行包/ }).click();
  await page.getByRole('heading', { name: /导演执行包/ }).waitFor();
  await pause(9_000);
  const provenance = page.getByRole('region', { name: '镜头 1 生成存证' });
  await provenance.scrollIntoViewIfNeeded();
  await pause(7_000);
  await provenance.getByRole('button', { name: '运行离线契约演示' }).click();
  await provenance.getByText('Fixture contract verified').waitFor();
  await pause(9_000);

  if (forbiddenRequests.length > 0) {
    throw new Error(`Public recording made forbidden requests: ${forbiddenRequests.join(', ')}`);
  }
  await context.close();
  if (!video) throw new Error('Playwright video recording did not start');
  await rm(flowVideo, { force: true });
  await rename(await video.path(), flowVideo);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  if (process.env.REUSE_FINAL_DRAFT_CAPTURE !== '1') {
    const browser = await chromium.launch();
    try {
      await recordPublicFlow(browser);
      const slideContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await slideContext.newPage();
      await renderSlide(page, `
      <div class="brand">JINGCI PROVENANCE VAULT</div>
      <div class="title">Evidence-preserving phases</div><div class="rule"></div>
      <div class="grid">
        <div class="item"><div class="label">Provider generation</div><div class="value">Runway gen4.5 · 5 seconds · 1280×720 · H.264</div></div>
        <div class="item"><div class="label">Separate recovery verification</div><div class="value">Genblaze → private Backblaze B2 · digest + lineage verified</div></div>
      </div>
      <p class="note">Two scoped test objects were deleted after read-back. These were two phases, not one atomic transaction; this does not claim public B2 serving or durable retention.</p>
      `, evidenceSlide);
      await renderSlide(page, `
      <div class="brand">JINGCI PROVENANCE VAULT</div>
      <div class="title">Direct the shot.<br>Generate it. Prove it.<br>Improve the next run.</div>
      <div class="rule"></div><div class="url">jingci-genmedia-judge-demo-2026.pages.dev</div>
      `, closingSlide);
      await slideContext.close();
    } finally {
      await browser.close();
    }
  }

  const voiceover = await readFile(voiceoverFile, 'utf8');
  run('/usr/bin/say', ['-v', 'Daniel', '-r', '165', '-o', narration, voiceover]);
  await rm(finalVideo, { force: true });
  run('/usr/local/bin/ffmpeg', [
    '-y',
    '-i', flowVideo,
    '-stream_loop', '-1', '-i', runwayVideo,
    '-loop', '1', '-i', evidenceSlide,
    '-loop', '1', '-i', retryImage,
    '-loop', '1', '-i', closingSlide,
    '-i', narration,
    '-i', captionsFile,
    '-filter_complex',
    `[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:#081019,fps=30,tpad=stop_mode=clone:stop_duration=60,trim=duration=60,setpts=PTS-STARTPTS[v0];` +
    `[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:#081019,fps=30,trim=duration=15,setpts=PTS-STARTPTS[v1];` +
    `[2:v]scale=1280:720,fps=30,trim=duration=32,setpts=PTS-STARTPTS[v2];` +
    `[3:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:#081019,fps=30,trim=duration=18,setpts=PTS-STARTPTS[v3];` +
    `[4:v]scale=1280:720,fps=30,trim=duration=22,setpts=PTS-STARTPTS[v4];` +
    `[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[video];` +
    `[5:a]aresample=48000,apad,atrim=duration=147[audio]`,
    '-map', '[video]', '-map', '[audio]', '-map', '6:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng',
    '-movflags', '+faststart', '-t', '147', finalVideo,
  ]);
  console.log(`Final local draft saved: ${finalVideo}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
