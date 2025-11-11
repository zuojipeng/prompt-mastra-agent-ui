/**
 * API 客户端
 * 连接到 Cloudflare Workers 后端服务
 * 支持记忆功能（通过 User-Id 和 Session-Id）
 */

import { getUserId, getOrCreateSessionId } from './session-manager';

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: string[];
  targetTool: string;
  reasoning: string;
}

/**
 * 后端 API 响应格式
 */
interface ApiResponse {
  data: {
    optimizedPrompt: string;
    targetTool?: string;
    suggestions?: string[];
    reasoning?: string;
    originalPrompt?: string;
  };
}

/**
 * 获取后端 API 地址
 */
const getApiUrl = () => {
  // 优先使用环境变量配置的 API 地址
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 默认使用 Cloudflare Workers 地址
  return 'https://prompt-optimizer.hahazuo460.workers.dev/api/optimize';
};

/**
 * 优化提示词
 * 调用 Cloudflare Workers 后端 API
 * 自动添加用户ID和会话ID实现记忆功能
 */
export async function optimizePrompt(prompt: string): Promise<OptimizationResult> {
  const apiUrl = getApiUrl();
  
  // 获取或创建用户ID和会话ID
  const userId = getUserId();
  const sessionId = getOrCreateSessionId();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,        // 用户唯一ID（记忆用户身份）
        'X-Session-Id': sessionId,  // 会话ID（区分不同对话）
      },
      body: JSON.stringify({
        message: prompt
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const result: ApiResponse = await response.json();
    
    // 构造标准格式返回
    return {
      originalPrompt: result.data.originalPrompt || prompt,
      optimizedPrompt: result.data.optimizedPrompt,
      suggestions: result.data.suggestions || [],
      targetTool: result.data.targetTool || 'ChatGPT',
      reasoning: result.data.reasoning || '',
    };
    
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error) {
      throw new Error(`优化失败: ${error.message}`);
    }
    
    throw new Error('优化失败: 未知错误');
  }
}
