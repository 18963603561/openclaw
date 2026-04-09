---
read_when:
    - 调整 thinking、fast-mode 或 verbose 指令解析或默认值
summary: '`/think`、`/fast`、`/verbose` 和推理可见性的指令语法'
title: 思考级别
x-i18n:
    generated_at: "2026-04-09T01:02:15Z"
    model: gpt-5.4
    provider: openai
    source_hash: f60aeb6ab4c7ce858f725f589f54184b29d8c91994d18c8deafa75179b9a62cb
    source_path: tools\thinking.md
    workflow: 15
---

# 思考级别（`/think` 指令）

## 功能说明

- 可在任何入站消息正文中使用内联指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 级别（别名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink”（最大预算）
  - xhigh → “ultrathink+”（仅适用于 GPT-5.2 和 Codex 模型）
  - adaptive → 由提供商管理的自适应推理预算（支持 Anthropic Claude 4.6 模型家族）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 会映射为 `xhigh`。
  - `highest`、`max` 会映射为 `high`。
- 提供商说明：
  - 当未显式设置 thinking 级别时，Anthropic Claude 4.6 模型默认使用 `adaptive`。
  - Anthropic 兼容流式路径上的 MiniMax（`minimax/*`）默认使用 `thinking: { type: "disabled" }`，除非你在模型参数或请求参数中显式设置 thinking。这样可以避免从 MiniMax 非原生 Anthropic 流格式中泄漏 `reasoning_content` 增量。
  - Z.AI（`zai/*`）仅支持二元 thinking（`on`/`off`）。任何非 `off` 级别都会被视为 `on`（映射为 `low`）。
  - Moonshot（`moonshot/*`）会将 `/think off` 映射为 `thinking: { type: "disabled" }`，并将任何非 `off` 级别映射为 `thinking: { type: "enabled" }`。启用 thinking 时，Moonshot 仅接受 `tool_choice` 为 `auto|none`；OpenClaw 会将不兼容的值规范化为 `auto`。

## 解析顺序

1. 消息中的内联指令（仅应用于该条消息）。
2. 会话覆盖值（通过发送仅包含指令的消息来设置）。
3. 每个智能体的默认值（配置中的 `agents.list[].thinkingDefault`）。
4. 全局默认值（配置中的 `agents.defaults.thinkingDefault`）。
5. 回退值：Anthropic Claude 4.6 模型使用 `adaptive`，其他支持推理的模型使用 `low`，否则为 `off`。

## 设置会话默认值

- 发送一条**仅包含该指令**的消息（允许空白字符），例如 `/think:medium` 或 `/t high`。
- 该设置会保留在当前会话中（默认按发送者隔离）；可通过 `/think:off` 或会话空闲重置来清除。
- 会发送确认回复（`Thinking level set to high.` / `Thinking disabled.`）。如果级别无效（例如 `/thinking big`），命令会被拒绝，并附带提示，同时会话状态保持不变。
- 发送不带参数的 `/think`（或 `/think:`）可查看当前 thinking 级别。

## 按智能体应用

- **嵌入式 Pi**：解析出的级别会传递给进程内的 Pi 智能体运行时。

## 快速模式（`/fast`）

- 级别：`on|off`。
- 仅指令消息会切换会话 fast-mode 覆盖值，并回复 `Fast mode enabled.` / `Fast mode disabled.`。
- 发送不带模式的 `/fast`（或 `/fast status`）可查看当前生效的 fast-mode 状态。
- OpenClaw 按以下顺序解析 fast mode：
  1. 内联/仅指令 `/fast on|off`
  2. 会话覆盖值
  3. 每个智能体的默认值（`agents.list[].fastModeDefault`）
  4. 每个模型配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 回退值：`off`
