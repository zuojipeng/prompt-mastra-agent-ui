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
                生成时间轴、镜头细节、主 prompt、负向词和平台适配版本
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              记忆与历史已接入
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ChatBox />

        <section className="mt-10 grid md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">输入视频创意</div>
            <p className="text-gray-600 dark:text-gray-400">一句画面描述即可，例如雨夜街头、角色动作、情绪氛围。</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">生成分镜套件</div>
            <p className="text-gray-600 dark:text-gray-400">自动拆出时间轴、镜头、动作、表情、声音和完整英文 prompt。</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">复制平台版本</div>
            <p className="text-gray-600 dark:text-gray-400">按 Kling、Runway、Pika、Sora、Seedance 选择最合适的版本。</p>
          </div>
        </section>
      </main>
    </div>
  );
}
