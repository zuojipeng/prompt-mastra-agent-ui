import { expect, test, type Page, type Route } from '@playwright/test';

const creative = '废土小镇里，一个旧清洁机器人守护红裙人偶';

const directorKitResponse = {
  success: true,
  data: {
    diagnosis: {
      feasibilityScore: 82,
      keyRisks: ['角色一致性', '复杂动作'],
      riskLevel: 'medium',
      suggestedAdjustments: ['减少口型和多人表演', '强化红裙人偶作为视觉符号'],
      recommendedDirection: '改成更稳定的废土守护短片。',
    },
    versions: [
      {
        versionType: 'safest',
        label: '稳妥版',
        summary: '减少复杂表演，用背影和慢动作保持稳定。',
        rewrittenIdea: '旧清洁机器人在废土小镇守护红裙人偶。',
        whyThisWorks: '主体单一，动作简单。',
        reducedRisks: ['口型风险', '多人调度'],
        bestFor: '文生视频',
      },
      {
        versionType: 'stylish',
        label: '风格版',
        summary: '强化红裙人偶、沙尘和旧广告牌。',
        rewrittenIdea: '红裙人偶在风沙中成为机器人唯一守护目标。',
        whyThisWorks: '视觉符号清晰。',
        reducedRisks: ['主体漂移'],
        bestFor: '参考图',
      },
      {
        versionType: 'cinematic',
        label: '电影版',
        summary: '用三段镜头建立孤独、守护和悬念。',
        rewrittenIdea: '清洁机器人穿过废土小镇，最后停在红裙人偶前。',
        whyThisWorks: '镜头目的明确。',
        reducedRisks: ['叙事跳跃'],
        bestFor: '短片剪辑',
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
    ],
    masterPrompt: '废土小镇里，一个旧清洁机器人守护红裙人偶，风沙、旧广告牌、慢速推镜。',
    negativePrompt: '畸形，闪烁，文字水印，主体漂移',
    platformAdvice: [
      {
        platform: 'Seedance',
        note: '适合中文画面描述和短片节奏。',
        recommended: true,
        bestFor: '文生视频主路径和慢节奏镜头。',
        promptTips: ['先写主体和环境，再写镜头运动。'],
        settings: ['建议 5s 单镜测试', '运动强度保持低到中。'],
        avoid: ['避免多人同屏复杂动作。'],
      },
    ],
    postProductionAdvice: {
      editingRhythm: '慢节奏，镜头之间保留停顿。',
      soundEffects: ['风声', '金属摩擦声'],
      music: '低沉环境音乐',
      subtitles: '少量旁白字幕',
    },
    riskRemediation: {
      topRisks: ['机器人外观漂移'],
      alternativeShots: ['使用背影或剪影镜头'],
      backupStrategies: ['先生成主角参考图'],
    },
  },
};

async function mockDirectorKit(page: Page, options?: { failOnce?: boolean }) {
  let calls = 0;
  await page.route('**/api/feedback/analytics**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          windowDays: 30,
          total: 8,
          likes: 5,
          dislikes: 3,
          dislikeRate: 37.5,
          v2Share: 100,
          minSampleSize: 5,
          qualityFlags: [],
          dimensions: {
            eventTypes: [{ key: 'shot_card', total: 4, likes: 2, dislikes: 2, dislikeRate: 50 }],
            targetTypes: [{ key: 'wasteland', total: 8, likes: 5, dislikes: 3, dislikeRate: 37.5 }],
            platforms: [{ key: 'Seedance', total: 3, likes: 1, dislikes: 2, dislikeRate: 66.7 }],
            generationModes: [{ key: 'text-to-video', total: 5, likes: 3, dislikes: 2, dislikeRate: 40 }],
            riskLevels: [{ key: 'medium', total: 4, likes: 2, dislikes: 2, dislikeRate: 50 }],
            riskTags: [{ key: '主体一致性', total: 3, likes: 1, dislikes: 2, dislikeRate: 66.7 }],
            failureReasons: [{ key: '画面不稳定', total: 3, likes: 0, dislikes: 3, dislikeRate: 100 }],
          },
          highValueSamples: [
            {
              eventType: 'shot_card',
              targetType: 'wasteland',
              platform: 'Seedance',
              generationMode: 'text-to-video',
              riskLevel: 'medium',
              riskTags: ['主体一致性'],
              failureReasons: ['画面不稳定'],
              input: creative,
              prompt: '风沙中的废土小镇，旧清洁机器人缓慢出现。',
              shotIndex: 1,
              comment: '分镜生成存在问题',
              createdAt: 1780500000000,
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/feedback', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: `feedback-${Date.now()}` } }),
    });
  });

  await page.route('**/api/v2/director-kit', async (route: Route) => {
    calls += 1;
    if (options?.failOnce && calls === 1) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: '模型返回格式无效，请重试' }),
      });
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(directorKitResponse),
    });
  });
}

