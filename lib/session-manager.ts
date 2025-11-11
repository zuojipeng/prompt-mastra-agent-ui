/**
 * 会话管理器
 * 管理用户ID和会话ID，实现后端记忆功能
 */

const USER_ID_KEY = 'promptUserId';
const SESSION_ID_KEY = 'promptSessionId';

/**
 * 生成随机ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取或创建用户ID
 * 如果有登录系统，应该传入用户的真实ID
 * 如果没有登录，会在浏览器生成一个随机ID并存到localStorage
 */
export function getUserId(customUserId?: string): string {
  // 如果传入了自定义用户ID（比如来自登录系统），使用它
  if (customUserId) {
    localStorage.setItem(USER_ID_KEY, customUserId);
    return customUserId;
  }

  // 尝试从 localStorage 获取
  let userId = localStorage.getItem(USER_ID_KEY);
  
  // 如果不存在，生成新的
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
  return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * 创建新会话
 * 在开始新对话时调用
 */
export function createNewSession(): string {
  const sessionId = generateId('session');
  localStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

/**
 * 获取或创建会话ID
 * 如果当前没有会话，会自动创建一个
 */
export function getOrCreateSessionId(): string {
  let sessionId = getSessionId();
  
  if (!sessionId) {
    sessionId = createNewSession();
  }
  
  return sessionId;
}

/**
 * 清除当前会话
 * 在想要开始全新对话时调用
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * 清除所有数据（包括用户ID和会话ID）
 * 慎用：这会清除用户的所有记忆
 */
export function clearAll(): void {
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
  const userId = getUserId();
  const sessionId = getSessionId();
  
  return {
    userId,
    sessionId,
    hasSession: !!sessionId,
  };
}

