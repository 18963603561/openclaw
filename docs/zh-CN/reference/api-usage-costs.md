---
read_when:
    - 你想了解哪些功能可能会调用付费 API
    - 你需要审计密钥、成本和用量可见性
    - 你正在解释 `/status` 或 `/usage` 的成本报告
summary: 审计哪些功能会花钱、使用了哪些密钥，以及如何查看用量
title: API 用量与成本
x-i18n:
    generated_at: "2026-04-08T07:03:14Z"
    model: gpt-5.4
    provider: openai
    source_hash: ab6eefcde9ac014df6cdda7aaa77ef48f16936ab12eaa883d9fe69425a31a2dd
    source_path: reference\api-usage-costs.md
    workflow: 15
---

# API 用量与成本

本文档列出了**可能会调用 API key 的功能**以及它们的成本显示位置。它重点关注 OpenClaw 中可能产生提供商用量或付费 API 调用的功能。

## 成本显示位置（聊天 + CLI）

**按会话统计的成本快照**

- `/status` 会显示当前会话模型、上下文使用情况以及上一条回复的 token 数。
- 如果该模型使用的是**API key 认证**，`/status` 还会显示上一条回复的**预估成本**。
- 如果实时会话元数据较少，`/status` 可以从最新的转录用量条目中恢复 token / 缓存
  计数器以及活动运行时模型标签。已有的非零实时值仍然优先生效；当存储的总数缺失或更小时，基于提示词大小的转录总数也可能胜出。

**按消息统计的成本页脚**

- `/usage full` 会在每条回复后附加一个用量页脚，其中包括**预估成本**（仅限 API key）。
- `/usage tokens` 仅显示 token；基于订阅的 OAuth / token 和 CLI 流程会隐藏美元成本。
- Gemini CLI 说明：当 CLI 返回 JSON 输出时，OpenClaw 会从
  `stats` 中读取用量，将 `stats.cached` 规范化为 `cacheRead`，并在需要时从
  `stats.input_tokens - stats.cached` 推导输入 token。

Anthropic 说明：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用量再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为该集成的受认可方式。
Anthropic 仍然没有暴露 OpenClaw 可在 `/usage full` 中显示的逐消息美元预估。

**CLI 用量窗口（提供商配额）**

- `openclaw status --usage` 和 `openclaw channels list` 会显示提供商**用量窗口**
  （配额快照，而不是逐消息成本）。
- 面向用户的输出会被统一规范化为各提供商通用的 `X% left`。
- 当前支持用量窗口的提供商有：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、Xiaomi 和 z.ai。
- MiniMax 说明：它原始的 `usage_percent` / `usagePercent` 字段表示的是剩余配额，因此 OpenClaw 会在显示前对其取反。有计数字段时，它们仍然优先生效。如果提供商返回了 `model_remains`，OpenClaw 会优先选择聊天模型条目，在需要时从时间戳推导窗口标签，并在套餐标签中包含模型名称。
- 这些配额窗口的用量认证会在可用时来自提供商专属 hook；否则 OpenClaw 会回退到从 auth profile、环境变量或配置中匹配 OAuth / API key
  凭证。

详见 [Token 使用与成本](/zh-CN/reference/token-use) 中的细节和示例。

## 如何发现密钥

OpenClaw 可以从以下来源获取凭证：

- **Auth profiles**（每个智能体一份，保存在 `auth-profiles.json` 中）。
- **环境变量**（例如 `OPENAI_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`）。
- **配置**（`models.providers.*.apiKey`、`plugins.entries.*.config.webSearch.apiKey`、
  `plugins.entries.firecrawl.config.webFetch.apiKey`、`memorySearch.*`、
  `talk.providers.*.apiKey`）。
- **Skills**（`skills.entries.<name>.apiKey`），它们可能会把密钥导出到 skill 进程环境变量中。

## 会消耗密钥的功能

### 1）核心模型响应（聊天 + 工具）

每条回复或每次工具调用都会使用**当前模型提供商**（OpenAI、Anthropic 等）。这是用量和成本的主要来源。

这还包括那些基于订阅、但仍会在 OpenClaw 本地 UI 之外计费的托管提供商，例如 **OpenAI Codex**、**Alibaba Cloud Model Studio
Coding Plan**、**MiniMax Coding Plan**、**Z.AI / GLM Coding Plan**，以及 Anthropic 的启用了 **Extra Usage** 的 OpenClaw Claude 登录路径。

定价配置请参阅 [模型](/zh-CN/providers/models)，显示方式请参阅 [Token 使用与成本](/zh-CN/reference/token-use)。

### 2）媒体理解（音频 / 图像 / 视频）

在回复运行之前，入站媒体可能会先被总结 / 转录。这会使用模型 / 提供商 API。

