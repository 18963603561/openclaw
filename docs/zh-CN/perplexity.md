---
read_when:
    - 你想使用 Perplexity Search 进行 Web 搜索
    - 你需要设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
summary: 用于 `web_search` 的 Perplexity Search API 以及 Sonar/OpenRouter 兼容路径
title: Perplexity Search（旧版路径）
x-i18n:
    generated_at: "2026-04-08T06:11:54Z"
    model: gpt-5.4
    provider: openai
    source_hash: ba91e63e7412f3b6f889ee11f4a66563014932a1dc7be8593fe2262a4877b89b
    source_path: perplexity.md
    workflow: 15
---

# Perplexity Search API

OpenClaw 支持将 Perplexity Search API 用作 `web_search` 提供商。
它会返回包含 `title`、`url` 和 `snippet` 字段的结构化结果。

为兼容起见，OpenClaw 也支持旧版的 Perplexity Sonar/OpenRouter 配置。
如果你使用 `OPENROUTER_API_KEY`，或在 `plugins.entries.perplexity.config.webSearch.apiKey` 中使用 `sk-or-...` key，或者设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，则该提供商会切换到 chat-completions 路径，并返回带引用的 AI 综合答案，而不是结构化的 Search API 结果。

## 获取 Perplexity API key

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建 Perplexity 账号
2. 在仪表板中生成一个 API key
3. 将该 key 存储到配置中，或在 Gateway 网关环境中设置 `PERPLEXITY_API_KEY`。

## OpenRouter 兼容性

如果你已经在通过 OpenRouter 使用 Perplexity Sonar，请继续使用 `provider: "perplexity"`，并在 Gateway 网关环境中设置 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储一个 `sk-or-...` key。

可选兼容控制项：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 配置示例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 兼容路径

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## 在哪里设置 key

**通过配置：** 运行 `openclaw configure --section web`。它会将 key 存储到
`~/.openclaw/openclaw.json` 中的 `plugins.entries.perplexity.config.webSearch.apiKey`。
该字段也接受 SecretRef 对象。

**通过环境变量：** 在 Gateway 网关进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。
对于 Gateway 网关安装，请将其放入
`~/.openclaw/.env`（或你的服务环境）中。参见 [环境变量](/zh-CN/help/faq#env-vars-and-env-loading)。

如果已配置 `provider: "perplexity"`，并且 Perplexity key SecretRef 无法解析且没有 env 回退，启动/重新加载会快速失败。

## 工具参数

这些参数适用于原生 Perplexity Search API 路径。

| Parameter             | Description |
| --------------------- | ----------- |
| `query`               | 搜索查询（必需） |
| `count`               | 返回结果数量（1-10，默认：5） |
| `country`             | 2 字母 ISO 国家代码（例如 `"US"`、`"DE"`） |
| `language`            | ISO 639-1 语言代码（例如 `"en"`、`"de"`、`"fr"`） |
| `freshness`           | 时间过滤器：`day`（24 小时）、`week`、`month` 或 `year` |
| `date_after`          | 仅返回在此日期之后发布的结果（`YYYY-MM-DD`） |
| `date_before`         | 仅返回在此日期之前发布的结果（`YYYY-MM-DD`） |
| `domain_filter`       | 域名允许列表/拒绝列表数组（最多 20 个） |
| `max_tokens`          | 总内容预算（默认：25000，最大：1000000） |
| `max_tokens_per_page` | 每页 token 上限（默认：2048） |

对于旧版 Sonar/OpenRouter 兼容路径：

- 接受 `query`、`count` 和 `freshness`
- 其中 `count` 仅用于兼容；响应仍然是一个带引用的综合答案，而不是 N 条结果列表
- Search API 专有过滤器，如 `country`、`language`、`date_after`、
  `date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`
  会返回明确错误

**示例：**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 域名过滤规则

- 每个过滤器最多 20 个域名
- 同一个请求中不能混用允许列表和拒绝列表
- 对拒绝列表条目使用 `-` 前缀（例如 `["-reddit.com"]`）

## 说明

- Perplexity Search API 返回结构化的 Web 搜索结果（`title`、`url`、`snippet`）
- 使用 OpenRouter，或显式设置 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，会让 Perplexity 为兼容性切回 Sonar chat completions
- Sonar/OpenRouter 兼容路径返回的是一个带引用的综合答案，而不是结构化结果行
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）

完整的 `web_search` 配置请参见 [Web 工具](/tools/web)。
更多细节请参见 [Perplexity Search API 文档](https://docs.perplexity.ai/docs/search/quickstart)。
