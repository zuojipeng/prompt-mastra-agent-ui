/**
 * API 客户端
 * 连接到 Cloudflare Workers 后端服务
 */

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
 */
export async function optimizePrompt(prompt: string): Promise<OptimizationResult> {
  const apiUrl = getApiUrl();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
