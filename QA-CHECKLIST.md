# 镜词 V2 QA 清单

以下任一 P0 项失败即阻塞发布。

## 1. 自动化门禁

```bash
npm run release:v2:check
```

必须通过：
- `npm run build`
- `npx tsc --noEmit`
- `npm run lint`
- `npm test`
- `npm run test:smoke`
- `npm run test:e2e:v2`
- `npm run test:e2e:browser:check`
- `npm run test:e2e:browser`

后端模型预检必须至少一个 provider 可用：

```bash
cd /Users/edy/Desktop/learning/my-prompt-mastra-agent
set -a
source .env
set +a
npm run check:models
```

## 2. V2 核心路径

- [ ] 输入有效创意后出现 loading 状态。
- [ ] 创意体检报告可见。
- [ ] 三个重构版本可见。
- [ ] 未选择版本时确认按钮 disabled。
- [ ] 鼠标点击可选择版本。
- [ ] 键盘方向键可切换版本。
- [ ] 选择版本后可生成导演执行包。
- [ ] 导演执行包包含故事设定、分镜卡片、主 prompt、平台建议、后期建议、风险补救。

## 3. 错误恢复

- [ ] 空输入提交时提示 `请输入视频创意`。
- [ ] API 失败后显示错误提示。
- [ ] API 失败后原输入仍保留。
- [ ] `重试生成` 可恢复流程。
- [ ] `返回修改` 不清空原输入。

## 4. 移动端

- [ ] 目标时长和类型按钮不会溢出。
- [ ] 重构卡片纵向堆叠且可读。
- [ ] 结果页长文本不横向溢出。
- [ ] 主要按钮在小屏上可点击。

## 5. 线上验证

- [ ] 前端 production URL 可访问。
- [ ] 后端 `/api/health` 返回成功。
- [ ] 后端 `npm run check:models` 至少一个 provider 可用。
- [ ] V2 live API E2E 通过。
- [ ] 浏览器控制台无阻塞级错误。
- [ ] CORS 配置允许当前前端域名。

## 6. 发布结论

发布前记录：

```text
Commit:
Frontend URL:
Backend URL:
release:v2:check:
Health check:
Known risks:
Rollback needed: yes/no
```
