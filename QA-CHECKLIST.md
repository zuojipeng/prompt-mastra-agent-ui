# QA 验收标准

以下任何一项不通过则阻塞发布。

## 1. 构建检查 (`npm run build`)
- [x] `next build` 无错误退出
- [x] 包大小不超过 200 KB (First Load JS: 114 KB)

## 2. 类型检查 (`npx tsc --noEmit`)
- [x] 源文件（不含 node_modules）无 TypeScript 错误

## 3. Lint 检查 (`npm run lint`)
- [x] 0 errors, 9 pre-existing warnings

## 4. 单元测试 (`npm run test`)
- [x] 全部 29 tests 通过（api-client: 17, session-manager: 12）

## 5. 冒烟测试 (`npm run test:smoke`)
- [x] Stage 1: 静态 HTML 包含关键文本
- [x] Stage 2: JS bundle 包含所有功能字符串
- [x] Stage 3: 包大小在合理范围 (48.2 KB)

## 6. PWA
- [x] manifest.json 存在
- [x] 可安装到桌面

## 7. 新手引导
- [x] 首次访问显示 3 步引导浮层
- [x] 步骤逐步推进：输入 → 生成 → 复制
- [x] 完成复制后自动关闭
- [x] "跳过"按钮可手动关闭

## 8. 手动验收（浏览器）

### 核心功能
- [ ] 页面加载不报错（控制台无红色错误）
- [ ] 输入框输入文字，提交后生成提示词
- [ ] 多镜头（3镜/5镜）生成正常
- [ ] 风格选择生效

### 导演模式
- [ ] 导演模式展开/收起，填字段后提交

### 交互功能
- [ ] 复制按钮工作
- [ ] 导出到各平台功能正常
- [ ] 批量导出功能正常
- [ ] 新手引导逐步推进正确

### 历史与反馈
- [ ] 历史记录加载/继续/复制正常
- [ ] 点赞/踩反馈功能正常

### 视觉
- [ ] 夜间模式正常
- [ ] 移动端适配正常
