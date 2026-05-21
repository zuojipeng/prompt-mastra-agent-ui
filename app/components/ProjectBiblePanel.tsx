'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectBible } from '@/lib/api-client';

const STORAGE_KEY = 'project-bible-presets';

interface Preset {
  name: string;
  bible: ProjectBible;
}

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePresets(presets: Preset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch { /* quota exceeded, ignore */ }
}

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ label, placeholder, tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInput('');
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
        >
          添加
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="text-indigo-400 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}

function TextField({ label, placeholder, value, onChange, multiline }: TextFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      )}
    </div>
  );
}

export function ProjectBiblePanel({
  bible,
  onChange,
  onSmartExtract,
  smartExtractLoading,
  creativeInput,
}: {
  bible: ProjectBible;
  onChange: (bible: ProjectBible) => void;
  onSmartExtract?: () => void;
  smartExtractLoading?: boolean;
  creativeInput?: string;
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  // Load presets on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  // Close preset menu on click outside
  useEffect(() => {
    if (!showPresetMenu) return;
    const handler = (e: MouseEvent) => {
      if (presetMenuRef.current && !presetMenuRef.current.contains(e.target as Node)) {
        setShowPresetMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPresetMenu]);

  // Focus name input when shown
  useEffect(() => {
    if (showSaveInput) saveInputRef.current?.focus();
  }, [showSaveInput]);

  const handleSavePreset = () => {
    const name = presetName.trim();
    if (!name || !hasAnyValue) return;
    const updated = [...presets, { name, bible: { ...bible } }];
    setPresets(updated);
    savePresets(updated);
    setPresetName('');
    setShowSaveInput(false);
  };

  const handleLoadPreset = (preset: Preset) => {
    onChange({ ...preset.bible });
    setShowPresetMenu(false);
  };

  const handleDeletePreset = (index: number) => {
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    savePresets(updated);
  };

  const hasAnyValue =
    bible.protagonist ||
    bible.mission ||
    bible.world ||
    (bible.visualSymbols?.length ?? 0) > 0 ||
    bible.lookAndFeel ||
    (bible.continuityRules?.length ?? 0) > 0 ||
    bible.shotIntent;

  const fieldCount = [
    bible.protagonist,
    bible.mission,
    bible.world,
    bible.lookAndFeel,
    bible.shotIntent,
  ].filter(Boolean).length +
    (bible.visualSymbols?.length ?? 0) +
    (bible.continuityRules?.length ?? 0);

  return (
    <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            📖 高级导演模式
          </span>
          {onSmartExtract && creativeInput && (
            <button
              type="button"
              onClick={onSmartExtract}
              disabled={smartExtractLoading || !creativeInput.trim()}
              className="text-xs px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-40 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-1"
            >
              {smartExtractLoading ? (
                <><span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full inline-block animate-spin" /> 提取中</>
              ) : (
                <>✨ 智能提取</>
              )}
            </button>
          )}
          {hasAnyValue && (
            <span className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
              已填 {fieldCount} 项
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Preset save/load */}
          <div className="relative" ref={presetMenuRef}>
            <button
              type="button"
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="text-xs px-2 py-1 rounded-md text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
            >
              📋 预设
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                {presets.length > 0 && (
                  <div className="px-2 py-1 text-[10px] text-gray-400 uppercase tracking-wider">加载预设</div>
                )}
                {presets.map((p, i) => (
                  <div key={i} className="flex items-center px-2 py-1 group">
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(p)}
                      className="flex-1 text-left px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(i)}
                      className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-xs text-gray-400 hover:text-red-500 transition-all"
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1 px-2">
                  {showSaveInput ? (
                    <div className="flex gap-1 items-center px-1 pb-1">
                      <input
                        ref={saveInputRef}
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        placeholder="预设名称"
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        disabled={!presetName.trim() || !hasAnyValue}
                        className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSaveInput(true)}
                      disabled={!hasAnyValue}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      + 保存当前为预设
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          {hasAnyValue && (
          <button
            type="button"
            onClick={() =>
              onChange({
                protagonist: '',
                mission: '',
                world: '',
                visualSymbols: [],
                lookAndFeel: '',
                continuityRules: [],
                shotIntent: '',
              })
            }
            className="text-xs px-2 py-1 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            清空
          </button>
        )}
      </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="主角设定"
          placeholder="如：一个穿深色雨衣、打透明伞的女孩，25岁左右"
          value={bible.protagonist ?? ''}
          onChange={(v) => onChange({ ...bible, protagonist: v })}
        />
        <TextField
          label="角色任务"
          placeholder="如：在雨夜中寻找失踪的弟弟"
          value={bible.mission ?? ''}
          onChange={(v) => onChange({ ...bible, mission: v })}
        />
      </div>

      <TextField
        label="世界观"
        placeholder="如：近未来中国某南方城市，常年下雨，霓虹灯牌密布"
        value={bible.world ?? ''}
        onChange={(v) => onChange({ ...bible, world: v })}
        multiline
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="统一视觉风格"
          placeholder="如：王家卫式的饱和色彩、青橙互补色调"
          value={bible.lookAndFeel ?? ''}
          onChange={(v) => onChange({ ...bible, lookAndFeel: v })}
        />
        <TextField
          label="镜头目的"
          placeholder="如：建立悬疑氛围，为后续冲突做铺垫"
          value={bible.shotIntent ?? ''}
          onChange={(v) => onChange({ ...bible, shotIntent: v })}
        />
      </div>

      <TagInput
        label="视觉符号（固定元素，跨镜头重复出现）"
        placeholder="如：透明伞"
        tags={bible.visualSymbols ?? []}
        onChange={(tags) => onChange({ ...bible, visualSymbols: tags })}
      />

      <TagInput
        label="连续性规则"
        placeholder="如：雨量始终保持中雨大小"
        tags={bible.continuityRules ?? []}
        onChange={(tags) => onChange({ ...bible, continuityRules: tags })}
      />

      {/* Best practice guide */}
      <div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors"
        >
          <span>{showGuide ? '▼' : '▶'}</span>
          填写指南 & 最佳实践
        </button>
        {showGuide && (
          <div className="mt-3 space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-white dark:bg-gray-900 p-3">
              <p className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                🌧 最佳实践示例：《雨夜追踪》
              </p>
              <div className="space-y-1.5">
                <p><span className="font-medium text-gray-900 dark:text-gray-100">创意：</span>雨夜街头，一个女孩听见身后脚步声后缓慢回头</p>
                <div className="grid gap-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">主角：</span>穿深灰色连帽雨衣的短发女孩，眼神疲惫而警惕</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">任务：</span>在雨夜中寻找失踪的弟弟</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">世界观：</span>近未来南方城市，常年下雨，老旧街巷密布霓虹灯牌</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">视觉符号：</span>透明雨伞、红蓝霓虹倒影</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">风格：</span>赛博朋克 + 王家卫：青橙互补色，大量水面镜面反射</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">镜头目的：</span>建立悬念 → 紧张升级 → 情绪爆发 → 余韵收尾</p>
                  <p><span className="font-medium text-gray-900 dark:text-gray-100">连续性规则：</span>雨量始终保持中雨、主光源来自霓虹灯</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
              <p className="font-medium text-amber-700 dark:text-amber-400">💡 核心原则</p>
              <p>• 主角要「可锁定」：有颜色、有服装、有情绪</p>
              <p>• 世界观要「有质感」：不止「下雨的街道」，而是怎样的街道</p>
              <p>• 视觉符号≤3个：太多 AI 顾此失彼</p>
              <p>• 连续性规则锁定易错项：角色外观不变、光影统一</p>
              <p>• 风格可以混搭：「赛博朋克+王家卫」比单一风格更有辨识度</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
