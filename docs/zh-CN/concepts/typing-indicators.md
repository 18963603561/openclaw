---
read_when:
    - 修改输入中指示器行为或默认值
summary: OpenClaw 何时显示输入中指示器以及如何调整它们
title: 输入中指示器
x-i18n:
    generated_at: "2026-04-08T04:06:27Z"
    model: gpt-5.4
    provider: openai
    source_hash: 28c8c395a135fc0745181aab66a93582177e6acd0b3496debcbb98159a4f11dc
    source_path: concepts\typing-indicators.md
    workflow: 15
---

# 输入中指示器

当一次运行处于活动状态时，系统会向聊天渠道发送输入中指示器。使用
`agents.defaults.typingMode` 控制**何时**开始显示输入中，并使用 `typingIntervalSeconds`
控制**多久**刷新一次。

## 默认值

当 `agents.defaults.typingMode` **未设置**时，OpenClaw 会保留旧版行为：

- **私聊**：一旦模型循环开始，就立即开始显示输入中。
- **带提及的群聊**：立即开始显示输入中。
- **不带提及的群聊**：只有在消息文本开始流式传输时才开始显示输入中。
- **Heartbeat 运行**：禁用输入中指示器。

## 模式

将 `agents.defaults.typingMode` 设置为以下之一：

- `never` —— 永不显示输入中指示器。
- `instant` —— **模型循环一开始**就显示输入中，即使该次运行最终只返回静默回复 token。
- `thinking` —— 在**第一个推理增量**出现时开始显示输入中（该次运行需要 `reasoningLevel: "stream"`）。
- `message` —— 在**第一个非静默文本增量**出现时开始显示输入中（会忽略 `NO_REPLY` 静默 token）。

按“触发有多早”的顺序：
`never` → `message` → `thinking` → `instant`

## 配置

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

你也可以按会话覆盖模式或频率：

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## 说明

- 在 `message` 模式下，如果整个负载就是精确的静默 token，则不会显示输入中，例如 `NO_REPLY` / `no_reply`（大小写不敏感匹配）。
- `thinking` 仅在该次运行流式输出推理时才会触发（`reasoningLevel: "stream"`）。
  如果模型没有发出推理增量，就不会开始显示输入中。
- 无论使用哪种模式，Heartbeat 都不会显示输入中。
- `typingIntervalSeconds` 控制的是**刷新频率**，而不是开始时间。
  默认值为 6 秒。
