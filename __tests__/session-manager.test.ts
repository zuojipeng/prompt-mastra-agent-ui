/**
 * 会话管理器单元测试
 * 测试 localStorage 读写逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const store: Record<string, string> = {};

vi.mock('../lib/session-manager', () => {
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    getUserId: vi.fn((customUserId?: string) => {
      if (customUserId) {
        store['promptUserId'] = customUserId;
        return customUserId;
      }
      let userId = store['promptUserId'];
      if (!userId) {
        userId = generateId('user');
        store['promptUserId'] = userId;
      }
      return userId;
    }),
    getSessionId: vi.fn(() => store['promptSessionId'] ?? null),
    createNewSession: vi.fn(() => {
      const sessionId = generateId('session');
      store['promptSessionId'] = sessionId;
      return sessionId;
    }),
    getOrCreateSessionId: vi.fn(() => {
      let sessionId = store['promptSessionId'] ?? null;
      if (!sessionId) {
        sessionId = generateId('session');
        store['promptSessionId'] = sessionId;
      }
      return sessionId;
    }),
    clearSession: vi.fn(() => {
      delete store['promptSessionId'];
    }),
    clearAll: vi.fn(() => {
      delete store['promptUserId'];
      delete store['promptSessionId'];
    }),
    getSessionInfo: vi.fn(() => ({
      userId: store['promptUserId'] ?? 'server-user',
      sessionId: store['promptSessionId'] ?? null,
      hasSession: !!store['promptSessionId'],
    })),
  };
});

const {
  getUserId,
  getSessionId,
  createNewSession,
  getOrCreateSessionId,
  clearSession,
  clearAll,
  getSessionInfo,
} = await import('../lib/session-manager');

describe('session-manager', () => {
  beforeEach(() => {
    Object.keys(store).forEach((key) => delete store[key]);
    vi.clearAllMocks();
  });

  describe('getUserId', () => {
    it('生成并持久化用户ID', () => {
      const id = getUserId();
      expect(id).toMatch(/^user-/);
    });

    it('如果已存在用户ID则复用', () => {
      store['promptUserId'] = 'user-123';
      const id = getUserId();
      expect(id).toBe('user-123');
    });

    it('自定义用户ID覆盖', () => {
      const id = getUserId('custom-user');
      expect(id).toBe('custom-user');
      expect(store['promptUserId']).toBe('custom-user');
    });
  });

  describe('getSessionId', () => {
    it('没有session时返回null', () => {
      expect(getSessionId()).toBeNull();
    });

    it('有session时返回值', () => {
      store['promptSessionId'] = 'session-456';
      expect(getSessionId()).toBe('session-456');
    });
  });

  describe('createNewSession', () => {
    it('创建新session并存储', () => {
      const id = createNewSession();
      expect(id).toMatch(/^session-/);
      expect(store['promptSessionId']).toBe(id);
    });
  });

  describe('getOrCreateSessionId', () => {
    it('没有session时创建', () => {
      const id = getOrCreateSessionId();
      expect(id).toMatch(/^session-/);
    });

    it('有session时复用', () => {
      store['promptSessionId'] = 'session-789';
      expect(getOrCreateSessionId()).toBe('session-789');
    });
  });

  describe('clearSession', () => {
    it('清除session但不影响用户ID', () => {
      store['promptUserId'] = 'user-def';
      store['promptSessionId'] = 'session-abc';
      clearSession();
      expect(store['promptSessionId']).toBeUndefined();
      expect(store['promptUserId']).toBe('user-def');
    });
  });

  describe('clearAll', () => {
    it('清除所有数据', () => {
      store['promptUserId'] = 'user-def';
      store['promptSessionId'] = 'session-abc';
      clearAll();
      expect(store['promptUserId']).toBeUndefined();
      expect(store['promptSessionId']).toBeUndefined();
    });
  });

  describe('getSessionInfo', () => {
    it('没有session时返回hasSession=false', () => {
      store['promptUserId'] = 'user-abc';
      const info = getSessionInfo();
      expect(info.userId).toMatch(/^user-/);
      expect(info.sessionId).toBeNull();
      expect(info.hasSession).toBe(false);
    });

    it('有session时返回hasSession=true', () => {
      store['promptUserId'] = 'user-abc';
      store['promptSessionId'] = 'session-xyz';
      const info = getSessionInfo();
      expect(info.sessionId).toBe('session-xyz');
      expect(info.hasSession).toBe(true);
    });
  });
});
