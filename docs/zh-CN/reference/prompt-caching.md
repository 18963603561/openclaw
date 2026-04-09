---
read_when:
    - 你想通过缓存保留来降低提示词 token 成本
    - 你需要在多智能体设置中控制按智能体划分的缓存行为
    - 你正在同时调优 heartbeat 和 cache-ttl 剪枝
summary: 提示词缓存控制项、合并顺序、提供商行为与调优模式
title: 提示词缓存
x-i18n:
    generated_at: "2026-04-08T07:04:24Z"
    model: gpt-5.4
    provider: openai
    source_hash: 13d5f3153b6593ae22cd04a6c2540e074cf15df9f1990fc5b7184fe803f4a1bd
    source_path: reference\prompt-caching.md
    workflow: 15
---

# 提示词缓存

提示词缓存意味着模型提供商可以在多轮之间复用未变化的提示词前缀（通常是 system / developer 指令以及其他稳定上下文），而不是每次都重新处理它们。只要上游 API 直接暴露这些计数器，OpenClaw 就会将提供商用量规范化为 `cacheRead` 和 `cacheWrite`。

当实时会话快照缺少缓存计数器时，状态界面还可以从最近一次 transcript
用量日志中恢复这些计数器，因此即使发生部分会话元数据丢失，`/status` 仍能继续显示缓存行。已有的非零实时缓存值仍然优先于 transcript 回退值。

这为什么重要：更低的 token 成本、更快的响应速度，以及对长时间运行会话更可预测的性能。如果没有缓存，即使大部分输入没有变化，重复提示词在每一轮仍然要支付完整提示词成本。

本页涵盖所有会影响提示词复用和 token 成本的缓存相关控制项。

提供商参考：

