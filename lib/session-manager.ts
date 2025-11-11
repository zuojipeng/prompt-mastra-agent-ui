/**
 * 会话管理器
 * 管理用户ID和会话ID，实现后端记忆功能
 */

const USER_ID_KEY = 'promptUserId';
const SESSION_ID_KEY = 'promptSessionId';

/**
 * 检查是否在浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 生成随机ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取或创建用户ID
 */
export function getUserId(customUserId?: string): string {
  if (!isBrowser()) {
    return 'server-user'; // 服务端返回占位符
  }

  if (customUserId) {
    localStorage.setItem(USER_ID_KEY, customUserId);
    return customUserId;
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = generateId('user');
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

/**
 * 获取当前会话ID
 */
export function getSessionId(): string | null {
  if (!isBrowser()) {
    return null;
  }
  return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * 创建新会话
 */
export function createNewSession(): string {
  if (!isBrowser()) {
    return 'server-session'; // 服务端返回占位符
  }

  const sessionId = generateId('session');
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/**
 * 获取或创建会话ID
 */
export function getOrCreateSessionId(): string {
  if (!isBrowser()) {
    return 'server-session';
  }

  let sessionId = getSessionId();
  
  if (!sessionId) {
    sessionId = createNewSession();
  }
  
  return sessionId;
}

/**
 * 清除当前会话
 */
export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * 清除所有数据
 */
export function clearAll(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * 获取当前会话状态
 */
export function getSessionInfo(): {
  userId: string;
  sessionId: string | null;
  hasSession: boolean;
} {
  if (!isBrowser()) {
    return {
      userId: 'server-user',
      sessionId: null,
      hasSession: false,
    };
  }

  const userId = getUserId();
  const sessionId = getSessionId();
  
  return {
    userId,
    sessionId,
    hasSession: !!sessionId,
  };
}
