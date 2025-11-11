'use client';

import { useState } from 'react';
import { optimizePrompt } from '@/lib/api-client';
import { OptimizationResult } from '@/lib/prompt-optimizer';

export function ChatBox() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) {
      setError('请输入提示词');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const optimization = await optimizePrompt(input);
      setResult(optimization);
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板！');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 输入区域 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            输入你的提示词
          </label>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：帮我写一个关于猫的故事..."
            className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              优化中...
            </>
          ) : (
            '✨ 优化提示词'
          )}
        </button>
      </form>

      {/* 结果展示 */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* 推荐工具 */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎯</span>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">推荐 AI 工具</h3>
            </div>
            <p className="text-lg font-medium text-purple-600 dark:text-purple-400">{result.targetTool}</p>
          </div>

          {/* 优化后的提示词 */}
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">优化后的提示词</h3>
              </div>
              <button
                onClick={() => copyToClipboard(result.optimizedPrompt)}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                📋 复制
              </button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {result.optimizedPrompt}
              </p>
            </div>
          </div>

          {/* 优化理由 */}
          {result.reasoning && (
            <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💡</span>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">优化理由</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{result.reasoning}</p>
            </div>
          )}

          {/* 改进建议 */}
          {result.suggestions && result.suggestions.length > 0 && (
            <div className="p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📝</span>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">改进建议</h3>
              </div>
              <ul className="space-y-3">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{suggestion}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 原始提示词对比 */}
          <details className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span>📊</span> 查看原始提示词对比
            </summary>
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">原始输入：</p>
              <p className="text-gray-700 dark:text-gray-300 italic">{result.originalPrompt}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