- Anthropic 提示词缓存：[https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- OpenAI 提示词缓存：[https://developers.openai.com/api/docs/guides/prompt-caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- OpenAI API 请求头与请求 ID：[https://developers.openai.com/api/reference/overview](https://developers.openai.com/api/reference/overview)
- Anthropic 请求 ID 与错误：[https://platform.claude.com/docs/en/api/errors](https://platform.claude.com/docs/en/api/errors)

## 主要控制项

### `cacheRetention`（全局默认值、模型级和按智能体）

将缓存保留设置为所有模型的全局默认值：

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

按模型覆盖：

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

按智能体覆盖：

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

配置合并顺序：

1. `agents.defaults.params`（全局默认值 —— 适用于所有模型）
2. `agents.defaults.models["provider/model"].params`（按模型覆盖）
3. `agents.list[].params`（匹配的智能体 id；按键覆盖）

### `contextPruning.mode: "cache-ttl"`

在缓存 TTL 窗口之后剪除旧的工具结果上下文，这样在空闲之后发起的请求就不会重新缓存过大的历史记录。

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

完整行为请参见 [会话剪枝](/zh-CN/concepts/session-pruning)。

### heartbeat 保温

heartbeat 可以保持缓存窗口处于温热状态，并减少空闲间隔后的重复缓存写入。

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

在 `agents.list[].heartbeat` 下也支持按智能体配置 heartbeat。

## 提供商行为

### Anthropic（直连 API）

- 支持 `cacheRetention`。
- 对于 Anthropic API 密钥认证配置文件，当未设置时，OpenClaw 会为 Anthropic 模型引用预置 `cacheRetention: "short"`。
- Anthropic 原生 Messages 响应同时暴露 `cache_read_input_tokens` 和 `cache_creation_input_tokens`，因此 OpenClaw 可以同时显示 `cacheRead` 和 `cacheWrite`。
- 对于原生 Anthropic 请求，`cacheRetention: "short"` 映射到默认的 5 分钟临时缓存，而 `cacheRetention: "long"` 仅在直连 `api.anthropic.com` host 上升级为 1 小时 TTL。

### OpenAI（直连 API）

- 对于受支持的较新模型，提示词缓存是自动的。OpenClaw 不需要注入块级缓存标记。
- OpenClaw 使用 `prompt_cache_key` 来保持多轮之间的缓存路由稳定，并且仅当在直连 OpenAI host 上选择 `cacheRetention: "long"` 时，才使用 `prompt_cache_retention: "24h"`。
- OpenAI 会通过 `usage.prompt_tokens_details.cached_tokens`（或在 Responses API 事件中的 `input_tokens_details.cached_tokens`）暴露已缓存提示词 token。OpenClaw 会将其映射为 `cacheRead`。
- OpenAI 不会暴露单独的缓存写入 token 计数器，因此即使提供商正在预热缓存，OpenAI 路径上的 `cacheWrite` 也会保持为 `0`。
- OpenAI 会返回有用的跟踪和限流请求头，例如 `x-request-id`、`openai-processing-ms` 和 `x-ratelimit-*`，但缓存命中统计应来自用量负载，而不是请求头。
- 在实践中，OpenAI 的行为通常更像是初始前缀缓存，而不是 Anthropic 式的移动全历史复用。在当前实时探测中，稳定的长前缀文本轮次经常会稳定在约 `4864` 个已缓存 token，而工具密集型或 MCP 风格 transcript 即使在完全重复时，也通常会稳定在约 `4608` 个已缓存 token。

### Anthropic Vertex

- 运行在 Vertex AI 上的 Anthropic 模型（`anthropic-vertex/*`）对 `cacheRetention` 的支持方式与直连 Anthropic 相同。
- `cacheRetention: "long"` 会映射到 Vertex AI 端点上真实的 1 小时提示词缓存 TTL。
- `anthropic-vertex` 的默认缓存保留策略与直连 Anthropic 默认值一致。
- Vertex 请求会通过具备边界感知的缓存整形进行路由，从而让缓存复用始终与提供商实际接收到的内容保持一致。

### Amazon Bedrock

- Anthropic Claude 模型引用（`amazon-bedrock/*anthropic.claude*`）支持显式透传 `cacheRetention`。
- 非 Anthropic 的 Bedrock 模型会在运行时被强制为 `cacheRetention: "none"`。

### OpenRouter Anthropic 模型

对于 `openrouter/anthropic/*` 模型引用，仅当请求仍然指向已验证的 OpenRouter 路由时，OpenClaw 才会在 system / developer 提示词块上注入 Anthropic
`cache_control`，以提升提示词缓存复用（即默认端点上的 `openrouter`，或任何解析到 `openrouter.ai` 的 provider / base URL）。

如果你将模型重新指向任意兼容 OpenAI 的代理 URL，OpenClaw 就会停止注入这些 OpenRouter 专用的 Anthropic 缓存标记。

### 其他提供商

如果提供商不支持此缓存模式，`cacheRetention` 就不会产生任何效果。

### Google Gemini 直连 API

- 直连 Gemini 传输（`api: "google-generative-ai"`）会通过上游 `cachedContentTokenCount` 报告缓存命中；OpenClaw 会将其映射为 `cacheRead`。
- 当在直连 Gemini 模型上设置 `cacheRetention` 时，OpenClaw 会在 Google AI Studio 运行中自动为 system 提示词创建、复用并刷新 `cachedContents` 资源。这意味着你不再需要手动预创建 cached-content 句柄。
- 你仍然可以通过已配置模型上的 `params.cachedContent`（或旧版 `params.cached_content`）传入一个预先存在的 Gemini cached-content 句柄。
- 这与 Anthropic / OpenAI 的提示词前缀缓存不同。对于 Gemini，OpenClaw 管理的是提供商原生的 `cachedContents` 资源，而不是向请求中注入缓存标记。

### Gemini CLI JSON 用量

- Gemini CLI JSON 输出也可以通过 `stats.cached` 暴露缓存命中；OpenClaw 会将其映射为 `cacheRead`。
- 如果 CLI 省略了直接的 `stats.input` 值，OpenClaw 会通过
  `stats.input_tokens - stats.cached` 推导输入 token。
- 这只是用量规范化。并不意味着 OpenClaw 正在为 Gemini CLI 创建 Anthropic / OpenAI 风格的提示词缓存标记。

## system prompt 缓存边界

OpenClaw 会将 system prompt 拆分为**稳定前缀**和**易变后缀**，二者之间由一个内部缓存前缀边界分隔。边界上方的内容（工具定义、skills 元数据、工作区文件及其他相对静态的上下文）会按顺序排列，以确保它们在多轮之间保持字节级一致。边界下方的内容（例如 `HEARTBEAT.md`、运行时时间戳及其他逐轮元数据）则允许变化，而不会使已缓存前缀失效。

关键设计选择：

- 稳定的工作区项目上下文文件会排在 `HEARTBEAT.md` 之前，因此 heartbeat 抖动不会破坏稳定前缀。
- 该边界会应用到 Anthropic 系列、OpenAI 系列、Google 以及 CLI 传输整形中，因此所有受支持的提供商都能受益于相同的前缀稳定性。
- Codex Responses 和 Anthropic Vertex 请求会通过具备边界感知的缓存整形进行路由，从而让缓存复用与提供商实际接收到的内容保持一致。
- system prompt 指纹会被规范化（空白、换行符、hook 添加的上下文、运行时能力顺序），从而使语义未变的提示词可以在多轮之间共享 KV / 缓存。

如果你在配置或工作区变更后看到意外的 `cacheWrite` 峰值，请检查该变更落在缓存边界之上还是之下。将易变内容移动到边界下方（或让它稳定下来）通常就能解决问题。

## OpenClaw 缓存稳定性保护

在请求到达提供商之前，OpenClaw 还会让若干对缓存敏感的负载形态保持确定性：

- bundle MCP 工具目录会在工具注册前按确定性顺序排序，因此 `listTools()` 顺序变化不会扰动工具块，也不会破坏提示词缓存前缀。
- 对于带有持久化图像块的旧会话，会保留**最近 3 个已完成轮次**不变；更早且已经处理过的图像块可能会被替换为一个标记，从而避免在图像密集型后续轮次中持续重新发送庞大的陈旧负载。

## 调优模式

### 混合流量（推荐默认值）

在主智能体上保留长期缓存基线，对突发型通知智能体禁用缓存：

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### 成本优先基线

- 将基线 `cacheRetention` 设为 `short`。
- 启用 `contextPruning.mode: "cache-ttl"`。
- 仅对那些能从温热缓存中获益的智能体，将 heartbeat 维持在 TTL 以下。

## 缓存诊断

OpenClaw 为嵌入式智能体运行暴露了专用的缓存跟踪诊断。

对于普通面向用户的诊断，当实时会话条目没有这些计数器时，`/status` 和其他用量摘要可以使用最近一次 transcript 用量条目作为 `cacheRead` /
`cacheWrite` 的回退来源。

## 实时回归测试

OpenClaw 保留了一个合并后的实时缓存回归门，用于覆盖重复前缀、工具轮次、图像轮次、MCP 风格工具 transcript，以及 Anthropic 无缓存对照。

- `src/agents/live-cache-regression.live.test.ts`
- `src/agents/live-cache-regression-baseline.ts`

运行这个窄范围实时门：

```sh
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache
```

baseline 文件会存储最近一次观测到的实时数值，以及测试使用的按提供商划分的回归下限。
运行器还会使用每次运行全新的会话 ID 和提示词命名空间，从而避免之前的缓存状态污染当前回归样本。

这些测试有意不在不同提供商之间使用完全相同的成功标准。

### Anthropic 实时期望

- 期望通过 `cacheWrite` 看到显式预热写入。
- 期望在重复轮次中看到接近完整历史的复用，因为 Anthropic 的缓存控制会沿着会话推进缓存断点。
- 当前实时断言仍然对稳定、工具和图像路径使用较高命中率阈值。

### OpenAI 实时期望

- 仅期望 `cacheRead`。`cacheWrite` 保持为 `0`。
- 将重复轮次的缓存复用视为提供商专属平台值，而不是 Anthropic 式的移动全历史复用。
- 当前实时断言基于在 `gpt-5.4-mini` 上观测到的实时行为，使用保守下限检查：
  - 稳定前缀：`cacheRead >= 4608`，命中率 `>= 0.90`
  - 工具 transcript：`cacheRead >= 4096`，命中率 `>= 0.85`
  - 图像 transcript：`cacheRead >= 3840`，命中率 `>= 0.82`
  - MCP 风格 transcript：`cacheRead >= 4096`，命中率 `>= 0.85`

截至 2026-04-04 的最新合并实时验证结果：

- 稳定前缀：`cacheRead=4864`，命中率 `0.966`
- 工具 transcript：`cacheRead=4608`，命中率 `0.896`
- 图像 transcript：`cacheRead=4864`，命中率 `0.954`
- MCP 风格 transcript：`cacheRead=4608`，命中率 `0.891`

该合并门最近的本地墙钟时间约为 `88s`。

为什么这些断言不同：

- Anthropic 暴露了显式缓存断点和移动式会话历史复用。
- OpenAI 提示词缓存仍然对精确前缀敏感，但在实时 Responses 流量中，有效可复用前缀可能会比完整提示词更早进入平台期。
- 因此，如果用单一跨提供商百分比阈值来比较 Anthropic 和 OpenAI，就会产生错误回归。

### `diagnostics.cacheTrace` 配置

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

默认值：

- `filePath`：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages`：`true`
- `includePrompt`：`true`
- `includeSystem`：`true`

### 环境变量开关（一次性调试）

- `OPENCLAW_CACHE_TRACE=1` 启用缓存跟踪。
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` 覆盖输出路径。
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` 切换是否捕获完整消息负载。
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` 切换是否捕获提示词文本。
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` 切换是否捕获 system prompt。

### 应检查什么

- 缓存跟踪事件是 JSONL，包含诸如 `session:loaded`、`prompt:before`、`stream:context` 和 `session:after` 等分阶段快照。
- 每轮缓存 token 影响可通过常规用量界面中的 `cacheRead` 和 `cacheWrite` 看到（例如 `/usage full` 和会话用量摘要）。
- 对 Anthropic 而言，在缓存启用时，应同时看到 `cacheRead` 和 `cacheWrite`。
- 对 OpenAI 而言，缓存命中时应看到 `cacheRead`，而 `cacheWrite` 应继续保持为 `0`；OpenAI 不会发布单独的缓存写入 token 字段。
- 如果你需要请求跟踪，请将请求 ID 和限流请求头与缓存指标分开记录。OpenClaw 当前的缓存跟踪输出聚焦于提示词 / 会话形态和规范化 token 用量，而不是原始提供商响应头。

## 快速故障排除

- 大多数轮次都有较高 `cacheWrite`：检查是否存在易变的 system prompt 输入，并确认模型 / 提供商支持你的缓存设置。
- Anthropic 上有较高 `cacheWrite`：通常意味着缓存断点落在了每次请求都会变化的内容上。
- OpenAI 的 `cacheRead` 偏低：确认稳定前缀位于最前面，重复前缀至少有 1024 个 token，并且对应该共享缓存的轮次复用了同一个 `prompt_cache_key`。
- `cacheRetention` 没有效果：确认模型键与 `agents.defaults.models["provider/model"]` 匹配。
- Bedrock Nova / Mistral 请求带有缓存设置：运行时被强制为 `none` 属于预期行为。

相关文档：

- [Anthropic](/zh-CN/providers/anthropic)
- [Token 使用与成本](/zh-CN/reference/token-use)
- [会话剪枝](/zh-CN/concepts/session-pruning)
- [????](/zh-CN/gateway/configuration-reference)
