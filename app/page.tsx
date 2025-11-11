import { ChatBox } from './components/ChatBox';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🤖</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                AI 智能提示词优化器
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                让 AI 工具更懂你的需求
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* 介绍卡片 */}
        <div className="mb-12 p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            ✨ 这个工具能帮你做什么？
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">精准理解</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                分析你的真实意图，理解你想要什么
              </p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <div className="text-2xl mb-2">🔧</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">智能优化</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                针对不同 AI 工具优化提示词表达
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl mb-2">📚</div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">专业建议</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                提供具体的改进建议和使用技巧
              </p>
            </div>
          </div>
        </div>

        {/* 聊天区域 */}
        <ChatBox />

        {/* 示例提示 */}
        <div className="mt-12 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <span>💡</span> 试试这些例子
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              "帮我写一个关于产品的营销文案"
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              "生成一个登录页面的代码"
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              "画一只可爱的猫咪"
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              "分析这段代码的性能问题"
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>由 OpenAI 驱动 | 让 AI 工具发挥最大价值</p>
        </div>
      </footer>
    </div>
  );
}
