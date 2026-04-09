---
read_when:
    - 你希望通过智能体进行后台/并行工作
    - 你正在更改 sessions_spawn 或子智能体工具策略
    - 你正在实现或排查线程绑定的子智能体会话
summary: 子智能体：生成隔离的智能体运行，并将结果回告到请求者聊天
title: 子智能体
x-i18n:
    generated_at: "2026-04-09T01:01:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: 9df7cc35a3069ce4eb9c92a95df3ce5365a00a3fae92ff73def75461b58fec3f
    source_path: tools\subagents.md
    workflow: 15
---

# 子智能体

子智能体是从现有智能体运行中派生出的后台智能体运行。它们会在各自独立的会话中运行（`agent:<agentId>:subagent:<uuid>`），并在完成时将结果**回告**到请求者聊天渠道。每次子智能体运行都会作为一个[后台任务](/zh-CN/automation/tasks)进行跟踪。

## 斜杠命令

使用 `/subagents` 可检查或控制**当前会话**的子智能体运行：

- `/subagents list`
- `/subagents kill <id|#|all>`
- `/subagents log <id|#> [limit] [tools]`
- `/subagents info <id|#>`
- `/subagents send <id|#> <message>`
- `/subagents steer <id|#> <message>`
- `/subagents spawn <agentId> <task> [--model <model>] [--thinking <level>]`

线程绑定控制：

这些命令适用于支持持久线程绑定的渠道。参见下文的**支持线程的渠道**。

- `/focus <subagent-label|session-key|session-id|session-label>`
- `/unfocus`
- `/agents`
- `/session idle <duration|off>`
- `/session max-age <duration|off>`

`/subagents info` 会显示运行元数据（状态、时间戳、会话 id、转录路径、清理信息）。
使用 `sessions_history` 可获取有边界且经过安全过滤的回溯视图；当你需要原始完整转录时，请检查磁盘上的转录路径。

### 生成行为

`/subagents spawn` 会以用户命令而非内部转发的方式启动一个后台子智能体，并在运行完成时向请求者聊天发送一条最终完成更新。

- 生成命令是非阻塞的；它会立即返回一个运行 id。
- 完成后，子智能体会将一条摘要/结果消息回告到请求者聊天渠道。
- 完成采用推送方式。一旦已生成，就不要通过循环轮询 `/subagents list`、
  `sessions_list` 或 `sessions_history` 来等待它完成；仅在需要调试或干预时按需检查状态。
- 完成时，OpenClaw 会尽力关闭该子智能体会话打开并跟踪的浏览器标签页/进程，然后再继续回告清理流程。
- 对于手动生成，投递具有弹性：
  - OpenClaw 会先尝试使用稳定幂等键进行直接 `agent` 投递。
  - 如果直接投递失败，则回退到队列路由。
  - 如果队列路由仍不可用，则会在最终放弃前以短指数退避重试回告。
- 完成投递会保留已解析的请求者路由：
  - 在可用时，线程绑定或会话绑定的完成路由优先
  - 如果完成来源仅提供渠道，OpenClaw 会从请求者会话的已解析路由（`lastChannel` / `lastTo` / `lastAccountId`）补全缺失的目标/账户，这样直接投递仍然可用
- 向请求者会话移交完成信息时，会生成运行时内部上下文（而不是用户编写的文本），其中包括：
  - `Result`（最新可见的 `assistant` 回复文本；否则为经过净化的最新 tool/toolResult 文本）
  - `Status`（`completed successfully` / `failed` / `timed out` / `unknown`）
  - 紧凑的运行时/token 统计
  - 一条投递指令，告诉请求者智能体应使用普通 assistant 语气改写，而不是转发原始内部元数据
- `--model` 和 `--thinking` 会覆盖该次运行的默认值。
- 使用 `info`/`log` 可在完成后检查详细信息和输出。
- `/subagents spawn` 是一次性模式（`mode: "run"`）。对于持久的线程绑定会话，请使用带 `thread: true` 和 `mode: "session"` 的 `sessions_spawn`。
- 对于 ACP harness 会话（Codex、Claude Code、Gemini CLI），请使用 `runtime: "acp"` 的 `sessions_spawn`，并参见 [ACP Agents](/zh-CN/tools/acp-agents)。

主要目标：

- 将“研究 / 长任务 / 慢工具”工作并行化，而不阻塞主运行。
- 默认保持子智能体隔离（会话分离 + 可选沙箱隔离）。
- 保持工具表面难以被误用：子智能体默认**不会**获得会话工具。
- 支持可配置的嵌套深度，以实现编排器模式。

成本说明：每个子智能体都有其**独立**的上下文和 token 使用量。对于高开销或重复性任务，请为子智能体设置更便宜的模型，并让主智能体继续使用质量更高的模型。
你可以通过 `agents.defaults.subagents.model` 或按智能体覆盖来配置。

