import { ChatBox } from './components/ChatBox';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* ── Hero ── */}
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  镜词
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                  AI 视频提示词工坊
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                DeepSeek 在线
              </span>
              <a
                href="https://xyq.jianying.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hidden sm:block"
              >
                小云雀
              </a>
              <a
                href="https://seedance.cn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hidden sm:block"
              >
                Seedance
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ── Value Prop ── */}
        <div className="text-center mb-8 sm:mb-12 space-y-3 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            输入一句话创意
            <span className="block sm:inline text-emerald-600 dark:text-emerald-400">
              秒出专业中文画面描述
            </span>
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
            专为中文 AI 视频创作者打造。把你的灵感拆解成可直接用于
            Seedance、小云雀、可灵、Runway 等多平台的中文提示词。
          </p>
        </div>

        {/* ── Feature Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 sm:mb-12 max-w-3xl mx-auto">
          {[
            { icon: '🎯', title: '中文原生', desc: '纯中文画面描述，告别生硬翻译' },
            { icon: '🎬', title: '多镜头叙事', desc: '1/3/5 镜连续叙事，景别变化' },
            { icon: '🎨', title: '导演模式', desc: '主角/世界观/风格统一控制' },
            { icon: '🚀', title: '一键导出', desc: '适配 6 大 AI 视频平台' },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 text-center hover:shadow-sm transition-shadow"
            >
              <span className="text-xl sm:text-2xl block mb-1">{f.icon}</span>
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                {f.title}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* ── Chat Box ── */}
        <div className="max-w-4xl mx-auto">
          <ChatBox />
        </div>

        {/* ── Supported Platforms ── */}
        <div className="mt-12 sm:mt-16 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            适配主流 AI 视频生成平台
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {[
              { name: '小云雀', icon: '🎬' },
              { name: 'Seedance', icon: '🎞' },
              { name: '可灵 Kling', icon: '🎥' },
              { name: 'Runway Gen-3', icon: '🎬' },
              { name: 'Pika', icon: '✨' },
              { name: 'OpenAI Sora', icon: '🤖' },
            ].map((p) => (
              <span key={p.name} className="inline-flex items-center gap-1">
                <span>{p.icon}</span>
                {p.name}
              </span>
            ))}
          </div>
        </div>

        <footer className="mt-12 sm:mt-16 text-center text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>
            生成结果由 <span className="font-medium text-gray-500 dark:text-gray-400">DeepSeek</span>{' '}
            驱动 · 提示词仅供创作参考
          </p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600">
            镜词 · AI 视频提示词工坊 · 让每个创意都找到最好的画面
          </p>
        </footer>
      </main>
    </div>
  );
}