- 对于 `openai/*`，fast mode 会通过在受支持的 Responses 请求中发送 `service_tier=priority` 映射为 OpenAI 优先处理。
- 对于 `openai-codex/*`，fast mode 会在 Codex Responses 中发送相同的 `service_tier=priority` 标志。OpenClaw 会在这两种认证路径之间共用同一个 `/fast` 开关。
- 对于直接发送到 `anthropic/*` 的公共请求，包括发送到 `api.anthropic.com` 的 OAuth 认证流量，fast mode 会映射到 Anthropic 服务层级：`/fast on` 设置 `service_tier=auto`，`/fast off` 设置 `service_tier=standard_only`。
- 对于 Anthropic 兼容路径上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）会将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。
- 如果同时设置了显式的 Anthropic `serviceTier` / `service_tier` 模型参数，它们会覆盖 fast-mode 默认值。对于非 Anthropic 代理 base URL，OpenClaw 仍会跳过注入 Anthropic 服务层级。

## 详细模式指令（`/verbose` 或 `/v`）

- 级别：`on`（最小）| `full` | `off`（默认）。
- 仅指令消息会切换会话 verbose 并回复 `Verbose logging enabled.` / `Verbose logging disabled.`；无效级别会返回提示，且不更改状态。
- `/verbose off` 会存储一个显式会话覆盖值；可在 Sessions UI 中选择 `inherit` 来清除。
- 内联指令仅影响该条消息；否则应用会话/全局默认值。
- 发送不带参数的 `/verbose`（或 `/verbose:`）可查看当前 verbose 级别。
- 当 verbose 开启时，输出结构化工具结果的智能体（Pi、其他 JSON 智能体）会将每次工具调用作为单独的仅元数据消息发回，并在可用时使用 `<emoji> <tool-name>: <arg>` 作为前缀（路径/命令）。这些工具摘要会在每个工具启动时立即发送（单独消息气泡），而不是作为流式增量发送。
- 在普通模式下，工具失败摘要仍然可见，但除非 verbose 为 `on` 或 `full`，否则原始错误详情后缀会被隐藏。
- 当 verbose 为 `full` 时，工具输出也会在完成后被转发（单独消息气泡，并截断到安全长度）。如果你在一次运行进行中切换 `/verbose on|full|off`，后续工具消息气泡会遵循新设置。

## 推理可见性（`/reasoning`）

- 级别：`on|off|stream`。
- 仅指令消息会切换回复中是否显示 thinking 块。
- 启用时，推理会作为一条**单独消息**发送，并带有 `Reasoning:` 前缀。
- `stream`（仅 Telegram）：在回复生成期间，将推理流式写入 Telegram 草稿消息气泡中，然后发送不含推理的最终答案。
- 别名：`/reason`。
- 发送不带参数的 `/reasoning`（或 `/reasoning:`）可查看当前推理级别。
- 解析顺序：内联指令、会话覆盖值、每个智能体默认值（`agents.list[].reasoningDefault`），然后是回退值（`off`）。

## 相关内容

- 提升模式文档位于 [Elevated mode](/zh-CN/tools/elevated)。

## 心跳

- 心跳探测正文为已配置的心跳提示（默认：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳消息中的内联指令会照常生效（但应避免通过心跳更改会话默认值）。
- 心跳投递默认仅发送最终载荷。若也要发送单独的 `Reasoning:` 消息（如可用），请设置 `agents.defaults.heartbeat.includeReasoning: true` 或按智能体设置 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- Web 聊天的 thinking 选择器会在页面加载时，从入站会话存储/配置中镜像该会话已保存的级别。
- 选择其他级别会通过 `sessions.patch` 立即写入会话覆盖值；不会等到下一次发送，也不是一次性的 `thinkingOnce` 覆盖。
- 第一个选项始终是 `Default (<resolved level>)`，其中解析出的默认值来自当前会话模型：Anthropic/Bedrock 上的 Claude 4.6 为 `adaptive`，其他支持推理的模型为 `low`，否则为 `off`。
- 该选择器会保持提供商感知：
  - 大多数提供商显示 `off | minimal | low | medium | high | adaptive`
  - Z.AI 显示二元选项 `off | on`
- `/think:<level>` 仍然可用，并会更新同一个已保存的会话级别，因此聊天指令与选择器会保持同步。
