---
read_when:
    - 你想要一个自托管的网络搜索提供商
    - 你想将 SearXNG 用于 `web_search`
    - 你需要一个注重隐私或适用于隔离网络环境的搜索选项
summary: SearXNG 网络搜索 —— 自托管、无需密钥的元搜索提供商
title: SearXNG 搜索
x-i18n:
    generated_at: "2026-04-09T00:59:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: 0a8fc7f890b7595d17c5ef8aede9b84bb2459f30a53d5d87c4e7423e1ac83ca5
    source_path: tools\searxng-search.md
    workflow: 15
---

# SearXNG 搜索

OpenClaw 支持将 [SearXNG](https://docs.searxng.org/) 作为**自托管、
无需密钥**的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，
可聚合来自 Google、Bing、DuckDuckGo 及其他来源的结果。

优势：

- **免费且无限制** -- 无需 API 密钥或商业订阅
- **隐私 / 隔离网络** -- 查询永远不会离开你的网络
- **适用于任何环境** -- 不受商业搜索 API 的区域限制

## 设置

<Steps>
  <Step title="运行一个 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用你已有访问权限的任意 SearXNG 部署。生产环境设置请参见
    [SearXNG 文档](https://docs.searxng.org/)。

  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    或设置环境变量，让自动检测发现它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

SearXNG 实例的插件级设置：

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // 可选
            language: "en", // 可选
          },
        },
      },
    },
  },
}
```

`baseUrl` 字段也接受 SecretRef 对象。

传输规则：

- `https://` 可用于公开或私有的 SearXNG 宿主
- `http://` 仅接受用于可信的私有网络或 loopback 宿主
- 公开的 SearXNG 宿主必须使用 `https://`

## 环境变量

可将 `SEARXNG_BASE_URL` 作为配置的替代方式：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

当设置了 `SEARXNG_BASE_URL` 且未显式配置提供商时，自动检测
会自动选择 SearXNG（优先级最低 -- 任何带密钥的 API 支持型提供商都会先胜出）。

## 插件配置参考

| 字段 | 说明 |
| ------------ | ------------------------------------------------------------------ |
| `baseUrl` | 你的 SearXNG 实例的基础 URL（必填） |
| `categories` | 逗号分隔的分类，例如 `general`、`news` 或 `science` |
| `language` | 结果的语言代码，例如 `en`、`de` 或 `fr` |

## 说明

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而不是 HTML 抓取
- **无需 API 密钥** -- 可开箱即用地配合任意 SearXNG 实例工作
- **基础 URL 校验** -- `baseUrl` 必须是有效的 `http://` 或 `https://`
  URL；公开宿主必须使用 `https://`
- **自动检测顺序** -- 在自动检测中，SearXNG 最后检查（顺序 200）。
  已配置密钥的 API 支持型提供商会先运行，然后是
  DuckDuckGo（顺序 100），再然后是 Ollama Web 搜索（顺序 110）
- **自托管** -- 你可以控制实例、查询和上游搜索引擎
- **未配置时**，`categories` 默认值为 `general`

<Tip>
  若要使 SearXNG JSON API 生效，请确保你的 SearXNG 实例已在其 `settings.yml`
  的 `search.formats` 下启用 `json` 格式。
</Tip>

## 相关内容

- [Web ??](/zh-CN/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo 搜索](/zh-CN/tools/duckduckgo-search) -- 另一种无需密钥的回退方案
- [Brave Search](/zh-CN/tools/brave-search) -- 提供结构化结果和免费层级