async function createDirectorKitResult(page: Page) {
  await page.goto('/');

  await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
  await page.getByRole('button', { name: '60s' }).click();
  await page.getByRole('button', { name: '赛博朋克' }).click();
  await page.getByRole('button', { name: /先做创意体检/ }).click();

  await expect(page.getByRole('heading', { name: /创意体检报告/ })).toBeVisible();
  await page.getByRole('button', { name: /查看重构版本/ }).click();
  await page.getByRole('radio').nth(2).click();
  await page.getByRole('button', { name: /用此版本生成执行包/ }).click();
  await expect(page.getByRole('heading', { name: /导演执行包/ })).toBeVisible();
}

test.describe('V2 DirectorKit browser flow', () => {
  test('happy path reaches DirectorKit result', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === 'mobile-chrome';
    await mockDirectorKit(page);
    await page.goto('/');

    await page.getByPlaceholder('例如：雨夜街头，一个女孩回头...').fill(creative);
    await page.getByRole('button', { name: '60s' }).click();
    await page.getByRole('button', { name: '赛博朋克' }).click();
    await page.getByRole('button', { name: /先做创意体检/ }).click();

    await expect(page.getByText('正在生成导演执行包')).toBeVisible();
    await expect(page.getByPlaceholder('例如：雨夜街头，一个女孩回头...')).toBeDisabled();
    await expect(page.getByRole('button', { name: '60s' })).toBeDisabled();

    await expect(page.getByRole('heading', { name: /创意体检报告/ })).toBeVisible();
    await expect(page.getByText('可拍性评分')).toBeVisible();
    await page.getByRole('button', { name: /查看重构版本/ }).click();

    await expect(page.getByRole('heading', { name: /选择重构版本/ })).toBeVisible();
    const options = page.getByRole('radio');
    await expect(options).toHaveCount(3);
    await expect(page.getByRole('button', { name: '请选择一个版本' })).toBeDisabled();

    await options.nth(1).focus();
    await page.keyboard.press('ArrowRight');
    await expect(options.nth(2)).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: /用此版本生成执行包/ }).click();

    await expect(page.getByRole('heading', { name: /导演执行包/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /故事设定/ })).toBeVisible();
    await expect(page.getByText(/分镜卡片/)).toBeVisible();
    await expect(page.getByText('风险标签说明')).toBeVisible();
    await expect(page.getByText('生成前稳定性检查')).toBeVisible();
    await expect(page.getByRole('heading', { name: /主 Prompt/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /平台建议/ })).toBeVisible();
    await expect(page.getByText('Prompt 写法')).toBeVisible();
    await expect(page.getByText('推荐设置')).toBeVisible();
    await page.getByRole('button', { name: '复制平台投喂包' }).click();
    await expect(page.getByText('平台投喂包已复制')).toBeVisible();
    await expect(page.getByRole('heading', { name: /后期制作建议/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /风险补救/ })).toBeVisible();
    if (isMobile) {
      await page.getByRole('button', { name: /Execute/ }).click();
    }
    await expect(page.getByText('出片执行进度')).toBeVisible();
    await expect(page.getByText('0/1 个镜头已有执行结果')).toBeVisible();
    if (isMobile) {
      await expect(page.getByLabel('当前镜头素材 / 备注')).toBeVisible();
      await page.getByPlaceholder('记录平台链接、文件名或失败原因...').fill('Seedance 生成链接：demo-shot-1');
    } else {
      await expect(page.getByLabel('素材链接 / 结果备注')).toBeVisible();
      await page.getByPlaceholder('粘贴平台生成链接、文件名或记录翻车原因...').fill('Seedance 生成链接：demo-shot-1');
    }
    await page.getByRole('button', { name: '复制执行清单' }).click();
    await expect(page.getByText('执行清单已复制')).toBeVisible();
    await page.getByRole('button', { name: '复制项目快照' }).click();
    await expect(page.getByText('项目快照已复制')).toBeVisible();
    if (isMobile) {
      await page.getByRole('button', { name: '复制当前镜头 Prompt' }).click();
      await expect(page.getByText('当前镜头 Prompt 已复制')).toBeVisible();
    } else {
      await page.getByRole('button', { name: '复制镜头 Prompt' }).click();
      await expect(page.getByText('镜头 Prompt 已复制', { exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: '翻车' }).click();
    await expect(page.getByText('1/1 个镜头已有执行结果')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
    await page.getByRole('button', { name: '可用' }).click();
    await expect(page.getByText('1/1 个镜头已有执行结果')).toBeVisible();

    if (isMobile) {
      await page.getByRole('button', { name: /Feedback/ }).click();
    }
    await page.getByRole('button', { name: '反馈洞察' }).click();
    await expect(page.getByText('高频失败原因')).toBeVisible();
    await expect(page.getByText('画面不稳定').last()).toBeVisible();
    await expect(page.getByText('最近差评样本')).toBeVisible();

    if (isMobile) {
      await page.getByRole('button', { name: /Work/ }).click();
    }
    await page.getByRole('button', { name: '有用' }).first().click();
    await expect(page.getByText('已记录有用')).toBeVisible();
    await page.getByRole('button', { name: '画面不稳定' }).first().click();
    await expect(page.getByText('已记录问题')).toHaveCount(1);
    await page.getByRole('button', { name: '平台不适配' }).last().click();
    await expect(page.getByText('已记录问题')).toHaveCount(2);
  });

  test('local project workspace restores result after reload', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name === 'mobile-chrome';
    await mockDirectorKit(page);
    await createDirectorKitResult(page);

    if (isMobile) {
      await page.getByRole('button', { name: /Execute/ }).click();
      await page.getByPlaceholder('记录平台链接、文件名或失败原因...').fill('Seedance 生成链接：demo-shot-1');
    } else {
      await page.getByPlaceholder('粘贴平台生成链接、文件名或记录翻车原因...').fill('Seedance 生成链接：demo-shot-1');
    }
    await page.getByRole('button', { name: '可用' }).click();

    if (isMobile) {
      await page.getByRole('button', { name: /Work/ }).click();
    }
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText('项目已保存')).toBeVisible();

    await page.reload();

    await expect(page.getByText('已恢复最近项目')).toBeVisible();
    await expect(page.getByRole('heading', { name: /导演执行包/ })).toBeVisible();

    if (isMobile) {
      await page.getByRole('button', { name: /Execute/ }).click();
      await expect(page.getByText('1/1 个镜头已有执行结果')).toBeVisible();
      await expect(page.getByText('100%')).toBeVisible();
      await expect(page.getByPlaceholder('记录平台链接、文件名或失败原因...')).toHaveValue(
        'Seedance 生成链接：demo-shot-1',
      );
    } else {
      await expect(page.getByText('1/1 个镜头已有执行结果')).toBeVisible();
      await expect(page.getByText('100%')).toBeVisible();
      await expect(page.getByPlaceholder('粘贴平台生成链接、文件名或记录翻车原因...')).toHaveValue(
        'Seedance 生成链接：demo-shot-1',
      );
    }
  });

  test('validation and retry recovery preserve input', async ({ page }) => {
    await mockDirectorKit(page, { failOnce: true });
    await page.goto('/');

    await page.getByRole('button', { name: /先做创意体检/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: '请输入视频创意' })).toBeVisible();

    const input = page.getByPlaceholder('例如：雨夜街头，一个女孩回头...');
    await input.fill(creative);
    await page.getByRole('button', { name: /先做创意体检/ }).click();

    await expect(page.getByRole('alert').filter({ hasText: 'HTTP 502' })).toBeVisible();
    await expect(input).toHaveValue(creative);
    await page.getByRole('button', { name: '重试生成' }).click();

    await expect(page.getByRole('heading', { name: /创意体检报告/ })).toBeVisible();
    await page.getByRole('button', { name: '返回修改' }).click();
    await expect(input).toHaveValue(creative);
  });
});