## 工具

使用 `sessions_spawn`：

- 启动一个子智能体运行（`deliver: false`，全局通道：`subagent`）
- 然后执行一个回告步骤，并将回告回复发布到请求者聊天渠道
- 默认模型：继承调用方，除非你设置了 `agents.defaults.subagents.model`（或按智能体设置 `agents.list[].subagents.model`）；显式的 `sessions_spawn.model` 仍然优先。
- 默认 thinking：继承调用方，除非你设置了 `agents.defaults.subagents.thinking`（或按智能体设置 `agents.list[].subagents.thinking`）；显式的 `sessions_spawn.thinking` 仍然优先。
- 默认运行超时：如果省略 `sessions_spawn.runTimeoutSeconds`，OpenClaw 会在设置了 `agents.defaults.subagents.runTimeoutSeconds` 时使用它；否则回退为 `0`（无超时）。

工具参数：

- `task`（必填）
- `label?`（可选）
- `agentId?`（可选；如果允许，可在另一个 agent id 下生成）
- `model?`（可选；覆盖子智能体模型；无效值会被跳过，子智能体将使用默认模型运行，并在工具结果中给出警告）
- `thinking?`（可选；覆盖子智能体运行的 thinking 级别）
- `runTimeoutSeconds?`（设置时默认取 `agents.defaults.subagents.runTimeoutSeconds`，否则为 `0`；设置后，子智能体运行会在 N 秒后中止）
- `thread?`（默认 `false`；为 `true` 时，会为该子智能体会话请求渠道线程绑定）
- `mode?`（`run|session`）
  - 默认值是 `run`
  - 如果 `thread: true` 且省略 `mode`，默认值会变为 `session`
  - `mode: "session"` 需要 `thread: true`
- `cleanup?`（`delete|keep`，默认 `keep`）
- `sandbox?`（`inherit|require`，默认 `inherit`；当目标子运行时不是沙箱隔离时，`require` 会拒绝生成）
- `sessions_spawn` **不接受**渠道投递参数（`target`、`channel`、`to`、`threadId`、`replyTo`、`transport`）。如需投递，请在生成的运行中使用 `message`/`sessions_send`。

## 线程绑定会话

当某个渠道启用了线程绑定时，子智能体可以保持绑定到某个线程，因此该线程中的后续用户消息会继续路由到同一个子智能体会话。

### 支持线程的渠道

- Discord（当前唯一支持的渠道）：支持持久的线程绑定子智能体会话（带 `thread: true` 的 `sessions_spawn`）、手动线程控制（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`），以及适配器键 `channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours` 和 `channels.discord.threadBindings.spawnSubagentSessions`。

快速流程：

1. 使用 `sessions_spawn` 并设置 `thread: true`（可选加上 `mode: "session"`）进行生成。
2. OpenClaw 会在当前渠道中创建一个线程，或将其绑定到该会话目标。
3. 该线程中的回复和后续消息会路由到绑定的会话。
4. 使用 `/session idle` 可检查/更新非活动自动取消聚焦设置，使用 `/session max-age` 可控制硬性上限。
5. 使用 `/unfocus` 可手动解除绑定。

手动控制：

- `/focus <target>` 将当前线程（或创建一个线程）绑定到某个子智能体/会话目标。
- `/unfocus` 会移除当前已绑定线程的绑定关系。
- `/agents` 会列出活动运行和绑定状态（`thread:<id>` 或 `unbound`）。
- `/session idle` 和 `/session max-age` 仅适用于已聚焦的绑定线程。

配置开关：

- 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
- 渠道覆盖和生成自动绑定键是适配器专属的。参见上文的**支持线程的渠道**。

当前适配器详情请参见 [Configuration Reference](/gateway/configuration-reference) 和 [Slash commands](/zh-CN/tools/slash-commands)。

允许列表：

- `agents.list[].subagents.allowAgents`：允许通过 `agentId` 指定的 agent id 列表（`["*"]` 表示允许任意值）。默认：仅请求者智能体。
- `agents.defaults.subagents.allowAgents`：当请求者智能体未设置自己的 `subagents.allowAgents` 时，所使用的默认目标智能体允许列表。
- 沙箱继承防护：如果请求者会话处于沙箱隔离中，`sessions_spawn` 会拒绝那些将以非沙箱方式运行的目标。
- `agents.defaults.subagents.requireAgentId` / `agents.list[].subagents.requireAgentId`：为 true 时，会阻止省略 `agentId` 的 `sessions_spawn` 调用（强制显式配置文件选择）。默认：false。

发现：

- 使用 `agents_list` 可查看当前哪些 agent id 被允许用于 `sessions_spawn`。

自动归档：

- 子智能体会话会在 `agents.defaults.subagents.archiveAfterMinutes` 分钟后自动归档（默认：60）。
- 归档使用 `sessions.delete`，并将转录重命名为 `*.deleted.<timestamp>`（同一文件夹）。
- `cleanup: "delete"` 会在回告后立即归档（仍会通过重命名保留转录）。
- 自动归档是尽力而为的；如果 gateway 重启，待处理计时器会丢失。
- `runTimeoutSeconds` **不会**自动归档；它只会停止运行。会话会保留，直到自动归档。
- 自动归档同样适用于深度 1 和深度 2 会话。
- 浏览器清理与归档清理分开：即使保留了转录/会话记录，跟踪的浏览器标签页/进程也会在运行完成时尽力关闭。

## 嵌套子智能体

默认情况下，子智能体不能再生成自己的子智能体（`maxSpawnDepth: 1`）。你可以通过设置 `maxSpawnDepth: 2` 启用一层嵌套，从而允许**编排器模式**：主智能体 → 编排器子智能体 → 工作子-子智能体。

### 如何启用

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // allow sub-agents to spawn children (default: 1)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5)
        maxConcurrent: 8, // global concurrency lane cap (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn when omitted (0 = no timeout)
      },
    },
  },
}
```

