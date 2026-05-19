import { ChatBox } from './components/ChatBox';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI 视频分镜 Prompt 工作台
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                输入创意，秒出中文画面描述，直接复制到小云雀生成视频
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              已接入 DeepSeek
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ChatBox />

        <footer className="mt-16 text-center text-xs text-gray-400 dark:text-gray-500">
          生成结果由 DeepSeek 驱动 · 提示词仅供创作参考
        </footer>
      </main>
    </div>
  );
}
