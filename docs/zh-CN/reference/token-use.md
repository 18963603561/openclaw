---
read_when:
    - 解释 token 用量、成本或上下文窗口
    - 调试上下文增长或压缩行为
summary: OpenClaw 如何构建提示词上下文并报告 token 用量 + 成本
title: Token 使用与成本
x-i18n:
    generated_at: "2026-04-08T07:08:29Z"
    model: gpt-5.4
    provider: openai
    source_hash: 0683693d6c6fcde7d5fba236064ba97dd4b317ae6bea3069db969fcd178119d9
    source_path: reference\token-use.md
    workflow: 15
---

# Token 使用与成本

OpenClaw 跟踪的是 **token**，而不是字符。Token 与模型相关，但大多数
OpenAI 风格模型对英文文本的平均值约为每个 token 4 个字符。

## 系统提示词如何构建

OpenClaw 会在每次运行时组装自己的系统提示词。它包括：

- 工具列表 + 简短描述
- Skills 列表（仅元数据；指令会按需通过 `read` 加载）
- 自更新指令
- 工作区 + bootstrap 文件（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、新建时的 `BOOTSTRAP.md`，以及存在时的 `MEMORY.md` 或作为小写回退的 `memory.md`）。大文件会按 `agents.defaults.bootstrapMaxChars`（默认：20000）截断，而 bootstrap 注入总量受 `agents.defaults.bootstrapTotalMaxChars`（默认：150000）限制。`memory/*.md` 文件通过记忆工具按需访问，不会自动注入。
- 时间（UTC + 用户时区）
- 回复标签 + heartbeat 行为
- 运行时元数据（主机 / OS / 模型 / thinking）

完整拆解请参阅 [系统提示词](/zh-CN/concepts/system-prompt)。

## 什么会计入上下文窗口

模型接收到的所有内容都会计入上下文限制：

- 系统提示词（上面列出的所有部分）
- 对话历史（用户 + assistant 消息）
- 工具调用和工具结果
- 附件 / 转录（图像、音频、文件）
- 压缩摘要和裁剪产物
- 提供商 wrapper 或安全 headers（不可见，但仍会计数）

对于图像，OpenClaw 会在提供商调用前对转录 / 工具图像载荷进行缩放。
使用 `agents.defaults.imageMaxDimensionPx`（默认：`1200`）来调优：

- 更低的值通常会减少视觉 token 用量和载荷大小。
- 更高的值会为 OCR / UI 密集型截图保留更多视觉细节。

如需实践层面的拆解（按注入文件、工具、Skills 和系统提示词大小），请使用 `/context list` 或 `/context detail`。参见 [上下文](/zh-CN/concepts/context)。

## 如何查看当前 token 用量

在聊天中使用以下命令：

- `/status` → **富含 emoji 的状态卡片**，显示会话模型、上下文使用情况、
  上一条回复的输入 / 输出 token，以及**预估成本**（仅限 API key）。
- `/usage off|tokens|full` → 在每条回复后附加**逐响应的用量页脚**。
  - 按会话持久化（存储为 `responseUsage`）。
  - OAuth 认证会**隐藏成本**（仅显示 token）。
- `/usage cost` → 显示来自 OpenClaw 会话日志的本地成本摘要。

其他能力面：

- **TUI / Web TUI：** 支持 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 会显示
  规范化后的提供商配额窗口（`X% left`，而不是逐响应成本）。
  当前支持用量窗口的提供商：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。

