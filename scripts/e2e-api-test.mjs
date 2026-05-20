/**
 * 端到端 API 验收测试
 * 
 * 直接对线上 API 发起请求，验证：
 * 1. 各功能是否返回 200
 * 2. 返回数据格式是否被前端正确处理
 * 3. 边界情况是否健壮
 * 
 * 运行: node scripts/e2e-api-test.mjs
 */

const API_URL = 'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';
const USER_ID = `e2e-${Date.now()}`;

let passed = 0;
let failed = 0;

async function test(name, payload) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': USER_ID },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    const ok = response.ok && data?.success === true;
    const error = data?.error || response.statusText;

    // Check response format compatibility with frontend
    let formatOk = true;
    const formatIssues = [];
    if (data?.data) {
      const d = data.data;
      // Frontend checks: data.prompts[] > data.prompt > data.result > data.optimizedPrompt
      const hasV3 = Array.isArray(d.prompts) && d.prompts.length > 0;
      const hasV2 = typeof d.prompt === 'string' && d.prompt.trim();
      const hasResult = d.result && typeof d.result === 'object';
      if (!hasV3 && !hasV2 && !hasResult) {
        formatOk = false;
        formatIssues.push('no compatible response format (needs prompts[] or prompt or result)');
      }
      // Check prompts content
      if (hasV3) {
        const nonStrings = d.prompts.filter(p => typeof p !== 'string');
        if (nonStrings.length > 0) formatIssues.push(`${nonStrings.length} non-string prompts`);
        if (d.prompts.some(p => p.length < 10)) formatIssues.push('some prompts too short');
      }
      // Check result content
      if (hasResult && !hasV3 && !hasV2) {
        const hasAnalysis = typeof d.result.analysis === 'string';
        const hasFullPrompt = typeof d.result.full_prompt === 'string' && d.result.full_prompt.trim();
        if (!hasAnalysis) formatIssues.push('result.analysis missing');
        if (!hasFullPrompt) formatIssues.push('result.full_prompt missing/empty');
      }
    }

    const status = ok && formatOk ? '✅ PASS' : '❌ FAIL';
    if (ok && formatOk) passed++;
    else failed++;

    const details = [];
    if (!ok) details.push(`HTTP ${response.status}: ${error}`);
    if (!formatOk) details.push(...formatIssues);

    console.log(`${status} ${name}`);
    if (details.length) details.forEach(d => console.log(`     ${d}`));
    return ok && formatOk;
  } catch (err) {
    failed++;
    console.log(`❌ FAIL ${name}`);
    console.log(`     ${err.message}`);
    return false;
  }
}

async function run() {
  console.log(`\n🧪 AI 视频 Prompt 工作台 - E2E API 验收测试\n`);
  console.log(`API: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  console.log('-'.repeat(60));

  // ── Core flow ──
  console.log('\n📦 === 核心生成 ===\n');
  await test('Basic single shot', { message: '雨夜街头，一个女孩回头', scenario: 'video' });
  await test('Multi-shot 3', { message: '雨夜街头，一个女孩回头', scenario: 'video', shotCount: 3 });
  await test('Multi-shot 5', { message: '雨夜街头，一个女孩回头', scenario: 'video', shotCount: 5 });
  await test('With style (wong-kar-wai)', { message: '雨夜街头', scenario: 'video', style: 'wong-kar-wai' });
  await test('With style (cyberpunk)', { message: '雨夜街头', scenario: 'video', style: 'cyberpunk' });
  await test('With style (epic)', { message: '雨夜街头', scenario: 'video', style: 'epic' });
  await test('Long Chinese input', { message: '深夜的北京胡同里，一个穿红色旗袍的女子撑着一把油纸伞，踩着积水慢慢走过，墙上的灯笼在风中摇曳，远处传来二胡的琴声', scenario: 'video' });

  // ── Project Bible ──
  console.log('\n📖 === 高级导演模式 ===\n');
  await test('Bible: protagonist only', { message: '雨夜街头', scenario: 'video', projectBible: { protagonist: '穿灰色雨衣的短发女孩' } });
  await test('Bible: protagonist + world', { message: '雨夜街头', scenario: 'video', projectBible: { protagonist: '穿灰色雨衣的短发女孩', world: '雨夜霓虹街道' } });
  await test('Bible: full fields', { message: '雨夜街头', scenario: 'video', projectBible: { protagonist: '穿灰色雨衣的短发女孩', mission: '寻找失踪的弟弟', world: '近未来南方城市，常年下雨，霓虹灯牌密布', lookAndFeel: '赛博朋克，青橙互补色', shotIntent: '建立悬念，制造紧张氛围' } });
  await test('Bible: with visual symbols + continuity rules', {
    message: '雨夜街头',
    scenario: 'video',
    projectBible: {
      protagonist: '灰色雨衣女孩',
      visualSymbols: ['透明雨伞', '红蓝霓虹倒影'],
      continuityRules: ['雨量始终保持中雨', '主光源来自霓虹灯'],
    },
  });

  // ── Refinement ──
  console.log('\n🔄 === 镜头优化 ===\n');
  await test('Refinement: change lighting', {
    message: '加强光影对比，把环境改为黄昏',
    scenario: 'video',
    refinement: { targetType: 'full_prompt', label: '镜头1', content: '雨夜街头，一个穿灰色雨衣的女孩站在霓虹招牌下缓慢回头' },
  });
  await test('Refinement: change mood', {
    message: '把氛围改为温暖的回忆感',
    scenario: 'video',
    refinement: { targetType: 'full_prompt', label: '镜头1', content: '雨夜街头，一个穿灰色雨衣的女孩站在霓虹招牌下缓慢回头' },
  });

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  const total = passed + failed;
  console.log(`\n📊 结果: ${passed}/${total} 通过 (${failed} 失败)\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(console.error);
