---
read_when:
    - 变更智能体运行时、工作区 bootstrap 或会话行为
summary: 智能体运行时、工作区约定与会话 bootstrap
title: 智能体运行时
x-i18n:
    generated_at: "2026-04-08T03:58:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: e2ff39f4114f009e5b1f86894ea4bb29b1c9512563b70d063f09ca7cde5e8948
    source_path: concepts\agent.md
    workflow: 15
---

# 智能体运行时

OpenClaw 运行一个单一的内嵌智能体运行时。

## 工作区（必需）

OpenClaw 使用单个智能体工作区目录（`agents.defaults.workspace`）作为智能体**唯一**的工作目录（`cwd`），用于工具和上下文。

推荐：如果 `~/.openclaw/openclaw.json` 不存在，请使用 `openclaw setup` 创建它，并初始化工作区文件。

完整的工作区布局与备份指南： [智能体工作区](/zh-CN/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过
`agents.defaults.sandbox.workspaceRoot` 下的按会话工作区覆盖此设置（参见
[Gateway 网关 配置](/gateway/configuration)）。

## Bootstrap 文件（已注入）

在 `agents.defaults.workspace` 中，OpenClaw 期望存在以下可由用户编辑的文件：

- `AGENTS.md` — 操作说明 + “记忆”
- `SOUL.md` — 人设、边界、语气
- `TOOLS.md` — 由用户维护的工具说明（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` — 一次性的首次运行仪式（完成后会删除）
- `IDENTITY.md` — 智能体名称/风格/emoji
- `USER.md` — 用户资料 + 偏好的称呼方式

在新会话的第一轮中，OpenClaw 会将这些文件的内容直接注入到智能体上下文中。

空白文件会被跳过。大文件会被裁剪并用标记截断，以保持提示精简（如需完整内容，请直接读取文件）。

如果某个文件缺失，OpenClaw 会注入一行 “missing file” 标记（并且 `openclaw setup` 会创建一个安全的默认模板）。

`BOOTSTRAP.md` 只会为**全新的工作区**创建（即不存在其他 bootstrap 文件时）。如果你在完成该仪式后删除它，后续重启时不应再次创建。

若要完全禁用 bootstrap 文件创建（适用于预置工作区），请设置：

```json5
{ agent: { skipBootstrap: true } }
```

## 内置工具

核心工具（read/exec/edit/write 及相关系统工具）始终可用，
但会受工具策略限制。`apply_patch` 为可选项，并受
`tools.exec.applyPatch` 控制。`TOOLS.md` **不会**控制哪些工具存在；它只是
指导 _你_ 希望如何使用这些工具。

## Skills

OpenClaw 会从以下位置加载 Skills（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目智能体 Skills：`<workspace>/.agents/skills`
- 个人智能体 Skills：`~/.agents/skills`
- 受管/本地：`~/.openclaw/skills`
- 内置（随安装一起发布）
- 额外 Skills 文件夹：`skills.load.extraDirs`

Skills 可以通过配置/环境变量进行门控（参见 [Gateway 网关 配置](/gateway/configuration) 中的 `skills`）。

## 运行时边界

该内嵌智能体运行时构建在 Pi 智能体核心之上（模型、工具以及
提示流水线）。会话管理、设备发现、工具接线和渠道
投递则是 OpenClaw 在该核心之上的自有层。

## 会话

会话 transcript 以 JSONL 格式存储在以下位置：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，并由 OpenClaw 选择。
不会读取来自其他工具的旧版会话文件夹。

## 流式传输中的转向

当队列模式为 `steer` 时，入站消息会被注入到当前运行中。
排队的转向消息会在**当前 assistant 轮次完成其工具调用执行之后**、下一次 LLM 调用之前送达。转向不再跳过当前 assistant 消息剩余的工具调用；它会在下一个模型边界注入排队消息。

当队列模式为 `followup` 或 `collect` 时，入站消息会一直保留到
当前轮次结束，然后以排队的负载启动一个新的智能体轮次。关于模式 + debounce/cap 行为，参见
[队列](/concepts/queue)。

分块流式传输会在 assistant 块完成后立即发送；默认**关闭**（`agents.defaults.blockStreamingDefault: "off"`）。
可通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` 或 `message_end`；默认是 text_end）。
使用 `agents.defaults.blockStreamingChunk` 控制软块分片（默认
800–1200 字符；优先按段落断开，然后是换行；最后才按句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式块，以减少
单行刷屏（在发送前基于空闲时间进行合并）。非 Telegram 渠道需要
显式设置 `*.blockStreaming: true` 才会启用分块回复。
详细工具摘要会在工具启动时发出（无 debounce）；Control UI
会在可用时通过智能体事件流式输出工具结果。
更多细节： [流式传输 + 分块](/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）会通过按**第一个** `/` 进行拆分来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略 provider，OpenClaw 会先尝试 alias，然后尝试与该精确模型 id 唯一匹配的已配置提供商，最后才回退到已配置的默认提供商。如果该提供商已不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的提供商/模型，而不是继续使用一个过时、已移除提供商的默认值。

## 配置（最小）

至少设置以下内容：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一步： [群聊](/zh-CN/channels/group-messages)_ 🦞