用量能力面会在显示前规范化常见的提供商原生字段别名。
对于 OpenAI 家族的 Responses 流量，这包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此传输专属字段名不会影响 `/status`、`/usage` 或会话摘要。
Gemini CLI 的 JSON 用量也会被规范化：回复文本来自 `response`，而
`stats.cached` 会映射为 `cacheRead`，当 CLI 省略显式 `stats.input` 字段时，会使用 `stats.input_tokens - stats.cached`。
对于原生 OpenAI 家族的 Responses 流量，WebSocket / SSE 用量别名也会以相同方式规范化，并且当 `total_tokens` 缺失或为 `0` 时，总数会回退到规范化后的输入 + 输出。
当当前会话快照较为稀疏时，`/status` 和 `session_status` 还可以从最近的转录用量日志中恢复 token / 缓存计数器以及活动运行时模型标签。已有的非零实时值仍优先于转录回退值；当存储的总数缺失或更小时，偏向提示词的较大转录总数也可能胜出。
提供商配额窗口的用量认证在可用时来自提供商专属 hook；否则 OpenClaw 会回退到从 auth profile、环境变量或配置中匹配 OAuth / API key 凭证。

## 成本估算（显示时）

成本是根据你的模型定价配置估算的：

```
models.providers.<provider>.models[].cost
```

这些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的**每 100 万 token 的美元价格**。如果缺少定价，OpenClaw 只显示 token。OAuth token 永远不会显示美元成本。

## 缓存 TTL 与裁剪的影响

提供商提示词缓存仅在缓存 TTL 窗口内生效。OpenClaw 可以选择运行**缓存 TTL 裁剪**：当缓存 TTL 过期后，它会裁剪会话，然后重置缓存窗口，这样后续请求就可以复用刚刚重新缓存的上下文，而不是再次缓存完整历史。这有助于在会话空闲超过 TTL 后降低缓存写入成本。

请在 [??](/zh-CN/gateway/configuration) 中配置它，并在 [会话裁剪](/zh-CN/concepts/session-pruning) 中查看具体行为细节。

Heartbeat 可以在空闲间隙中保持缓存**温热**。如果你的模型缓存 TTL
是 `1h`，将 heartbeat 间隔设置为略小于它（例如 `55m`）可以避免重新缓存完整提示词，从而降低缓存写入成本。

在多智能体设置中，你可以保留一个共享模型配置，并通过 `agents.list[].params.cacheRetention` 为每个智能体单独调优缓存行为。

完整的逐项参数指南请参阅 [提示词缓存](/zh-CN/reference/prompt-caching)。

对于 Anthropic API 定价，缓存读取比输入 token 便宜得多，而缓存写入则按更高倍数计费。关于最新费率和 TTL 倍数，请参阅 Anthropic 的提示词缓存定价：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 示例：通过 heartbeat 保持 1h 缓存温热

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 示例：混合流量下按智能体划分缓存策略

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` 会叠加合并到所选模型的 `params` 之上，因此你可以只覆盖 `cacheRetention`，而保持其他模型默认值不变。

### 示例：启用 Anthropic 1M 上下文 beta header

Anthropic 的 1M 上下文窗口当前仍需通过 beta 门控。启用受支持的 Opus
或 Sonnet 模型上的 `context1m` 后，OpenClaw 可以注入所需的
`anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

这会映射到 Anthropic 的 `context-1m-2025-08-07` beta header。

仅当该模型条目设置了 `context1m: true` 时才会生效。

要求：该凭证必须具备长上下文使用资格。否则，
Anthropic 会对该请求返回提供商侧限流错误。

如果你使用 OAuth / 订阅 token（`sk-ant-oat-*`）来认证 Anthropic，OpenClaw 会跳过 `context-1m-*` beta header，因为 Anthropic 当前会以 HTTP 401 拒绝这种组合。

## 减少 token 压力的建议

- 使用 `/compact` 来总结长会话。
- 在你的工作流中裁剪大型工具输出。
- 对截图密集型会话调低 `agents.defaults.imageMaxDimensionPx`。
- 保持 skill 描述简短（skill 列表会注入到提示词中）。
- 对于冗长、探索性的工作，优先使用较小模型。

关于确切的 skill 列表开销公式，请参阅 [Skills](/zh-CN/tools/skills)。
