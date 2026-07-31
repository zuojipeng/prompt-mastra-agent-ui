import type {
  DirectorKit,
  DirectorKitTargetDuration,
  DirectorKitTargetType,
} from './director-kit-contract';

export const PUBLIC_DEMO_MODE = 'fixture';

export function isPublicDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === PUBLIC_DEMO_MODE;
}

export function createPublicDemoDirectorKit(params: {
  message: string;
  targetDuration: DirectorKitTargetDuration;
  targetType: DirectorKitTargetType;
}): DirectorKit {
  const idea = params.message.trim();
  const targetSeconds = Number.parseInt(params.targetDuration, 10);
  const shotDuration = `${Math.floor(targetSeconds / 2)}s`;
  return {
    diagnosis: {
      feasibilityScore: 82,
      keyRisks: ['主体一致性', '复杂动作', '场景跳变'],
      riskLevel: 'medium',
      suggestedAdjustments: ['固定主体外观锚点', '减少复杂动作', '先用慢镜头验证稳定性'],
      recommendedDirection: '先用两个目的明确的镜头验证主体、动作和场景连续性。',
    },
    versions: [
      {
        versionType: 'safest',
        label: '稳妥版',
        summary: '减少复杂表演，用慢动作和固定视觉锚点保持稳定。',
        rewrittenIdea: `${idea}，固定主体与场景，只保留一个核心动作。`,
        whyThisWorks: '主体单一，动作简单，适合首轮生成验证。',
        reducedRisks: ['主体漂移', '复杂动作', '快速运镜'],
        bestFor: '文生视频首轮测试',
      },
      {
        versionType: 'stylish',
        label: '风格版',
        summary: '强化一个视觉母题和稳定的冷暖色关系。',
        rewrittenIdea: `${idea}，用单一视觉母题和克制色彩建立记忆点。`,
        whyThisWorks: '视觉规则明确，便于跨镜头复用。',
        reducedRisks: ['风格漂移', '场景跳变'],
        bestFor: '参考图 + 图生视频',
      },
      {
        versionType: 'cinematic',
        label: '电影版',
        summary: '用建立环境和靠近主体两个镜头完成情绪收束。',
        rewrittenIdea: `${idea}，先建立环境，再缓慢靠近主体完成情绪落点。`,
        whyThisWorks: '镜头目的明确，短片结构完整。',
        reducedRisks: ['叙事跳跃', '镜头目的不清'],
        bestFor: `${params.targetDuration} 叙事短片`,
      },
    ],
    selectedVersion: null,
    storySetting: {
      logline: idea,
      directorIntent: '用低复杂度动作建立清晰的视觉关系。',
      protagonist: '固定主体',
      worldSetting: `统一的${params.targetType}场景`,
      visualMotif: '单一高识别度视觉锚点',
    },
    shotCards: [
      {
        shotId: 1,
        duration: shotDuration,
        purpose: '建立世界',
        framing: '全景',
        description: `${idea}。先用稳定全景交代环境与主体位置。`,
        action: '主体以低幅度动作进入画面。',
        mood: '克制',
        motion: '缓慢推近',
        generationMode: 'text-to-video',
        consistencyNeed: 'medium',
        riskLevel: 'low',
        riskTags: ['主体一致性'],
        riskTagDetails: [{
          tag: '主体一致性',
          impact: '主体外观变化会削弱连续性。',
          mitigation: '固定外观锚点，并在每镜重复。',
        }],
        stabilityChecklist: ['固定主体轮廓', '保持同一视觉锚点', '避免快速横移'],
        fixSuggestion: '减少动作幅度并锁定主体轮廓。',
      },
      {
        shotId: 2,
        duration: shotDuration,
        purpose: '完成情绪落点',
        framing: '中景',
        description: '保持同一场景和主体，靠近核心视觉锚点。',
        action: '主体停顿，以一个简单动作结束镜头。',
        mood: '温和',
        motion: '固定机位轻微推近',
        generationMode: 'image-to-video',
        consistencyNeed: 'high',
        riskLevel: 'medium',
        riskTags: ['复杂动作', '主体一致性'],
        riskTagDetails: [{
          tag: '复杂动作',
          impact: '过细动作可能产生形变。',
          mitigation: '改为靠近、停顿或凝视。',
        }],
        stabilityChecklist: ['复用主体参考图', '动作保持缓慢', '不加入额外角色'],
        fixSuggestion: '把复杂动作改成停顿或凝视。',
      },
    ],
    masterPrompt: `${idea}，固定主体外观与场景锚点，低幅度动作，缓慢推镜，电影感。`,
    negativePrompt: '畸形，闪烁，文字水印，主体漂移，多人物，快速运镜',
    platformAdvice: [{
      platform: 'Seedance',
      note: '适合中文画面描述和短片节奏。',
      recommended: true,
      bestFor: '文生视频主路径和慢节奏镜头。',
      promptTips: ['先写主体和环境，再写镜头运动。'],
      settings: ['建议 5s 单镜测试', '运动强度保持低到中。'],
      avoid: ['避免多人同屏复杂动作。'],
    }],
    postProductionAdvice: {
      editingRhythm: '慢节奏，镜头之间保留停顿。',
      soundEffects: ['环境声', '低频质感声'],
      music: '克制的环境音乐',
      subtitles: '少量旁白字幕',
    },
    riskRemediation: {
      topRisks: ['主体外观漂移', '复杂动作变形', '场景锚点变化'],
      alternativeShots: ['使用背影或剪影', '把复杂动作改为静止凝视'],
      backupStrategies: ['先生成主体参考图', '逐镜生成后再剪辑'],
    },
  };
}