### 深度级别

| 深度 | 会话键形状 | 角色 | 可以生成？ |
| ----- | -------------------------------------------- | --------------------------------------------- | ---------------------------- |
| 0 | `agent:<id>:main` | 主智能体 | 始终可以 |
| 1 | `agent:<id>:subagent:<uuid>` | 子智能体（当允许深度 2 时可作为编排器） | 仅当 `maxSpawnDepth >= 2` |
| 2 | `agent:<id>:subagent:<uuid>:subagent:<uuid>` | 子-子智能体（叶子工作节点） | 永远不可以 |

### 回告链

结果会沿着链路向上流转：

1. 深度 2 工作节点完成 → 向其父级（深度 1 编排器）回告
2. 深度 1 编排器接收回告，综合结果后完成 → 向主智能体回告
3. 主智能体接收回告并将其投递给用户

每一层只能看到其直接子级的回告。

操作建议：

- 仅启动一次子级工作，然后等待完成事件，而不是围绕 `sessions_list`、`sessions_history`、`/subagents list` 或 `exec` sleep 命令构建轮询循环。
- 如果子级完成事件在你已经发送最终答案之后才到达，正确的后续行为是输出精确的静默 token：`NO_REPLY` / `no_reply`。

### 按深度划分的工具策略

- 角色和控制范围会在生成时写入会话元数据。这可以防止扁平化或恢复后的会话键意外重新获得编排器权限。
- **深度 1（编排器，当 `maxSpawnDepth >= 2` 时）**：会获得 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便管理其子级。其他会话/系统工具仍会被拒绝。
- **深度 1（叶子节点，当 `maxSpawnDepth == 1` 时）**：没有会话工具（当前默认行为）。
- **深度 2（叶子工作节点）**：没有会话工具 —— 在深度 2，`sessions_spawn` 始终被拒绝。无法继续生成更深层子级。

### 按智能体划分的生成限制

任意深度的每个智能体会话，最多只能同时拥有 `maxChildrenPerAgent`（默认：5）个活动子级。这可以防止单个编排器发生失控扇出。

### 级联停止

停止一个深度 1 编排器会自动停止其所有深度 2 子级：

- 在主聊天中发送 `/stop` 会停止所有深度 1 智能体，并级联停止其深度 2 子级。
- `/subagents kill <id>` 会停止特定子智能体，并级联停止其子级。
- `/subagents kill all` 会停止请求者的所有子智能体，并执行级联停止。

## 认证

子智能体认证按**agent id** 解析，而不是按会话类型：

- 子智能体会话键是 `agent:<agentId>:subagent:<uuid>`。
- 认证存储从该智能体的 `agentDir` 加载。
- 主智能体的认证配置文件会作为**回退**合并进来；若发生冲突，智能体配置文件优先于主配置文件。

说明：这种合并是追加式的，因此主配置文件始终可以作为回退使用。当前尚不支持按智能体完全隔离的认证。

## 回告

子智能体通过一个回告步骤进行结果上报：

- 回告步骤在子智能体会话内部运行（而不是在请求者会话中）。
- 如果子智能体精确回复 `ANNOUNCE_SKIP`，则不会发布任何内容。
- 如果最新 assistant 文本是精确的静默 token `NO_REPLY` / `no_reply`，即使之前存在可见进度，也会抑制回告输出。
- 否则，投递取决于请求者深度：
  - 顶层请求者会话使用带外部投递的后续 `agent` 调用（`deliver=true`）
  - 嵌套的请求者子智能体会话会收到内部后续注入（`deliver=false`），这样编排器就能在会话内综合子级结果
  - 如果某个嵌套请求者子智能体会话已不存在，OpenClaw 会在可用时回退到该会话的请求者
