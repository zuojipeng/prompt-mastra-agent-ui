import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.DEMO_PORT ?? 3300);
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = path.resolve('artifacts/demo');
const videoDir = path.join(outputDir, 'raw');
const finalVideo = path.join(outputDir, 'jingci-demo.webm');
export const creative = '废土小镇里，一个旧清洁机器人守护红裙人偶';

export const directorKitResponse = {
  success: true,
  data: {
    diagnosis: {
      feasibilityScore: 82,
      keyRisks: ['主体一致性', '复杂动作', '场景跳变'],
      riskLevel: 'medium',
      suggestedAdjustments: ['减少口型和多人表演', '强化红裙人偶作为视觉符号', '先用慢镜头测试主体稳定性'],
      recommendedDirection: '改成更稳定的废土守护短片，用少量镜头建立孤独和守护感。',
    },
    versions: [
      {
        versionType: 'safest',
        label: '稳妥版',
        summary: '减少复杂表演，用背影、慢动作和固定视觉符号保持稳定。',
        rewrittenIdea: '旧清洁机器人在废土小镇守护一只红裙人偶。',
        whyThisWorks: '主体单一，动作简单，视觉符号清晰。',
        reducedRisks: ['口型风险', '多人调度', '快速运镜'],
        bestFor: '文生视频首轮测试',
      },
      {
        versionType: 'stylish',
        label: '风格版',
        summary: '强化红裙人偶、沙尘、旧广告牌和冷暖色对比。',
        rewrittenIdea: '红裙人偶在风沙中成为机器人唯一守护目标。',
        whyThisWorks: '视觉母题明确，便于形成账号记忆点。',
        reducedRisks: ['主体漂移', '风格漂移'],
        bestFor: '参考图 + 图生视频',
      },
      {
        versionType: 'cinematic',
        label: '电影版',
        summary: '用三段镜头建立世界、靠近目标、完成情绪收束。',
        rewrittenIdea: '清洁机器人穿过废土小镇，最后停在红裙人偶前。',
        whyThisWorks: '镜头目的明确，短片结构完整。',
        reducedRisks: ['叙事跳跃', '场景跳变'],
        bestFor: '60 秒短片剪辑',
      },
    ],
    selectedVersion: null,
    storySetting: {
      logline: '一个旧清洁机器人在废土小镇守护红裙人偶。',
      directorIntent: '用低调动作表达孤独和守护。',
      protagonist: '旧清洁机器人',
      worldSetting: '风沙弥漫的废土小镇',
      visualMotif: '红裙人偶',
    },
    shotCards: [
      {
        shotId: 1,
        duration: '5s',
        purpose: '建立世界',
        framing: '全景',
        description: '风沙中的废土小镇，旧清洁机器人推着破旧清扫车缓慢出现。',
        action: '机器人沿街清扫，远处红裙人偶隐约可见。',
        mood: '孤独',
        motion: '缓慢推近',
        generationMode: 'text-to-video',
        consistencyNeed: 'medium',
        riskLevel: 'low',
        riskTags: ['主体一致性'],
        riskTagDetails: [
          {
            tag: '主体一致性',
            impact: '机器人外观如果变化会削弱连续性。',
            mitigation: '先生成主角参考图，并在每镜重复外观锚点。',
          },
        ],
        stabilityChecklist: ['固定机器人轮廓', '红裙人偶保持同一位置', '避免快速横移'],
        fixSuggestion: '保持机器人轮廓和红裙人偶位置稳定。',
      },
      {
        shotId: 2,
        duration: '6s',
        purpose: '建立关系',
        framing: '中景',
        description: '机器人停在红裙人偶前，风吹动人偶裙摆。',
        action: '机器人缓慢伸出机械臂，擦去人偶脸上的灰尘。',
        mood: '温柔',
        motion: '固定机位轻微推近',
        generationMode: 'image-to-video',
        consistencyNeed: 'high',
        riskLevel: 'medium',
        riskTags: ['复杂动作', '主体一致性'],
        riskTagDetails: [
          {
            tag: '复杂动作',
            impact: '机械臂擦拭动作过细可能变形。',
            mitigation: '弱化手部细节，强调缓慢靠近和停顿。',
          },
        ],
        stabilityChecklist: ['使用同一机器人参考图', '机械臂动作保持慢', '不要加入额外角色'],
        fixSuggestion: '如果动作变形，改成机器人停顿凝视红裙人偶。',
      },
    ],
    masterPrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶，风沙、旧广告牌、慢速推镜，孤独、温柔、电影感。',
    negativePrompt: '畸形，闪烁，文字水印，主体漂移，多人物，快速运镜',
    platformAdvice: [
      {
        platform: 'Seedance',
        note: '适合中文画面描述和短片节奏。',
        recommended: true,
        bestFor: '文生视频主路径和慢节奏镜头。',
        promptTips: ['先写主体和环境，再写镜头运动。', '每镜重复红裙人偶和旧清洁机器人。'],
        settings: ['建议 5s 单镜测试', '运动强度保持低到中。'],
        avoid: ['避免多人同屏复杂动作。'],
      },
      {
        platform: 'Kling',
        note: '适合参考图驱动的主体一致性测试。',
        recommended: false,
        bestFor: '第二镜机械臂靠近红裙人偶。',
        promptTips: ['先上传机器人参考图。'],
        settings: ['降低运动幅度。'],
        avoid: ['避免过细机械手指动作。'],
      },
    ],
    postProductionAdvice: {
      editingRhythm: '慢节奏，镜头之间保留停顿。',
      soundEffects: ['风声', '金属摩擦声'],
      music: '低沉环境音乐',
      subtitles: '少量旁白字幕',
    },
    riskRemediation: {
      topRisks: ['机器人外观漂移', '机械臂动作变形', '红裙人偶位置变化'],
      alternativeShots: ['使用背影或剪影镜头', '把擦拭动作改成静止凝视'],
      backupStrategies: ['先生成主角参考图', '逐镜头生成后再剪辑'],
    },
  },
};

