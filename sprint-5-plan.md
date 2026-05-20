# Sprint 5 — Prompt 模板管理 + 批量导出 + 差异对比

## 完成状态

### P0: Prompt 模板 + 快速启动 ✅
- 6 个即用模板：雨中叙事/古风武侠/赛博都市/西部荒漠/韦斯·安德森/美食诱惑
- 点击自动填充输入框 + 风格 + 镜头数
- 仅首次打开时显示（input 为空时），不干扰已有输入
- 支持 `handleApplyTemplate()` 一键重置

### P0: 批量导出 ✅
- 生成结果区增加「📦 批量导出 ▼」下拉菜单
- 支持所有平台（小云雀/Seedance/Kling/Runway/Pika/Sora）
- 格式：每个镜头带 `【镜头 N】` 标签 + 平台特定格式处理
- 点击外部自动关闭
- 提取 `formatForPlatform()` 共享函数（单卡导出 + 批量导出共用）

### P1: Prompt 差异对比 ✅
- Refinement 后 PromptCard 自动显示「查看原版」按钮（琥珀色）
- 点击展开 inline diff：原版+删除线（琥珀底色） vs 新版（绿底色）
- 「恢复到此版本」按钮可回退
- 单层历史追踪（每次 refinement 保存上一版本）

## 待办
- P2: 后端 session 版本历史 + 部署 refinement fix
  - 需要用户提供 CLOUDFLARE_API_TOKEN

## 提交记录
```
cbc9d31 P0: template chips + batch export
1a0c58e P1: prompt diff view
```
