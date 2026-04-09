---
read_when:
    - 解释入站消息如何变成回复
    - 澄清会话、排队模式或流式传输行为
    - 记录推理可见性及其使用影响
summary: 消息流、会话、排队和推理可见性
title: 消息
x-i18n:
    generated_at: "2026-04-08T04:01:53Z"
    model: gpt-5.4
    provider: openai
    source_hash: 475f892bd534fdb10a2ee5d3c57a3d4a7fb8e1ab68d695189ba186004713f6f3
    source_path: concepts\messages.md
    workflow: 15
---

# 消息

本页将 OpenClaw 如何处理入站消息、会话、排队、流式传输和推理可见性串联起来说明。

## 消息流（高级概览）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键调节项位于配置中：

- `messages.*`：用于前缀、排队和群组行为。
- `agents.defaults.*`：用于分块流式传输和分块默认值。
- 渠道覆盖项（`channels.whatsapp.*`、`channels.telegram.*` 等）：用于上限和流式传输开关。

完整模式参见 [配置](/gateway/configuration)。

## 入站去重

渠道在重连后可能会重新投递同一条消息。OpenClaw 会维护一个短生命周期缓存，按 channel/account/peer/session/message id 作为键，这样重复投递就不会再次触发智能体运行。

## 入站防抖

来自**同一发送者**的快速连续消息可以通过 `messages.inbound` 合并为单个智能体轮次。防抖按每个渠道 + 每个会话范围生效，并使用最新一条消息来进行回复线程关联／ID 记录。

配置（全局默认值 + 按渠道覆盖）：

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

说明：

- 防抖仅适用于**纯文本**消息；媒体／附件会立即刷新。
- 控制命令会绕过防抖，以保持其独立性。

## 会话和设备

会话归 Gateway 网关所有，而不是归客户端所有。

- 私聊会折叠到智能体主会话键。
- 群组／渠道拥有各自独立的会话键。
- 会话存储和转录内容位于 Gateway 网关宿主机上。

多个设备／渠道可以映射到同一个会话，但历史记录不会完全同步回每一个客户端。建议：对于长对话，使用一个主要设备，以避免上下文分叉。控制 UI 和 TUI 始终显示由 Gateway 网关支持的会话转录，因此它们是真实来源。

详情参见：[会话管理](/zh-CN/concepts/session)。

## 入站消息体和历史上下文

OpenClaw 将**提示词消息体**与**命令消息体**分开：

- `Body`：发送给智能体的提示词文本。其中可能包含渠道封装和可选的历史包装内容。
- `CommandBody`：用于指令／命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的旧别名（为兼容性保留）。

当某个渠道提供历史记录时，会使用统一的包装格式：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非私聊**（群组／渠道／房间），**当前消息体**会加上发送者标签前缀（与历史条目使用相同样式）。这样可使实时消息与排队／历史消息在智能体提示词中保持一致。

历史缓冲区是**仅待处理**的：它们包含那些**未**触发运行的群组消息 _（例如，受提及门控限制的消息）_，并且**不包含**已经进入会话转录的消息。

指令剥离仅适用于**当前消息**部分，因此历史记录会保持完整。包装历史记录的渠道应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，并将 `Body` 保持为合并后的提示词。历史缓冲区可通过 `messages.groupChat.historyLimit`（全局默认值）以及按渠道的覆盖项进行配置，例如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit`（设为 `0` 可禁用）。

## 排队和跟进

如果已有一个运行处于活动状态，入站消息可以进入队列、被导入当前运行，或被收集到后续轮次中。

- 通过 `messages.queue`（以及 `messages.queue.byChannel`）进行配置。
- 模式包括：`interrupt`、`steer`、`followup`、`collect`，以及 backlog 变体。

详情参见：[排队](/zh-CN/concepts/queue)。

## 流式传输、分块和批处理

分块流式传输会在模型产出文本块时发送部分回复。
分块会遵守渠道文本长度限制，并避免拆分围栏代码块。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认 off）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲时间的批处理）
- `agents.defaults.humanDelay`（在分块回复之间模拟人类停顿）
- 渠道覆盖项：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 渠道需要显式设置 `*.blockStreaming: true`）

详情参见：[流式传输 + 分块](/zh-CN/concepts/streaming)。

## 推理可见性和 Token

OpenClaw 可以显示或隐藏模型推理：

- `/reasoning on|off|stream` 用于控制可见性。
- 只要模型产生了推理内容，这些内容仍会计入 Token 使用量。
- Telegram 支持将推理流式传输到草稿气泡中。

详情参见：[思考 + 推理指令](/tools/thinking) 和 [Token 使用](/reference/token-use)。

## 前缀、线程和回复

出站消息格式统一由 `messages` 管理：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和按渠道默认值实现回复线程关联

详情参见：[配置](/gateway/configuration-reference#messages) 和各渠道文档。

## 相关内容

- [流式传输](/zh-CN/concepts/streaming) —— 实时消息投递
- [重试](/zh-CN/concepts/retry) —— 消息投递重试行为
- [排队](/zh-CN/concepts/queue) —— 消息处理队列
- [渠道](/zh-CN/channels) —— 消息平台集成
