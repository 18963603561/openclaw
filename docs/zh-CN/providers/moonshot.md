---
read_when:
    - 你想设置 Moonshot K2（Moonshot Open Platform）或 Kimi Coding
    - 你需要理解独立的端点、密钥和模型引用
    - 你想要任一提供商可直接复制粘贴的配置
summary: 配置 Moonshot K2 与 Kimi Coding（独立提供商 + 独立密钥）
title: Moonshot AI
x-i18n:
    generated_at: "2026-04-08T06:54:51Z"
    model: gpt-5.4
    provider: openai
    source_hash: a80c71ef432b778e296bd60b7d9ec7c72d025d13fd9bdae474b3d58436d15695
    source_path: providers\moonshot.md
    workflow: 15
---

# Moonshot AI（Kimi）

Moonshot 提供 Kimi API，并使用兼容 OpenAI 的端点。配置该提供商后，将默认模型设置为 `moonshot/kimi-k2.5`；或者你也可以使用 Kimi Coding，对应模型为 `kimi/kimi-code`。

当前 Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
# or
openclaw onboard --auth-choice moonshot-api-key-cn
```

Kimi Coding：

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

注意：Moonshot 和 Kimi Coding 是两个独立提供商。它们的密钥不能互换，端点不同，模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi/...`）。

Kimi Web 搜索也使用 Moonshot 插件：

```bash
openclaw configure --section web
```

在 Web 搜索部分选择 **Kimi**，即可保存到
`plugins.entries.moonshot.config.webSearch.*`。

## 配置片段（Moonshot API）

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
        // moonshot-kimi-k2-aliases:end
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-turbo",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 16384,
          },
          // moonshot-kimi-k2-models:end
        ],
      },
    },
  },
}
```

## Kimi Coding

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi/kimi-code" },
      models: {
        "kimi/kimi-code": { alias: "Kimi" },
      },
    },
  },
}
```

## Kimi Web 搜索

OpenClaw 还内置了 **Kimi** 作为 `web_search` 提供商，其底层由 Moonshot Web 搜索支持。

交互式设置可能会提示你输入：

- Moonshot API 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认 Kimi Web 搜索模型（默认为 `kimi-k2.5`）

配置保存在 `plugins.entries.moonshot.config.webSearch` 下：

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## 说明

- Moonshot 模型引用使用 `moonshot/<modelId>`。Kimi Coding 模型引用使用 `kimi/<modelId>`。
- 当前 Kimi Coding 默认模型引用是 `kimi/kimi-code`。旧版 `kimi/k2p5` 仍被接受，作为兼容模型 id。
- Kimi Web 搜索使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，默认端点为 `https://api.moonshot.ai/v1`，默认模型为 `kimi-k2.5`。
- 原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和
  `https://api.moonshot.cn/v1`）会在共享 `openai-completions` 传输上声明流式用量兼容性。OpenClaw 现在会根据端点能力来判断这一点，因此指向相同原生 Moonshot 主机的兼容自定义 provider id 也会继承相同的流式用量行为。
- 如有需要，可在 `models.providers` 中覆盖定价和上下文元数据。
- 如果 Moonshot 为某个模型发布了不同的上下文限制，请相应调整
  `contextWindow`。
- 国际端点使用 `https://api.moonshot.ai/v1`，中国端点使用 `https://api.moonshot.cn/v1`。
- 新手引导选项：
  - `moonshot-api-key` 对应 `https://api.moonshot.ai/v1`
  - `moonshot-api-key-cn` 对应 `https://api.moonshot.cn/v1`

## 原生 thinking 模式（Moonshot）

Moonshot Kimi 支持二元原生 thinking：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

可通过 `agents.defaults.models.<provider/model>.params` 为每个模型单独配置：

```json5
{
  agents: {
    defaults: {
      models: {
        "moonshot/kimi-k2.5": {
          params: {
            thinking: { type: "disabled" },
          },
        },
      },
    },
  },
}
```

OpenClaw 还会为 Moonshot 映射运行时 `/think` 级别：

- `/think off` -> `thinking.type=disabled`
- 任意非 off 的 thinking 级别 -> `thinking.type=enabled`

启用 Moonshot thinking 时，`tool_choice` 必须为 `auto` 或 `none`。为保证兼容性，OpenClaw 会将不兼容的 `tool_choice` 值规范化为 `auto`。
