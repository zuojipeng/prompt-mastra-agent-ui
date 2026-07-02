import type { ShotCard } from './director-kit-contract';

export type PlatformCapabilityProfile = {
  id: string;
  displayName: string;
  preferredModes: ShotCard['generationMode'][];
  maxFirstPassShots: number;
  riskTolerance: ShotCard['riskLevel'];
  handoffNotes: string[];
};

const RISK_SCORE: Record<ShotCard['riskLevel'], number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export const PLATFORM_CAPABILITY_PROFILES: PlatformCapabilityProfile[] = [
  {
    id: 'seedance',
    displayName: 'Seedance',
    preferredModes: ['text-to-video', 'reference-image'],
    maxFirstPassShots: 2,
    riskTolerance: 'medium',
    handoffNotes: ['适合中文画面描述和短片节奏', '首轮优先测试主体稳定、动作较少的镜头'],
  },
  {
    id: 'kling',
    displayName: 'Kling',
    preferredModes: ['image-to-video', 'reference-image', 'text-to-video'],
    maxFirstPassShots: 2,
    riskTolerance: 'medium',
    handoffNotes: ['适合参考图或首帧约束较强的镜头', '复杂动作先拆成短镜头测试'],
  },
  {
    id: 'runway',
    displayName: 'Runway',
    preferredModes: ['image-to-video', 'reference-image'],
    maxFirstPassShots: 2,
    riskTolerance: 'medium',
    handoffNotes: ['适合风格化和镜头运动控制', '先用可控主体测试运动幅度'],
  },
  {
    id: 'pika',
    displayName: 'Pika',
    preferredModes: ['image-to-video', 'text-to-video'],
    maxFirstPassShots: 2,
    riskTolerance: 'low',
    handoffNotes: ['适合短镜头和局部动效测试', '高风险连续动作应先降级为静态或小幅运动'],
  },
  {
    id: 'sora',
    displayName: 'Sora',
    preferredModes: ['text-to-video', 'image-to-video', 'reference-image'],
    maxFirstPassShots: 3,
    riskTolerance: 'medium',
    handoffNotes: ['适合更完整的叙事镜头描述', '仍需保留主体、场景、动作的清晰边界'],
  },
];

export function resolvePlatformCapability(platform: string): PlatformCapabilityProfile {
  const normalizedPlatform = platform.trim().toLowerCase();
  return (
    PLATFORM_CAPABILITY_PROFILES.find(
      (profile) =>
        normalizedPlatform === profile.id ||
        normalizedPlatform.includes(profile.id) ||
        normalizedPlatform.includes(profile.displayName.toLowerCase()),
    ) ?? {
      id: 'generic',
      displayName: platform || '通用平台',
      preferredModes: ['text-to-video', 'image-to-video', 'reference-image'],
      maxFirstPassShots: 2,
      riskTolerance: 'medium',
      handoffNotes: ['平台能力未知，先用低风险短镜头测试', '保留完整分镜队列，避免过早丢弃素材'],
    }
  );
}

export function rankPlatformFirstPassShots(
  shotCards: ShotCard[],
  profile: PlatformCapabilityProfile,
) {
  return [...shotCards]
    .sort((a, b) => {
      const modeDiff =
        profile.preferredModes.indexOf(a.generationMode) - profile.preferredModes.indexOf(b.generationMode);
      if (modeDiff !== 0) return modeDiff;

      const riskDiff = RISK_SCORE[a.riskLevel] - RISK_SCORE[b.riskLevel];
      return riskDiff || a.shotId - b.shotId;
    })
    .slice(0, profile.maxFirstPassShots);
}

export function explainPlatformFirstPassShot(
  shot: ShotCard,
  profile: PlatformCapabilityProfile,
) {
  const reasons = [];
  if (profile.preferredModes.includes(shot.generationMode)) {
    reasons.push('匹配平台偏好模式');
  }
  if (RISK_SCORE[shot.riskLevel] <= RISK_SCORE[profile.riskTolerance]) {
    reasons.push('风险在首轮容忍范围内');
  }
  if (shot.consistencyNeed === 'low' || shot.consistencyNeed === 'medium') {
    reasons.push('一致性压力适中');
  }
  if (shot.fixSuggestion?.trim()) {
    reasons.push('有明确翻车补救建议');
  }

  return reasons.length ? reasons.join('；') : '作为完整队列的一部分保留观察';
}
