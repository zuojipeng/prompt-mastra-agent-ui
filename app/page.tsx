import { ChatBox } from './components/ChatBox';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Minimal Header */}
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-[1680px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                镜词
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                · 即兴创作搭档
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              DeepSeek
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1680px] mx-auto px-4 py-5">
        <ChatBox />
      </main>
    </div>
  );
}
