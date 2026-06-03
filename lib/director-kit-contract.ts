export const DIRECTOR_KIT_TARGET_DURATIONS = ['30s', '60s', '90s'] as const;

export const DIRECTOR_KIT_TARGET_TYPES = [
  { id: 'wasteland', label: '废土' },
  { id: 'ancient', label: '古风' },
  { id: 'cyberpunk', label: '赛博朋克' },
  { id: 'wuxia', label: '武侠' },
  { id: 'thriller', label: '悬疑' },
  { id: 'romance', label: '言情' },
  { id: 'scifi', label: '科幻' },
  { id: 'comedy', label: '喜剧' },
] as const;

export type DirectorKitTargetDuration = (typeof DIRECTOR_KIT_TARGET_DURATIONS)[number];
export type DirectorKitTargetType = (typeof DIRECTOR_KIT_TARGET_TYPES)[number]['id'];

export interface CreativeDiagnosis {
  feasibilityScore: number;
  keyRisks: string[];
  riskLevel: 'low' | 'medium' | 'high';
  suggestedAdjustments: string[];
  recommendedDirection: string;
}

export interface ReconstructVersion {
  versionType: 'safest' | 'stylish' | 'cinematic';
  label: string;
  summary: string;
  rewrittenIdea: string;
  whyThisWorks: string;
  reducedRisks: string[];
  bestFor: string;
}

export interface ShotCard {
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
  riskTagDetails?: {
    tag: string;
    impact: string;
    mitigation: string;
  }[];
  stabilityChecklist?: string[];
  fixSuggestion: string;
}

export interface DirectorKit {
  diagnosis: CreativeDiagnosis;
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
    bestFor?: string;
    promptTips?: string[];
    settings?: string[];
    avoid?: string[];
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
