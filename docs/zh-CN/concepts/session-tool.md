---
read_when:
    - 你想了解智能体拥有哪些会话工具
    - 你想配置跨会话访问或子智能体生成
    - 你想检查状态或控制已生成的子智能体
summary: 用于跨会话状态、回忆、消息传递和子智能体编排的智能体工具
title: 会话工具
x-i18n:
    generated_at: "2026-04-08T04:05:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: 77fab7cbf9d1a5cccaf316b69fefe212bbf9370876c8b92e988d3175f5545a4d
    source_path: concepts\session-tool.md
    workflow: 15
---

# 会话工具

OpenClaw 为智能体提供了可跨会话工作、检查状态和编排子智能体的工具。

## 可用工具

| 工具               | 作用                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `sessions_list`    | 列出会话，并支持可选筛选条件（类型、最近活跃时间）                      |
| `sessions_history` | 读取特定会话的转录记录                                                   |
| `sessions_send`    | 向另一个会话发送消息，并可选择等待回复                                   |
| `sessions_spawn`   | 为后台工作生成一个隔离的子智能体会话                                     |
| `sessions_yield`   | 结束当前轮次，并等待后续的子智能体结果                                   |
| `subagents`        | 列出、引导或终止当前会话生成的子智能体                                   |
| `session_status`   | 显示类似 `/status` 的卡片，并可选择为当前会话设置模型覆盖                |

## 列出和读取会话

`sessions_list` 会返回会话及其键、类型、渠道、模型、token 计数和时间戳。可按类型（`main`、`group`、`cron`、`hook`、`node`）或最近活跃时间（`activeMinutes`）进行筛选。

`sessions_history` 会获取特定会话的对话转录记录。默认情况下不包含工具结果 —— 传入 `includeTools: true` 可查看它们。
返回视图有意设置了边界并进行了安全过滤：

- 在回忆之前会先规范化 assistant 文本：
  - 去除 thinking 标签
  - 去除 `<relevant-memories>` / `<relevant_memories>` 脚手架块
  - 去除纯文本工具调用 XML 负载块，如 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和 `<function_calls>...</function_calls>`，也包括那些从未正确闭合的截断负载
  - 去除降级后的工具调用/结果脚手架，如 `[Tool Call: ...]`、`[Tool Result ...]` 和 `[Historical context ...]`
  - 去除泄露的模型控制 token，如 `<|assistant|>`、其他 ASCII `<|...|>` token，以及全角变体 `<｜...｜>`
  - 去除格式错误的 MiniMax 工具调用 XML，如 `<invoke ...>` / `</minimax:tool_call>`
- 在返回之前会对类似凭证/令牌的文本进行脱敏
- 长文本块会被截断
- 对于非常大的历史记录，可能会丢弃较早的行，或用 `[sessions_history omitted: message too large]` 替换超大的单行
- 该工具会报告摘要标记，如 `truncated`、`droppedMessages`、`contentTruncated`、`contentRedacted` 和 `bytes`

这两个工具都接受**会话键**（如 `"main"`）或来自之前列表调用的**会话 ID**。

如果你需要精确到逐字节一致的转录记录，请检查磁盘上的转录文件，而不要将 `sessions_history` 视为原始转储。

## 发送跨会话消息

`sessions_send` 会将消息发送到另一个会话，并可选择等待回复：

- **发后即忘：** 设置 `timeoutSeconds: 0` 以入队并立即返回。
- **等待回复：** 设置超时时间，并以内联方式获取回复。

目标会话回复后，OpenClaw 可以运行一个**回传循环**，让多个智能体交替发送消息（最多 5 轮）。目标智能体可回复 `REPLY_SKIP` 以提前停止。

## 状态与编排辅助工具

`session_status` 是面向当前会话或其他可见会话的轻量级 `/status` 等价工具。它会报告用量、时间、模型/运行时状态，以及存在时关联的后台任务上下文。与 `/status` 一样，它可以从最新转录使用记录中回填稀疏的 token/缓存计数器，而 `model=default` 会清除按会话设置的覆盖。

`sessions_yield` 会有意结束当前轮次，以便你正在等待的后续事件能成为下一条消息。在生成子智能体后，当你希望完成结果作为下一条消息到达，而不是自己构建轮询循环时，请使用它。

`subagents` 是面向已生成 OpenClaw 子智能体的控制平面辅助工具。它支持：

- `action: "list"`：检查活动/最近运行
- `action: "steer"`：向正在运行的子智能体发送后续引导
- `action: "kill"`：停止一个子智能体或 `all`

## 生成子智能体

`sessions_spawn` 会为后台任务创建一个隔离会话。它始终是非阻塞的 —— 会立即返回 `runId` 和 `childSessionKey`。

关键选项：

- `runtime: "subagent"`（默认）或 `"acp"`，用于外部 harness 智能体。
- 为子会话设置 `model` 和 `thinking` 覆盖。
- `thread: true`，将生成绑定到聊天线程（Discord、Slack 等）。
- `sandbox: "require"`，强制对子会话启用沙箱隔离。

默认的叶子子智能体不会获得会话工具。当 `maxSpawnDepth >= 2` 时，深度为 1 的编排型子智能体还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便它们管理自己的子级。叶子运行仍不会获得递归编排工具。

完成后，会有一个公告步骤将结果发送到请求者所在渠道。完成结果的投递会在可用时保留已绑定的线程/主题路由；如果完成来源仅标识了某个渠道，OpenClaw 仍可复用请求者会话存储的路由（`lastChannel` / `lastTo`）进行直接投递。

关于 ACP 特定行为，请参见 [ACP Agents](/tools/acp-agents)。

## 可见性

会话工具的作用域受限，以限制智能体可见的内容：

| 级别    | 范围                                 |
| ------- | ------------------------------------ |
| `self`  | 仅当前会话                           |
| `tree`  | 当前会话 + 已生成的子智能体          |
| `agent` | 当前智能体的所有会话                 |
| `all`   | 所有会话（如已配置，也包括跨智能体） |

默认值为 `tree`。沙箱隔离会话无论配置如何都会被限制为 `tree`。

## 延伸阅读

- [会话管理](/zh-CN/concepts/session) —— 路由、生命周期、维护
- [ACP Agents](/tools/acp-agents) —— 外部 harness 生成
- [多智能体](/zh-CN/concepts/multi-agent) —— 多智能体架构
- [Gateway 网关配置](/gateway/configuration) —— 会话工具配置项
