---
read_when:
    - 你需要对智能体循环或生命周期事件有一份精确的完整说明
summary: 智能体循环的生命周期、流和等待语义
title: 智能体循环
x-i18n:
    generated_at: "2026-04-08T03:58:22Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8e562e63c494881e9c345efcb93c5f972d69aaec61445afc3d4ad026b2d26883
    source_path: concepts\agent-loop.md
    workflow: 15
---

# 智能体循环（OpenClaw）

智能体循环是一次智能体完整而“真实”的运行：输入接收 → 上下文组装 → 模型推理 →
工具执行 → 流式回复 → 持久化。它是将一条消息转换为操作和最终回复的权威路径，
同时保持会话状态一致。

在 OpenClaw 中，每个循环都是某个会话上的一次串行运行；当模型进行思考、调用工具并流式输出时，
它会发出生命周期事件和流事件。本文将解释这一真实循环端到端是如何接线的。

## 入口点

- Gateway 网关 RPC：`agent` 和 `agent.wait`。
- CLI：`agent` 命令。

## 工作原理（高层）

1. `agent` RPC 校验参数，解析会话（sessionKey / sessionId），持久化会话元数据，并立即返回 `{ runId, acceptedAt }`。
2. `agentCommand` 运行智能体：
   - 解析模型以及 thinking / verbose 默认值
   - 加载 Skills 快照
   - 调用 `runEmbeddedPiAgent`（pi-agent-core 运行时）
   - 如果嵌入式循环没有发出**生命周期结束 / 错误**事件，则补发该事件
3. `runEmbeddedPiAgent`：
   - 通过按会话和全局的队列对运行进行串行化
   - 解析模型 + auth 配置档，并构建 pi 会话
   - 订阅 pi 事件，并流式传输 assistant / tool 增量
   - 执行超时控制，超时则中止运行
   - 返回负载和用量元数据
4. `subscribeEmbeddedPiSession` 将 pi-agent-core 事件桥接到 OpenClaw `agent` 流：
   - 工具事件 => `stream: "tool"`
   - assistant 增量 => `stream: "assistant"`
   - 生命周期事件 => `stream: "lifecycle"`（`phase: "start" | "end" | "error"`）
5. `agent.wait` 使用 `waitForAgentRun`：
   - 等待 `runId` 对应的**生命周期结束 / 错误**事件
   - 返回 `{ status: ok|error|timeout, startedAt, endedAt, error? }`

## 排队与并发

- 运行会按会话键（会话 lane）串行化，并可选择再经过全局 lane。
- 这样可以防止工具 / 会话竞争，并保持会话历史一致。
- 消息渠道可以选择队列模式（collect / steer / followup），并接入这一 lane 系统。
  参见 [Command Queue](/concepts/queue)。

## 会话与工作区准备

- 工作区会被解析并创建；启用沙箱隔离的运行可能会重定向到沙箱工作区根目录。
- Skills 会被加载（或从快照复用），并注入到环境变量和提示词中。
- Bootstrap / 上下文文件会被解析，并注入到 system prompt 报告中。
- 会获取一个会话写锁；在开始流式传输之前，会打开并准备 `SessionManager`。

## 提示词组装与 system prompt

- System prompt 由 OpenClaw 的基础提示词、Skills 提示词、bootstrap 上下文和按运行覆盖项共同构建。
- 会强制执行模型特定的限制以及 compaction 预留 token。
- 模型实际看到的内容，请参见 [System prompt](/concepts/system-prompt)。

## hook 点（你可以在何处拦截）

OpenClaw 有两套 hook 系统：

- **内部 hooks**（Gateway 网关 hooks）：针对命令和生命周期事件的事件驱动脚本。
- **插件 hooks**：位于智能体 / 工具生命周期和 Gateway 网关管线内部的扩展点。

### 内部 hooks（Gateway 网关 hooks）

- **`agent:bootstrap`**：在构建 bootstrap 文件、system prompt 最终确定前运行。
  可用于添加 / 删除 bootstrap 上下文文件。
- **命令 hooks**：`/new`、`/reset`、`/stop` 以及其他命令事件（参见 Hooks 文档）。

设置和示例请参见 [Hooks](/zh-CN/automation/hooks)。

### 插件 hooks（智能体 + Gateway 网关生命周期）

这些 hook 会在智能体循环或 Gateway 网关管线内部运行：

