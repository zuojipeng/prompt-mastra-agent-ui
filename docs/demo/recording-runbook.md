# 镜词 · Demo 录屏 Runbook

## 生成方式

```bash
npm run demo:record
```

默认输出：

```text
artifacts/demo/jingci-demo.webm
```

## 录屏内容

脚本会自动：

- 启动本地 Next.js。
- Mock DirectorKit、feedback、feedback analytics API。
- 输入 demo 创意。
- 完成创意体检、版本选择、导演执行包流程。
- 展示分镜执行状态。
- 展示反馈洞察。
- 生成 Playwright 浏览器录屏。

## 适用场景

- 项目 README 演示。
- 简历作品集展示。
- 产品汇报。
- 运营讲解视频素材。

## 注意事项

- 录屏使用 mock 数据，不依赖线上模型余额。
- 如果 Playwright 浏览器未安装，先运行：

```bash
npx playwright install chromium
```

- 每次产品 UI 变化后都可以重新运行，生成最新 demo。
