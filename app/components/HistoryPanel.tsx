'use client';

import { useEffect, useRef, useState } from 'react';
import type { HistoryRecord } from '@/lib/api-client';

const FAVORITES_KEY = 'prompt-favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch { /* ignore */ }
}

export function HistoryPanel({
  history,
  loading,
  error,
  onRefresh,
  onContinue,
  onCopy,
}: {
  history: HistoryRecord[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onContinue: (record: HistoryRecord) => void;
  onCopy: (text: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const filtered = history
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.userPrompt?.toLowerCase().includes(q)) ||
        r.result?.prompts?.some((p) => p.toLowerCase().includes(q)) ||
        r.result?.fullPrompt?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Favorites first, then by time desc
      const aFav = favorites.has(String(a.timestamp)) ? 1 : 0;
      const bFav = favorites.has(String(b.timestamp)) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return b.timestamp - a.timestamp;
    });

  const display = showAll ? filtered : filtered.slice(0, 5);

  const toggleFav = (ts: number) => {
    const key = String(ts);
    const next = new Set(favorites);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setFavorites(next);
    saveFavorites(next);
  };

  const isFav = (ts: number) => favorites.has(String(ts));

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            历史记录
            {favorites.size > 0 && (
              <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                {favorites.size} ★
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            查看最近生成记录，复制结果或带回输入区。
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {loading ? '读取中...' : '刷新'}
        </button>
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="mt-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索历史记录..."
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      {!loading && history.length === 0 && !error && (
        <p className="mt-4 rounded-md bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-gray-950 dark:text-gray-400">
          当前会话还没有历史记录。生成一次提示词后，这里会显示最近结果。
        </p>
      )}

      {history.length > 0 && filtered.length === 0 && (
        <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
          没有匹配「{search}」的记录
        </p>
      )}

      {display.length > 0 && (
        <div className="mt-4 grid gap-3">
          {display.map((record) => (
            <article
              key={record.timestamp}
              className={`rounded-lg border p-3 dark:border-gray-800 ${
                isFav(record.timestamp)
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFav(record.timestamp)}
                      className="text-xs leading-none hover:scale-110 transition-transform"
                      title={isFav(record.timestamp) ? '取消收藏' : '收藏'}
                    >
                      {isFav(record.timestamp) ? '⭐' : '☆'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {new Date(record.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {record.userPrompt || '未识别到原始输入'}
                  </p>
                  {record.result ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {record.result.prompts?.length || (record.result.fullPrompt ? 1 : 0)} 条提示词
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                      旧记录无法解析结构化结果
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onContinue(record)}
                    className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    继续
                  </button>
                  {record.result?.fullPrompt ? (
                    <button
                      type="button"
                      onClick={() => onCopy(record.result?.fullPrompt ?? '')}
                      className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      复制
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Show all / collapse */}
      {filtered.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors py-2"
        >
          {showAll ? '收起' : `查看全部 ${filtered.length} 条记录`}
        </button>
      )}
    </section>
  );
}
