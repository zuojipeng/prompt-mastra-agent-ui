/**
 * API 客户端
 * 连接到独立的后端服务
 */

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: string[];
  targetTool: string;
  reasoning: string;
}

/**
 * 获取后端 API 地址
 * 从环境变量读取，支持本地开发和生产环境
 */
const getApiUrl = () => {
  // 优先使用环境变量配置的 API 地址
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 本地开发默认地址
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001'; // 假设后端运行在 3001 端口
  }
  
  // 生产环境需要配置
  throw new Error('请配置 NEXT_PUBLIC_API_URL 环境变量');
};

/**
 * 优化提示词
 * 调用后端 API
 */
export async function optimizePrompt(prompt: string): Promise<OptimizationResult> {
  const apiUrl = getApiUrl();
  
  const response = await fetch(`${apiUrl}/api/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