- 音频：OpenAI / Groq / Deepgram / Google / Mistral。
- 图像：OpenAI / OpenRouter / Anthropic / Google / MiniMax / Moonshot / Qwen / Z.AI。
- 视频：Google / Qwen / Moonshot。

请参阅 [媒体理解](/zh-CN/nodes/media-understanding)。

### 3）图像和视频生成

共享生成能力也会消耗提供商密钥：

- 图像生成：OpenAI / Google / fal / MiniMax
- 视频生成：Qwen

当 `agents.defaults.imageGenerationModel` 未设置时，图像生成可以推断出一个带认证支持的默认提供商。视频生成当前需要显式设置 `agents.defaults.videoGenerationModel`，例如
`qwen/wan2.6-t2v`。

请参阅 [图像生成](/tools/image-generation)、[Qwen Cloud](/zh-CN/providers/qwen)，
以及 [模型](/zh-CN/concepts/models)。

### 4）记忆 embeddings + 语义搜索

语义记忆搜索在配置为远程提供商时，会使用 **embedding API**：

- `memorySearch.provider = "openai"` → OpenAI embeddings
- `memorySearch.provider = "gemini"` → Gemini embeddings
- `memorySearch.provider = "voyage"` → Voyage embeddings
- `memorySearch.provider = "mistral"` → Mistral embeddings
- `memorySearch.provider = "ollama"` → Ollama embeddings（本地 / 自托管；通常没有托管 API 计费）
- 如果本地 embeddings 失败，可选回退到远程提供商

你可以通过设置 `memorySearch.provider = "local"` 保持本地运行（无 API 用量）。

请参阅 [记忆](/zh-CN/concepts/memory)。

### 5）Web 搜索工具

`web_search` 可能会根据你的提供商产生用量费用：

- **Brave Search API**：`BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`
- **Exa**：`EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`
- **Firecrawl**：`FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`
- **Gemini（Google Search）**：`GEMINI_API_KEY` 或 `plugins.entries.google.config.webSearch.apiKey`
- **Grok（xAI）**：`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`
- **Kimi（Moonshot）**：`KIMI_API_KEY`、`MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`
- **MiniMax Search**：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY`、`MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`
- **Ollama Web 搜索**：默认不需要密钥，但需要可访问的 Ollama 主机以及 `ollama signin`；如果主机需要认证，也可以复用普通 Ollama 提供商的 bearer auth
- **Perplexity Search API**：`PERPLEXITY_API_KEY`、`OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`
- **Tavily**：`TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`
- **DuckDuckGo**：免密钥回退方案（无 API 计费，但属于非官方且基于 HTML）
- **SearXNG**：`SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（免密钥 / 自托管；无托管 API 计费）

旧版 `tools.web.search.*` 提供商路径仍会通过临时兼容 shim 加载，但它们不再是推荐的配置方式。

**Brave Search 免费额度：** 每个 Brave 套餐都包含每月 \$5 的循环免费额度。Search 套餐价格为每 1,000 次请求 \$5，因此该额度可覆盖每月 1,000 次请求且无需付费。请在 Brave 控制台中设置你的使用上限，以避免意外收费。

请参阅 [Web 工具](/tools/web)。

### 5）Web 抓取工具（Firecrawl）

当存在 API key 时，`web_fetch` 可以调用 **Firecrawl**：

- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webFetch.apiKey`

如果未配置 Firecrawl，该工具会回退到直接抓取 + readability（无付费 API）。

请参阅 [Web 工具](/tools/web)。

### 6）提供商用量快照（状态 / 健康）

某些状态命令会调用**提供商用量端点**，以显示配额窗口或认证健康状态。
这些通常是低频调用，但仍会命中提供商 API：

- `openclaw status --usage`
- `openclaw models status --json`

请参阅 [Models CLI](/cli/models)。

### 7）压缩保护汇总

压缩保护机制可能会使用**当前模型**来汇总会话历史，
这在运行时会调用提供商 API。

请参阅 [会话管理 + 压缩](/zh-CN/reference/session-management-compaction)。

### 8）模型扫描 / 探测

`openclaw models scan` 可以探测 OpenRouter 模型，并在启用探测时使用 `OPENROUTER_API_KEY`。

请参阅 [Models CLI](/cli/models)。

### 9）Talk（语音）

Talk 模式在配置完成后可以调用 **ElevenLabs**：

- `ELEVENLABS_API_KEY` 或 `talk.providers.elevenlabs.apiKey`

请参阅 [Talk 模式](/zh-CN/nodes/talk)。

### 10）Skills（第三方 API）

Skills 可以在 `skills.entries.<name>.apiKey` 中存储 `apiKey`。如果某个 skill 使用该密钥调用外部
API，则会按照该 skill 所对应提供商的规则产生费用。

请参阅 [Skills](/tools/skills)。
