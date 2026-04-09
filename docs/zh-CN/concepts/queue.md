---
read_when:
    - 更改自动回复执行或并发行为
summary: 将入站自动回复运行串行化的命令队列设计
title: 命令队列
x-i18n:
    generated_at: "2026-04-08T04:04:59Z"
    model: gpt-5.4
    provider: openai
    source_hash: 36e1d004e9a2c21ad1470517a249285216114dd4cf876681cc860e992c73914f
    source_path: concepts\queue.md
    workflow: 15
---

# 命令队列（2026-01-16）

我们通过一个微型进程内队列，将入站自动回复运行（所有渠道）串行化，以防止多个智能体运行互相冲突，同时仍允许会话之间的安全并行。

## 为什么

- 自动回复运行可能开销很大（LLM 调用），当多个入站消息几乎同时到达时可能发生冲突。
- 串行化可以避免争用共享资源（会话文件、日志、CLI stdin），并降低触发上游速率限制的概率。

## 工作原理

- 一个感知 lane 的 FIFO 队列会按可配置的并发上限排空每个 lane（未配置 lane 默认值为 1；main 默认为 4，subagent 默认为 8）。
- `runEmbeddedPiAgent` 会按**会话键**入队（lane `session:<key>`），以保证每个会话同一时间只有一个活动运行。
- 随后，每个会话运行还会被排入一个**全局 lane**（默认是 `main`），从而通过 `agents.defaults.maxConcurrent` 限制整体并行度。
- 启用详细日志时，如果某个排队运行在启动前等待超过约 2 秒，队列会输出一条简短提示。
- 输入中指示器仍会在入队时立即触发（如果渠道支持），因此等待轮到自己时，用户体验不会改变。

## 队列模式（按渠道）

入站消息可以立即引导当前运行、等待下一轮跟进，或者同时执行这两者：

- `steer`：立即注入当前运行（在下一个工具边界之后取消待处理工具调用）。如果当前不是流式输出，则回退为 followup。
- `followup`：在当前运行结束后，为下一轮智能体运行入队。
- `collect`：将所有排队消息合并为**单个**后续轮次（默认）。如果消息面向不同渠道/线程，则会分别排空，以保留路由语义。
- `steer-backlog`（也称 `steer+backlog`）：立即引导当前运行，**并且**保留该消息用于后续轮次。
- `interrupt`（旧版）：中止该会话的活动运行，然后运行最新消息。
- `queue`（旧别名）：与 `steer` 相同。

Steer-backlog 意味着在被引导的运行之后，你还可能收到一条后续回复，因此流式界面上看起来可能像重复回复。如果你希望每条入站消息只得到一个回复，优先使用 `collect`/`steer`。
发送独立命令 `/queue collect`（按会话生效），或设置 `messages.queue.byChannel.discord: "collect"`。

默认值（配置中未设置时）：

- 所有界面 → `collect`

可通过 `messages.queue` 全局配置或按渠道配置：

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 队列选项

这些选项适用于 `followup`、`collect` 和 `steer-backlog`（也适用于回退为 followup 时的 `steer`）：

- `debounceMs`：在启动后续轮次前等待安静期结束（防止“继续、继续”）。
- `cap`：每个会话允许排队的最大消息数。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 会保留一份被丢弃消息的简短项目符号列表，并将其作为合成的后续提示注入。
默认值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 按会话覆盖

- 发送独立命令 `/queue <mode>`，即可为当前会话存储该模式。
- 选项可以组合：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 会清除该会话覆盖。

## 作用范围和保证

- 适用于所有使用 Gateway 网关回复流水线的入站渠道上的自动回复智能体运行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 默认 lane（`main`）在进程范围内适用于入站 + 主心跳；设置 `agents.defaults.maxConcurrent` 可以允许多个会话并行。
- 可能还存在其他 lane（例如 `cron`、`subagent`），这样后台任务可以并行运行，而不会阻塞入站回复。这些分离运行会作为[后台任务](/zh-CN/automation/tasks)进行跟踪。
- 按会话 lane 保证同一时间只有一个智能体运行会触及某个给定会话。
- 无外部依赖，也无后台工作线程；纯 TypeScript + promises。

## 故障排除

- 如果命令看起来卡住了，请启用详细日志，并查找 “queued for …ms” 行，以确认队列正在排空。
- 如果你需要查看队列深度，请启用详细日志，并关注队列耗时相关日志行。
