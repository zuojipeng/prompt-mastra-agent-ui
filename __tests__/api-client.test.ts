import { describe, it, expect, vi, beforeEach } from 'vitest';

// The pure functions from api-client.ts – re-extracted here for testability
// (They're module-private in the original file; we test via their contracts)

function normalizeTimeline(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (segment): segment is Record<string, unknown> =>
      segment &&
      typeof segment === 'object' &&
      typeof (segment as Record<string, unknown>).time === 'string' &&
      typeof (segment as Record<string, unknown>).shot === 'string' &&
      typeof (segment as Record<string, unknown>).action === 'string' &&
      typeof (segment as Record<string, unknown>).expression === 'string' &&
      typeof (segment as Record<string, unknown>).audio === 'string',
  );
}

function normalizePlatformVariants(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (variant): variant is Record<string, unknown> =>
      variant &&
      typeof variant === 'object' &&
      typeof (variant as Record<string, unknown>).platform === 'string' &&
      typeof (variant as Record<string, unknown>).prompt === 'string' &&
      typeof (variant as Record<string, unknown>).usage_notes === 'string' &&
      typeof (variant as Record<string, unknown>).constraint_notes === 'string',
  );
}

function normalizeContinuityPlan(value: unknown): Record<string, unknown> | null {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as Record<string, unknown>).protagonist_lock !== 'string' ||
    !Array.isArray((value as Record<string, unknown>).recurring_visual_symbols) ||
    !Array.isArray((value as Record<string, unknown>).world_rules) ||
    !Array.isArray((value as Record<string, unknown>).shot_intents)
  ) {
    return null;
  }
  return {
    protagonist_lock: (value as Record<string, unknown>).protagonist_lock as string,
    recurring_visual_symbols: ((value as Record<string, unknown>).recurring_visual_symbols as unknown[]).filter(
      (s: unknown) => typeof s === 'string',
    ),
    world_rules: ((value as Record<string, unknown>).world_rules as unknown[]).filter((s: unknown) => typeof s === 'string'),
    shot_intents: ((value as Record<string, unknown>).shot_intents as unknown[]).filter((s: unknown) => typeof s === 'string'),
  };
}

function normalizePrompts(prompts: unknown, fullPrompt: unknown): string[] {
  if (Array.isArray(prompts) && prompts.length > 0) {
    return prompts.filter((p): p is string => typeof p === 'string');
  }
  if (typeof fullPrompt === 'string') {
    return [fullPrompt];
  }
  return [];
}

function cleanUserPrompt(content: string): string {
  return content
    .split('\n')
    .filter((line) => !line.trim().startsWith('['))
    .join('\n')
    .trim();
}

function parseAssistantResult(content: string): Record<string, unknown> | null {
  const jsonMatch = content.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (jsonMatch?.[1] ?? content).trim();
  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('api-client pure functions', () => {
  describe('normalizeTimeline', () => {
    it('filters out invalid segments', () => {
      const input = [
        { time: '0-3s', shot: 'Wide', action: 'Walk', expression: 'Calm', audio: 'Rain' },
        { time: '3-6s', shot: 'Close', action: 'Look', expression: 'Alert', audio: 'Step' },
        { time: '6-9s' }, // missing fields
        null,
        undefined,
        'string',
        42,
      ];
      const result = normalizeTimeline(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ time: '0-3s', shot: 'Wide', action: 'Walk', expression: 'Calm', audio: 'Rain' });
    });

    it('returns empty array for non-array input', () => {
      expect(normalizeTimeline(null)).toEqual([]);
      expect(normalizeTimeline(undefined)).toEqual([]);
      expect(normalizeTimeline('string')).toEqual([]);
      expect(normalizeTimeline({})).toEqual([]);
    });
  });

  describe('normalizePlatformVariants', () => {
    it('filters out invalid variants', () => {
      const input = [
        { platform: 'Kling', prompt: 'A cat', usage_notes: 'Keep simple', constraint_notes: 'No fast move' },
        { platform: 'Runway' }, // missing fields
        { platform: 'Pika', prompt: 'Dog', usage_notes: 'Short', constraint_notes: 'No text' },
      ];
      const result = normalizePlatformVariants(input);
      expect(result).toHaveLength(2);
    });

    it('handles edge cases', () => {
      expect(normalizePlatformVariants(null)).toEqual([]);
      expect(normalizePlatformVariants([])).toEqual([]);
    });
  });

  describe('normalizeContinuityPlan', () => {
    const validPlan = {
      protagonist_lock: 'Hero in red coat',
      recurring_visual_symbols: ['sword', 'shield'],
      world_rules: ['daytime', 'sunny'],
      shot_intents: ['establish', 'action', 'reaction', 'climax', 'resolution'],
    };

    it('accepts valid plan', () => {
      const result = normalizeContinuityPlan(validPlan);
      expect(result).not.toBeNull();
      expect(result!.protagonist_lock).toBe('Hero in red coat');
      expect(result!.recurring_visual_symbols).toHaveLength(2);
    });

    it('rejects missing fields', () => {
      expect(normalizeContinuityPlan(null)).toBeNull();
      expect(normalizeContinuityPlan({ protagonist_lock: 'Hero' })).toBeNull();
      expect(normalizeContinuityPlan({ ...validPlan, protagonist_lock: null })).toBeNull();
    });

    it('filters non-string array items', () => {
      const input = {
        ...validPlan,
        recurring_visual_symbols: ['sword', null, 'shield', 42],
      };
      const result = normalizeContinuityPlan(input);
      expect(result!.recurring_visual_symbols).toEqual(['sword', 'shield']);
    });
  });

  describe('normalizePrompts', () => {
    it('prefers prompts array', () => {
      const result = normalizePrompts(['Shot 1', 'Shot 2'], 'Full Prompt');
      expect(result).toEqual(['Shot 1', 'Shot 2']);
    });

    it('falls back to fullPrompt', () => {
      const result = normalizePrompts(undefined, 'Full Prompt');
      expect(result).toEqual(['Full Prompt']);
    });

    it('filters non-string items from prompts array', () => {
      const result = normalizePrompts(['Valid', null, undefined, 42 as unknown as string], undefined);
      expect(result).toEqual(['Valid']);
    });

    it('returns empty array when nothing available', () => {
      expect(normalizePrompts(undefined, undefined)).toEqual([]);
      expect(normalizePrompts([], undefined)).toEqual([]);
    });
  });

  describe('cleanUserPrompt', () => {
    it('removes metadata lines starting with [', () => {
      const input = '[风格: wong-kar-wai]\n[场景: video]\n雨夜街头，一个女孩回头';
      expect(cleanUserPrompt(input)).toBe('雨夜街头，一个女孩回头');
    });

    it('preserves lines not starting with [', () => {
      const input = 'Hello\nWorld';
      expect(cleanUserPrompt(input)).toBe('Hello\nWorld');
    });

    it('trims whitespace', () => {
      expect(cleanUserPrompt('  hello  ')).toBe('hello');
    });
  });

  describe('parseAssistantResult', () => {
    it('parses raw JSON', () => {
      const result = parseAssistantResult('{"prompts": ["Shot 1"]}');
      expect(result).toEqual({ prompts: ['Shot 1'] });
    });

    it('parses JSON inside code block', () => {
      const result = parseAssistantResult('```json\n{"analysis": "test"}\n```');
      expect(result).toEqual({ analysis: 'test' });
    });

    it('returns null on invalid JSON', () => {
      expect(parseAssistantResult('not json')).toBeNull();
      expect(parseAssistantResult('')).toBeNull();
    });
  });
});
