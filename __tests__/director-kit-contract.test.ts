import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_KIT_TARGET_DURATIONS,
  DIRECTOR_KIT_TARGET_TYPES,
} from '@/lib/director-kit-contract';

describe('director kit contract', () => {
  it('keeps the supported target durations explicit', () => {
    expect(DIRECTOR_KIT_TARGET_DURATIONS).toEqual(['30s', '60s', '90s']);
  });

  it('keeps target type ids unique and stable', () => {
    const ids = DIRECTOR_KIT_TARGET_TYPES.map((type) => type.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      'wasteland',
      'ancient',
      'cyberpunk',
      'wuxia',
      'thriller',
      'romance',
      'scifi',
      'comedy',
    ]);
  });
});
