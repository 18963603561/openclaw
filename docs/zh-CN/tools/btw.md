---
read_when:
    - 你想针对当前会话提出一个快速的侧边问题
    - 你正在实现或调试跨客户端的 BTW 行为
summary: 使用 /btw 提出临时侧边问题
title: BTW 侧边问题
x-i18n:
    generated_at: "2026-04-09T00:52:05Z"
    model: gpt-5.4
    provider: openai
    source_hash: aeef33ba19eb0561693fecea9dd39d6922df93be0b9a89446ed17277bcee58aa
    source_path: tools\btw.md
    workflow: 15
---

# BTW 侧边问题

`/btw` 让你可以针对**当前会话**提出一个快速的侧边问题，
而不会把这个问题写入正常的对话历史。

它参考了 Claude Code 的 `/btw` 行为模型，但根据 OpenClaw 的
Gateway 网关和多渠道架构做了调整。

## 它的作用

当你发送：

```text
/btw what changed?
```

OpenClaw 会：

1. 对当前会话上下文做快照，
2. 发起一次独立的**无工具**模型调用，
3. 只回答这个侧边问题，
4. 保持主流程不受影响，
5. **不会**把 BTW 问题或回答写入会话历史，
6. 将答案作为**实时侧边结果**发出，而不是普通的助手消息。

关键的理解方式是：

- 相同的会话上下文
- 独立的一次性侧边查询
- 不调用工具
- 不污染后续上下文
- 不持久化到转录记录

## 它不会做什么

`/btw` **不会**：

- 创建一个新的持久会话，
- 继续未完成的主任务，
- 运行工具或智能体工具循环，
- 将 BTW 问题 / 回答数据写入转录历史，
- 出现在 `chat.history` 中，
- 在重新加载后保留。

它本身就是**临时性的**。

## 上下文如何工作

BTW 将当前会话仅作为**背景上下文**使用。

如果主流程当前仍在进行中，OpenClaw 会对当前消息状态做快照，
并将进行中的主提示词作为背景上下文一并带入，同时明确告知模型：

- 只回答侧边问题，
- 不要恢复或完成未结束的主任务，
- 不要发出工具调用或伪工具调用。

这样可以让 BTW 与主流程保持隔离，同时仍然理解当前会话的主题。

## 传递模型

BTW **不会**作为普通的助手转录消息进行传递。

在 Gateway 网关协议层面：

- 普通助手聊天使用 `chat` 事件
- BTW 使用 `chat.side_result` 事件

这种区分是有意设计的。如果 BTW 复用了普通的 `chat` 事件路径，
客户端就会把它当作常规对话历史处理。

由于 BTW 使用独立的实时事件，并且不会从
`chat.history` 中重放，所以它会在重新加载后消失。

## 界面行为

### TUI

在 TUI 中，BTW 会以内联方式显示在当前会话视图中，但它仍然是
临时性的：

- 在视觉上与普通助手回复明显不同
- 可以通过 `Enter` 或 `Esc` 关闭
- 不会在重新加载后重放

### 外部渠道

在 Telegram、WhatsApp 和 Discord 等渠道中，BTW 会作为一条
带有清晰标签的一次性回复进行传递，因为这些界面没有本地临时覆盖层的概念。

答案仍会被视为侧边结果，而不是正常的会话历史。

### Control UI / Web

Gateway 网关会正确地以 `chat.side_result` 发出 BTW，而且 BTW 不会包含在
`chat.history` 中，因此对于 Web 来说，持久化约定已经是正确的。

当前的 Control UI 仍然需要一个专门的 `chat.side_result` 消费端，
才能在浏览器中实时渲染 BTW。在客户端支持落地之前，BTW 目前已经是一个
具备完整 TUI 和外部渠道行为的 Gateway 网关级功能，但浏览器体验尚未完全实现。

## 何时使用 BTW

当你想要以下效果时，请使用 `/btw`：

- 针对当前工作进行快速澄清，
- 在长时间运行仍在进行时获取一个事实性侧边回答，
- 得到一个不应成为后续会话上下文一部分的临时答案。

示例：

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## 何时不要使用 BTW

如果你希望答案成为该会话未来工作上下文的一部分，就不要使用 `/btw`。

这种情况下，请直接在主会话中正常提问，而不是使用 BTW。

## 相关内容

- [Slash commands](/zh-CN/tools/slash-commands)
- [Thinking Levels](/zh-CN/tools/thinking)
- [Session](/zh-CN/concepts/session)