- 对于顶层请求者会话，完成模式下的直接投递会先解析任意已绑定的会话/线程路由和 hook 覆盖，然后再从请求者会话存储的路由中补全缺失的渠道目标字段。这样即使完成来源只标识了渠道，也能确保完成消息发送到正确的聊天/话题。
- 在构建嵌套完成发现时，子级完成聚合会限定在当前请求者运行范围内，从而防止旧运行的陈旧子级输出泄漏到当前回告中。
- 在渠道适配器支持时，回告回复会保留线程/话题路由。
- 回告上下文会被规范化为一个稳定的内部事件块：
  - 来源（`subagent` 或 `cron`）
  - 子级会话键/id
  - 回告类型 + 任务标签
  - 从运行时结果派生的状态行（`success`、`error`、`timeout` 或 `unknown`）
  - 从最新可见 assistant 文本中选择的结果内容，否则为经过净化的最新 tool/toolResult 文本
  - 一条后续指令，说明何时回复，何时保持静默
- `Status` 不是从模型输出推断的；它来自运行时结果信号。
- 超时时，如果子级只执行到了工具调用阶段，回告可以将该历史折叠为简短的部分进展摘要，而不是重放原始工具输出。

回告载荷末尾会包含一行统计信息（即使经过包装）：

- 运行时长（例如 `runtime 5m12s`）
- Token 使用量（输入/输出/总量）
- 若已配置模型定价，则包含估算成本（`models.providers.*.models[].cost`）
- `sessionKey`、`sessionId` 和转录路径（这样主智能体可以通过 `sessions_history` 获取历史，或在磁盘上检查文件）
- 内部元数据仅用于编排；面向用户的回复应改写为普通 assistant 语气。

`sessions_history` 是更安全的编排路径：

- assistant 回溯会先进行规范化：
  - 去除 thinking 标签
  - 去除 `<relevant-memories>` / `<relevant_memories>` 脚手架块
  - 去除纯文本工具调用 XML 载荷块，例如 `<tool_call>...</tool_call>`、
    `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>` 和
    `<function_calls>...</function_calls>`，包括那些从未正确闭合的截断载荷
  - 去除已降级的工具调用/结果脚手架和历史上下文标记
  - 去除泄漏的模型控制 token，例如 `<|assistant|>`、其他 ASCII
    `<|...|>` token，以及全角 `<｜...｜>` 变体
  - 去除格式错误的 MiniMax 工具调用 XML
- 类凭证/令牌文本会被脱敏
- 长文本块可能会被截断
- 超大的历史可能会丢弃较早行，或将过大的某一行替换为
  `[sessions_history omitted: message too large]`
- 当你需要逐字节的完整转录时，回退方式是在磁盘上检查原始转录

## 工具策略（子智能体工具）

默认情况下，子智能体会获得**除会话工具和系统工具之外的所有工具**：

- `sessions_list`
- `sessions_history`
- `sessions_send`
- `sessions_spawn`

这里的 `sessions_history` 仍然是有边界、经过净化的回溯视图；它不是原始转录转储。

当 `maxSpawnDepth >= 2` 时，深度 1 编排器子智能体还会额外获得 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便管理其子级。

可通过配置覆盖：

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

## 并发

子智能体使用一条专用的进程内队列通道：

- 通道名称：`subagent`
- 并发数：`agents.defaults.subagents.maxConcurrent`（默认 `8`）

## 停止

- 在请求者聊天中发送 `/stop` 会中止请求者会话，并停止由其生成的任何活动子智能体运行，同时级联停止嵌套子级。
- `/subagents kill <id>` 会停止特定子智能体，并级联停止其子级。

## 限制

- 子智能体回告是**尽力而为**的。如果 gateway 重启，待处理的“回告给请求者”工作会丢失。
- 子智能体仍共享同一个 gateway 进程资源；请将 `maxConcurrent` 视为一道安全阀。
- `sessions_spawn` 始终是非阻塞的：它会立即返回 `{ status: "accepted", runId, childSessionKey }`。
- 子智能体上下文只会注入 `AGENTS.md` + `TOOLS.md`（不会注入 `SOUL.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 或 `BOOTSTRAP.md`）。
- 最大嵌套深度为 5（`maxSpawnDepth` 范围：1–5）。对于大多数用例，推荐使用深度 2。
- `maxChildrenPerAgent` 限制每个会话的活动子级数（默认：5，范围：1–20）。