- **`before_model_resolve`**：在会话创建前运行（无 `messages`），可在模型解析前确定性覆盖 provider / model。
- **`before_prompt_build`**：在会话加载后运行（含 `messages`），可在提交提示词前注入 `prependContext`、`systemPrompt`、`prependSystemContext` 或 `appendSystemContext`。对于每轮动态文本，请使用 `prependContext`；对于应位于 system prompt 空间中的稳定指导，请使用 system-context 相关字段。
- **`before_agent_start`**：旧版兼容 hook，可能在任一阶段运行；优先使用上面更明确的 hooks。
- **`before_agent_reply`**：在内联操作完成后、LLM 调用前运行，允许插件接管该轮次，并返回一个合成回复，或完全使该轮次静默。
- **`agent_end`**：在完成后检查最终消息列表和运行元数据。
- **`before_compaction` / `after_compaction`**：观察或标注 compaction 周期。
- **`before_tool_call` / `after_tool_call`**：拦截工具参数 / 结果。
- **`before_install`**：检查内置扫描结果，并可选择阻止 skill 或插件安装。
- **`tool_result_persist`**：在工具结果写入会话记录前，同步变换该结果。
- **`message_received` / `message_sending` / `message_sent`**：入站 + 出站消息 hooks。
- **`session_start` / `session_end`**：会话生命周期边界。
- **`gateway_start` / `gateway_stop`**：Gateway 网关生命周期事件。

出站 / 工具防护的 hook 决策规则：

- `before_tool_call`：`{ block: true }` 为终止性结果，并会阻止更低优先级处理器继续执行。
- `before_tool_call`：`{ block: false }` 是无操作，不会清除先前的阻止状态。
- `before_install`：`{ block: true }` 为终止性结果，并会阻止更低优先级处理器继续执行。
- `before_install`：`{ block: false }` 是无操作，不会清除先前的阻止状态。
- `message_sending`：`{ cancel: true }` 为终止性结果，并会阻止更低优先级处理器继续执行。
- `message_sending`：`{ cancel: false }` 是无操作，不会清除先前的取消状态。

hook API 和注册细节请参见 [插件 hooks](/plugins/architecture#provider-runtime-hooks)。

## 流式传输与部分回复

- Assistant 增量由 pi-agent-core 流式输出，并作为 `assistant` 事件发出。
- 分块流式传输可以在 `text_end` 或 `message_end` 时发出部分回复。
- reasoning 流式传输可以作为单独流发出，也可以作为分块回复发出。
- 分块和块级回复行为请参见 [Streaming](/concepts/streaming)。

## 工具执行与消息工具

- 工具开始 / 更新 / 结束事件会在 `tool` 流上发出。
- 工具结果在记录 / 发出前，会针对大小和图片负载进行净化。
- 消息工具发送会被跟踪，以抑制重复的 assistant 确认消息。

## 回复整形与抑制

- 最终负载由以下内容组装而成：
  - assistant 文本（以及可选 reasoning）
  - 内联工具摘要（在 verbose 启用且允许时）
  - 模型报错时的 assistant 错误文本
- 精确的静默令牌 `NO_REPLY` / `no_reply` 会从出站
  负载中过滤掉。
- 消息工具重复项会从最终负载列表中移除。
- 如果没有任何可渲染负载残留，且某个工具报错，则会发出一个回退工具错误回复
  （除非某个消息工具已经发送了用户可见回复）。

## Compaction 与重试

- 自动 compaction 会发出 `compaction` 流事件，并可能触发一次重试。
- 重试时，内存中的缓冲区和工具摘要会被重置，以避免重复输出。
- compaction 管线请参见 [Compaction](/zh-CN/concepts/compaction)。

## 事件流（当前）

- `lifecycle`：由 `subscribeEmbeddedPiSession` 发出（并在必要时由 `agentCommand` 作为回退发出）
- `assistant`：来自 pi-agent-core 的流式增量
- `tool`：来自 pi-agent-core 的流式工具事件

## 聊天渠道处理

- Assistant 增量会被缓冲成聊天 `delta` 消息。
- 在**生命周期结束 / 错误**时，会发出一个聊天 `final`。

## 超时

- `agent.wait` 默认值：30 秒（仅等待时间）。可用 `timeoutMs` 参数覆盖。
- 智能体运行时：`agents.defaults.timeoutSeconds` 默认 172800 秒（48 小时）；由 `runEmbeddedPiAgent` 中的中止计时器强制执行。

## 可能提前结束的地方

- 智能体超时（中止）
- AbortSignal（取消）
- Gateway 网关断开连接或 RPC 超时
- `agent.wait` 超时（仅等待，不会停止智能体）

## 相关内容

- [工具](/tools) — 可用的智能体工具
- [Hooks](/zh-CN/automation/hooks) — 由智能体生命周期事件触发的事件驱动脚本
- [Compaction](/zh-CN/concepts/compaction) — 长对话如何被总结
- [Exec Approvals](/tools/exec-approvals) — shell 命令的审批门禁
- [Thinking](/tools/thinking) — thinking / reasoning 级别配置
