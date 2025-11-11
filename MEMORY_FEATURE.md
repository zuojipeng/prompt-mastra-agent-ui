# 🧠 记忆功能说明

## ✨ 新增功能

后端现已支持**记忆功能**，可以记住用户身份和对话历史！

前端已自动集成，无需额外配置即可使用。

---

## 🎯 工作原理

### 1. 用户ID（X-User-Id）

**目的**：识别用户身份，跨会话记忆

**实现方式**：
- 首次访问时，在浏览器生成唯一ID
- 存储在 `localStorage` 中
- 所有请求自动携带此ID

**生成规则**：
```javascript
// 示例：user-1731312000000-abc123def
`user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

**使用场景**：
- 记住用户的使用习惯
- 跨会话的长期记忆
- 个性化优化建议

### 2. 会话ID（X-Session-Id）

**目的**：区分不同对话

**实现方式**：
- 每个对话有独立的会话ID
- 点击"新建对话"生成新ID
- 同一对话保持相同ID

**生成规则**：
```javascript
// 示例：session-1731312000000-xyz789abc
`session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

**使用场景**：
- 区分不同的对话主题
- 上下文连续性
- 多窗口独立对话

---

## 🚀 使用方式

### 自动工作（无需配置）

前端已自动实现，用户无需任何操作：

1. **首次访问**
   - 自动生成用户ID
   - 自动生成会话ID
   - 存储在浏览器本地

2. **后续使用**
   - 自动使用已有用户ID
   - 自动使用当前会话ID
   - 所有请求自动携带

3. **新建对话**
   - 点击"🔄 新建对话"按钮
   - 生成新的会话ID
   - 用户ID保持不变

---

## 💡 前端实现

### 请求 Headers

每次调用 API 时，自动添加：

```javascript
headers: {
  'Content-Type': 'application/json',
  'X-User-Id': 'user-1731312000000-abc123def',      // 用户唯一ID
  'X-Session-Id': 'session-1731312000000-xyz789abc'  // 会话ID
}
```

### 会话管理器

文件：`lib/session-manager.ts`

**核心函数**：

```typescript
// 获取或创建用户ID
getUserId(): string

// 获取当前会话ID
getSessionId(): string | null

// 创建新会话
createNewSession(): string

// 获取或创建会话ID
getOrCreateSessionId(): string

// 清除当前会话
clearSession(): void

// 清除所有数据
clearAll(): void

// 获取会话信息
getSessionInfo(): { userId, sessionId, hasSession }
```

### API 客户端

文件：`lib/api-client.ts`

```typescript
export async function optimizePrompt(prompt: string) {
  // 自动获取 ID
  const userId = getUserId();
  const sessionId = getOrCreateSessionId();
  
  // 发送请求
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Session-Id': sessionId,
    },
    body: JSON.stringify({ message: prompt })
  });
  
  // ...
}
```

### UI 组件

文件：`app/components/ChatBox.tsx`

**新增功能**：
- ✅ 显示"已启用记忆功能"状态
- ✅ "🔄 新建对话"按钮
- ✅ 点击新建对话清空当前结果
- ✅ 自动管理会话状态

---

## 📊 存储位置

### localStorage 存储

```javascript
// 用户ID
localStorage.getItem('promptUserId')
// 示例：user-1731312000000-abc123def

// 会话ID
localStorage.getItem('promptSessionId')
// 示例：session-1731312000000-xyz789abc
```

### 查看存储数据

在浏览器控制台运行：

```javascript
// 查看用户ID
console.log(localStorage.getItem('promptUserId'));

// 查看会话ID
console.log(localStorage.getItem('promptSessionId'));

// 查看所有
console.log({
  userId: localStorage.getItem('promptUserId'),
  sessionId: localStorage.getItem('promptSessionId')
});
```

---

## 🎨 UI 变化

### 新增元素

1. **记忆状态指示器**
   ```
   🟢 已启用记忆功能
   ```

2. **新建对话按钮**
   ```
   🔄 新建对话
   ```

### 位置

位于页面标题下方，输入框上方。

---

## 🧪 测试场景

### 场景 1：首次访问

1. 打开应用
2. 输入提示词优化
3. 打开浏览器控制台
4. 运行：
   ```javascript
   console.log({
     userId: localStorage.getItem('promptUserId'),
     sessionId: localStorage.getItem('promptSessionId')
   });
   ```
