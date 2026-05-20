'use client';

import { useState } from 'react';
import type { ProjectBible } from '@/lib/api-client';

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
}: {
  bible: ProjectBible;
  onChange: (bible: ProjectBible) => void;
}) {
  const [showGuide, setShowGuide] = useState(false);
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
          {hasAnyValue && (
            <span className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
              已填 {fieldCount} 项
            </span>
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