export const analyticsResponse = {
  success: true,
  data: {
    windowDays: 30,
    total: 12,
    likes: 8,
    dislikes: 4,
    dislikeRate: 33.3,
    v2Share: 100,
    minSampleSize: 5,
    qualityFlags: [],
    dimensions: {
      eventTypes: [{ key: 'shot_card', total: 6, likes: 3, dislikes: 3, dislikeRate: 50 }],
      targetTypes: [{ key: 'wasteland', total: 12, likes: 8, dislikes: 4, dislikeRate: 33.3 }],
      platforms: [{ key: 'Seedance', total: 5, likes: 3, dislikes: 2, dislikeRate: 40 }],
      generationModes: [{ key: 'image-to-video', total: 5, likes: 2, dislikes: 3, dislikeRate: 60 }],
      riskLevels: [{ key: 'medium', total: 7, likes: 4, dislikes: 3, dislikeRate: 42.9 }],
      riskTags: [{ key: '主体一致性', total: 5, likes: 2, dislikes: 3, dislikeRate: 60 }],
      failureReasons: [{ key: '画面不稳定', total: 4, likes: 0, dislikes: 4, dislikeRate: 100 }],
    },
    highValueSamples: [
      {
        eventType: 'shot_card',
        targetType: 'wasteland',
        platform: 'Seedance',
        generationMode: 'image-to-video',
        riskLevel: 'medium',
        riskTags: ['主体一致性'],
        failureReasons: ['画面不稳定'],
        input: creative,
        prompt: '机器人停在红裙人偶前，风吹动人偶裙摆。',
        shotIndex: 2,
        comment: '第二镜机械臂动作不稳定',
        createdAt: Date.now(),
      },
    ],
  },
};

export async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function pause(ms = 700) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const server = spawn('npm', ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: 'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize',
    },
  });

  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      recordVideo: { dir: videoDir, size: { width: 1440, height: 1100 } },
    });
    const page = await context.newPage();

    await page.route('**/api/feedback/analytics**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analyticsResponse) });
    });
    await page.route('**/api/feedback', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: `demo-feedback-${Date.now()}` } }),
      });
    });
    await page.route('**/api/v2/director-kit', async (route) => {
      await pause(900);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(directorKitResponse) });
    });

    await page.goto(baseUrl);
    await pause();
    await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
    await pause();
    await page.getByRole('button', { name: '60s' }).click();
    await page.getByRole('button', { name: '赛博朋克' }).click();
    await pause();
    await page.getByRole('button', { name: /先做创意体检/ }).click();
    await page.getByRole('heading', { name: /创意体检报告/ }).waitFor({ timeout: 15_000 });
    await pause(1_200);
    await page.getByRole('button', { name: /查看重构版本/ }).click();
    await pause(1_000);
    await page.getByRole('radio').nth(2).click();
    await pause(800);
    await page.getByRole('button', { name: /用此版本生成执行包/ }).click();
    await page.getByRole('heading', { name: /导演执行包/ }).waitFor({ timeout: 10_000 });
    await pause(1_000);
    await page.getByText('出片执行进度').scrollIntoViewIfNeeded();
    await pause(800);
    await page.getByRole('button', { name: '已生成' }).first().click();
    await pause(700);
    await page.getByRole('button', { name: '翻车' }).nth(1).click();
    await pause(700);
    await page.getByRole('button', { name: '可用' }).nth(1).click();
    await pause(900);
    await page.getByRole('heading', { name: /平台建议/ }).scrollIntoViewIfNeeded();
    await pause(900);
    await page.getByRole('button', { name: '反馈洞察' }).click();
    await pause(1_200);
    await page.getByText('高频失败原因').scrollIntoViewIfNeeded();
    await pause(2_000);

    await context.close();
    const videos = await readdir(videoDir);
    const webm = videos.find((file) => file.endsWith('.webm'));
    if (!webm) throw new Error('Playwright did not produce a webm file');
    await rm(finalVideo, { force: true });
    await rename(path.join(videoDir, webm), finalVideo);
    console.log(`Demo recording saved: ${finalVideo}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
