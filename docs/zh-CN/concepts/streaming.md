---
read_when:
    - 解释渠道上的流式传输或分块如何工作
    - 修改分块流式传输或渠道分块行为
    - 调试重复／过早的分块回复或渠道预览流式传输
summary: 流式传输 + 分块行为（分块回复、渠道预览流式传输、模式映射）
title: 流式传输和分块
x-i18n:
    generated_at: "2026-04-08T04:06:13Z"
    model: gpt-5.4
    provider: openai
    source_hash: 44b0d08c7eafcb32030ef7c8d5719c2ea2d34e4bac5fdad8cc8b3f4e9e9fad97
    source_path: concepts\streaming.md
    workflow: 15
---

# 流式传输 + 分块

OpenClaw 有两个彼此独立的流式传输层：

- **分块流式传输（渠道）：**在助手写出完整**块**时发出。这些是普通的渠道消息（不是 token 增量）。
- **预览流式传输（Telegram/Discord/Slack）：**在生成过程中更新一条临时的**预览消息**。

目前还**没有真正的 token 增量流式传输**到渠道消息。预览流式传输是基于消息的（发送 + 编辑／追加）。

## 分块流式传输（渠道消息）

分块流式传输会在助手输出可用时，以较粗粒度的分块发送。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

图例：

- `text_delta/events`：模型流事件（对于非流式模型可能较稀疏）。
- `chunker`：应用最小／最大边界 + 断点偏好的 `EmbeddedBlockChunker`。
- `channel send`：实际的出站消息（分块回复）。

**控制项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认 off）。
- 渠道覆盖项：`*.blockStreaming`（以及按账户变体），用于按渠道强制 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（发送前合并流式分块）。
- 渠道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（默认 `length`，`newline` 会先按空行即段落边界拆分，再进行长度分块）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17），用于拆分过高的回复，避免 UI 裁切。

**边界语义：**

- `text_end`：一旦 chunker 产出块就立即流式发送；在每个 `text_end` 时刷新。
- `message_end`：等待助手消息完成，然后再刷新缓冲输出。

如果缓冲文本超过 `maxChars`，`message_end` 仍然会使用 chunker，因此它可以在结束时发出多个分块。

## 分块算法（低／高边界）

分块流式传输由 `EmbeddedBlockChunker` 实现：

- **低边界：**在缓冲区长度 < `minChars` 时不发出（除非被强制发出）。
- **高边界：**优先在 `maxChars` 之前断开；如果必须强制断开，则在 `maxChars` 处拆分。
- **断点偏好：**`paragraph` → `newline` → `sentence` → `whitespace` → 硬断开。
- **代码围栏：**绝不在围栏内部拆分；如果必须在 `maxChars` 处强制拆分，则会关闭并重新打开围栏，以保持 Markdown 有效。

`maxChars` 会被限制为渠道 `textChunkLimit`，因此你无法超过各渠道的上限。

## 合并（合并流式分块）

启用分块流式传输后，OpenClaw 可以在发送前**合并连续的分块块**。
这样既能提供渐进式输出，又能减少“单行刷屏”。

- 合并会等待**空闲间隔**（`idleMs`）后再刷新。
- 缓冲区受 `maxChars` 限制，超过时会立即刷新。
- `minChars` 可防止过小片段被发送，直到积累了足够文本
  （最终刷新始终会发送剩余文本）。
- 连接符由 `blockStreamingChunk.breakPreference`
  派生（`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 可通过 `*.blockStreamingCoalesce` 使用渠道覆盖项（包括按账户配置）。
- 除非另有覆盖，Signal/Slack/Discord 的默认合并 `minChars` 会提升到 1500。

## 分块之间模拟人类节奏

启用分块流式传输后，你可以在分块回复之间添加**随机暂停**
（第一块之后开始）。这会让多气泡回复看起来更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 按智能体覆盖）。
- 模式：`off`（默认）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅适用于**分块回复**，不适用于最终回复或工具摘要。

## “流式分块还是最后统一发送”

它映射为：

- **流式分块：**`blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边生成边发送）。非 Telegram 渠道还需要设置 `*.blockStreaming: true`。
- **最后统一流式发送：**`blockStreamingBreak: "message_end"`（结束时刷新一次；如果非常长，也可能拆成多个分块）。
- **不使用分块流式传输：**`blockStreamingDefault: "off"`（只发送最终回复）。

**渠道说明：**除非显式设置
`*.blockStreaming: true`，否则分块流式传输默认**关闭**。渠道可以在没有分块回复的情况下启用实时预览流式传输（`channels.<channel>.streaming`）。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：单个预览，用最新文本替换。
- `block`：以分块／追加步骤更新预览。
- `progress`：生成期间显示进度／状态预览，完成时发送最终答案。

### 渠道映射

| 渠道 | `off` | `partial` | `block` | `progress` |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | 映射为 `partial` |
| Discord  | ✅    | ✅        | ✅      | 映射为 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

仅 Slack：

- 当 `streaming=partial` 时，`channels.slack.nativeStreaming` 用于切换 Slack 原生流式 API 调用（默认：`true`）。

旧键迁移：

- Telegram：`streamMode` + 布尔值 `streaming` 会自动迁移到 `streaming` 枚举。
- Discord：`streamMode` + 布尔值 `streaming` 会自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 会自动迁移到 `streaming` 枚举；布尔值 `streaming` 会自动迁移到 `nativeStreaming`。

### 运行时行为

Telegram：

- 在私信和群组／主题中使用 `sendMessage` + `editMessageText` 进行预览更新。
- 当 Telegram 分块流式传输被显式启用时，会跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当 Discord 分块流式传输被显式启用时，会跳过预览流式传输。

Slack：

- 当可用时，`partial` 可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后发送最终答案。

## 相关内容

- [消息](/zh-CN/concepts/messages) —— 消息生命周期和投递
- [重试](/zh-CN/concepts/retry) —— 投递失败时的重试行为
- [渠道](/zh-CN/channels) —— 各渠道的流式传输支持
