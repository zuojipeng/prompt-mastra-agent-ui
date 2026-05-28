# 镜词 V2 任务包

## 数据结构定义（前后端共享）

```typescript
interface CreativeDiagnosis {
  feasibilityScore: number;
  keyRisks: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAdjustments: string[];
  recommendedDirection: string;
}

interface ReconstructVersion {
  versionType: 'safest' | 'stylish' | 'cinematic';
  label: string;
  summary: string;
  rewrittenIdea: string;
  whyThisWorks: string;
  reducedRisks: string[];
  bestFor: string;
}

interface ShotCard {
  shotId: number;
  duration: string;
  purpose: string;
  framing: string;
  description: string;
  action: string;
  mood: string;
  motion: string;
  generationMode: 'text-to-video' | 'image-to-video' | 'reference-image';
  consistencyNeed: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
  riskTags: string[];
  fixSuggestion: string;
}

interface DirectorKit {
  diagnosis: CreativeDiagnosis;
  // 3个重构版本，让用户选择
  versions: [ReconstructVersion, ReconstructVersion, ReconstructVersion];
  selectedVersion: ReconstructVersion | null;
  storySetting: {
    logline: string;
    directorIntent: string;
    protagonist: string;
    worldSetting: string;
    visualMotif: string;
  };
  shotCards: ShotCard[];
  masterPrompt: string;
  negativePrompt: string;
  platformAdvice: {
    platform: string;
    note: string;
    recommended: boolean;
  }[];
  postProductionAdvice: {
    editingRhythm: string;
    soundEffects: string[];
    music: string;
    subtitles: string;
  };
  riskRemediation: {
    topRisks: string[];
    alternativeShots: string[];
    backupStrategies: string[];
  };
}
```

## 后端 API 协议

### POST /api/v2/director-kit

输入：
```json
{
  "message": "用户在输入框写的创意",
  "targetDuration": "30s",
  "targetType": "wasteland",
  "platform": "seedance"
}
```

输出（LLM 驱动，prompt 要引导 LLM 输出上述 DirectorKit 结构）：
```json
{
  "success": true,
  "data": { ... DirectorKit ... }
}
```

## 前端页面结构

### 页面流（4 步 State Machine）
```
state: 'input' | 'diagnosis' | 'reconstruct' | 'result'

input:      输入创意 + 目标时长 + 类型偏好
diagnosis:  显示创意体检结果
reconstruct: 显示3个重构版本，用户选一个
result:     显示导演执行包完整结果
```

### 新组件清单

1. CreativeDiagnosis.tsx
   - 可拍性评分（大数字+进度条颜色）
   - 风险标签列表（红/橙/灰色标签）
   - 改造建议卡片
   - 推荐方向文案

2. ReconstructSelector.tsx
   - 3 张版本卡片并排
   - 每张含：标题/摘要/为什么/降低的风险
   - 选中后高亮 + "用此版本生成执行包" 按钮

3. DirectorKitResult.tsx（替换现有的 PromptCard 部分）
   - 顶层：诊断总览
   - 故事设定区
   - 分镜卡片列表（使用 ShotCard）
   - 主 prompt 区
   - 平台建议区
   - 后期建议区
   - 风险补救区
   - 每区可折叠

4. ShotCard.tsx
   - 镜头编号 + 时长
   - 景别/目的/描述
   - 生成方式标签（文生/图生/参考图）
   - 风险等级标签
   - 补救建议小字
   - 复制/导出按钮

5. PlatformAdvice.tsx
   - 平台列表卡片
   - 推荐标签
   - 使用说明
   - 限制提醒

6. PostProductionAdvice.tsx
   - 剪辑节奏
   - 音效/配乐/字幕建议

7. RiskRemediation.tsx
   - 前3风险
   - 替代方案