5. 应该看到自动生成的 ID

### 场景 2：同一会话

1. 输入第一个提示词："写一篇文章"
2. 查看优化结果
3. 输入第二个提示词："继续优化"
4. 后端应该能记住第一次的上下文
5. 会话ID保持不变

### 场景 3：新建对话

1. 点击"🔄 新建对话"按钮
2. 输入新提示词
3. 后端应该开始新的对话
4. 会话ID已更新
5. 用户ID保持不变

### 场景 4：刷新页面

1. 刷新浏览器
2. 用户ID保持不变
3. 会话ID保持不变
4. 继续之前的对话

### 场景 5：跨浏览器

1. 在不同浏览器打开
2. 每个浏览器有独立的用户ID
3. 互不影响

---

## 🔍 调试工具

### 在浏览器控制台运行

```javascript
// 1. 导入会话管理器（仅用于调试）
import { getSessionInfo, createNewSession, clearAll } from './lib/session-manager';

// 2. 查看当前会话信息
getSessionInfo();
// 输出：{ userId: '...', sessionId: '...', hasSession: true }

// 3. 创建新会话
createNewSession();

// 4. 清除所有数据（慎用）
clearAll();
```

### 网络请求监控

打开浏览器开发者工具 → Network：

1. 找到 `/api/optimize` 请求
2. 查看 Request Headers
3. 确认存在：
   - `X-User-Id: user-...`
   - `X-Session-Id: session-...`

---

## ⚙️ 高级用法

### 自定义用户ID

如果你有登录系统，可以使用真实的用户ID：

```typescript
import { getUserId } from '@/lib/session-manager';

// 登录后设置用户ID
const realUserId = 'user-12345'; // 来自你的登录系统
getUserId(realUserId);
```

### 手动创建会话

```typescript
import { createNewSession } from '@/lib/session-manager';

// 在需要时手动创建新会话
const newSessionId = createNewSession();
console.log('新会话ID:', newSessionId);
```

### 清除会话

```typescript
import { clearSession } from '@/lib/session-manager';

// 清除当前会话（保留用户ID）
clearSession();
```

### 完全重置

```typescript
import { clearAll } from '@/lib/session-manager';

// 清除所有数据（包括用户ID和会话ID）
clearAll();
```

---

## 📋 后端 API 规范

### 请求格式

```bash
curl https://prompt-optimizer.hahazuo460.workers.dev/api/optimize \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user-1731312000000-abc123def" \
  -H "X-Session-Id: session-1731312000000-xyz789abc" \
  -d '{"message":"写一篇文章"}'
```

### Headers 说明

| Header | 必需 | 说明 | 示例 |
|--------|------|------|------|
| `Content-Type` | ✅ | 内容类型 | `application/json` |
| `X-User-Id` | ✅ | 用户唯一ID | `user-1731312000000-abc123def` |
| `X-Session-Id` | ✅ | 会话ID | `session-1731312000000-xyz789abc` |

### 响应格式

```json
{
  "data": {
    "optimizedPrompt": "优化后的提示词",
    "targetTool": "ChatGPT",
    "suggestions": ["建议1", "建议2"],
    "reasoning": "优化理由",
    "originalPrompt": "原始提示词"
  }
}
```

---

## 🎉 使用效果

### 记忆示例

**第一次对话**：
```
用户：写一篇文章
Agent：[优化结果]
```

**第二次对话（同一会话）**：
```
用户：继续优化
Agent：基于之前的"写一篇文章"，我继续优化...
```

**新建对话后**：
```
用户：继续优化
Agent：请提供需要优化的提示词...
```

---

## 📚 相关文件

- `lib/session-manager.ts` - 会话管理器
- `lib/api-client.ts` - API 客户端
- `app/components/ChatBox.tsx` - UI 组件

---

## ✅ 检查清单

确认记忆功能正常工作：

- [ ] 首次访问自动生成用户ID
- [ ] 首次访问自动生成会话ID
- [ ] 请求携带正确的 Headers
- [ ] 点击"新建对话"生成新会话ID
- [ ] 刷新页面ID保持不变
- [ ] 后端能记住上下文

---

**记忆功能已完全集成，开箱即用！🎊**

