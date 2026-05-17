# AI 视频分镜 Prompt 工作台

这是 AI 视频分镜 Prompt 工作台的前端应用。用户输入一句视频创意后，应用会请求服务端生成 15 秒分镜时间轴、完整 positive prompt、negative prompt、平台适配版本和后续优化建议。

## 功能

- 视频创意输入
- 导演/视觉风格选择
- 15 秒分镜时间轴展示
- Positive prompt 与 negative prompt 一键复制
- Kling、Runway、Pika、Sora、Seedance 平台适配版本
- 会话 ID 与用户 ID 自动管理
- 响应式界面和深色模式

## 本地开发

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 环境变量

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787/api/optimize
```

如果不配置，应用会使用内置的默认 API 地址。正式构建时建议显式设置 `NEXT_PUBLIC_API_URL`。

## API 契约

前端请求：

```json
{
  "message": "雨夜街头，一个女孩停在霓虹招牌下，听见身后脚步声后缓慢回头",
  "scenario": "video",
  "style": "wong-kar-wai"
}
```

前端期望响应：

```json
{
  "success": true,
  "data": {
    "originalPrompt": "原始输入",
    "scenario": "video",
    "style": "wong-kar-wai",
    "result": {
      "analysis": "创意诊断",
      "timeline": [
        {
          "time": "0-3s",
          "shot": "镜头设计",
          "action": "动作",
          "expression": "表情",
          "audio": "声音"
        }
      ],
      "full_prompt": "完整英文 positive prompt",
      "negative_prompt": "负向提示词",
      "versions": [
        {
          "style": "15秒分镜版",
          "positive_prompt": "兼容版本 prompt",
          "negative_prompt": "兼容版本 negative prompt",
          "reasoning": "设计理由"
        }
      ],
      "platform_variants": [
        {
          "platform": "Kling",
          "prompt": "平台适配 prompt",
          "usage_notes": "使用建议",
          "constraint_notes": "限制提醒"
        }
      ],
      "suggestions": ["下一步优化建议"]
    }
  }
}
```

## 项目结构

```text
.
├── app/
│   ├── components/
│   │   └── ChatBox.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── api-client.ts
│   └── session-manager.ts
├── package.json
└── next.config.ts
```

## 质量门槛

```bash
npm run lint
npm run build
```

每次发布前至少确认：

- 首页文案是 AI 视频分镜 Prompt 工作台
- 输入视频创意后可以成功生成结果
- 时间轴、主 prompt、负向词、平台适配版本都能渲染
- 复制按钮可用
- 移动端和桌面端没有明显布局溢出
