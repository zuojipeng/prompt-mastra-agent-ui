import { ChatBox } from './components/ChatBox';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Seedance 视频创作搭档
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                输入创意，生成可直接用的提示词
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <ChatBox />
      </main>
    </div>
  );
}
