---
read_when:
    - 你想要一个无需 API 密钥的网络搜索提供商
    - 你想将 DuckDuckGo 用于 `web_search`
    - 你需要一个零配置的搜索回退方案
summary: DuckDuckGo 网络搜索 —— 无需密钥的回退提供商（实验性，基于 HTML）
title: DuckDuckGo 搜索
x-i18n:
    generated_at: "2026-04-09T00:54:16Z"
    model: gpt-5.4
    provider: openai
    source_hash: 31f8e3883584534396c247c3d8069ea4c5b6399e0ff13a9dd0c8ee0c3da02096
    source_path: tools\duckduckgo-search.md
    workflow: 15
---

# DuckDuckGo 搜索

OpenClaw 支持将 DuckDuckGo 作为**无需密钥**的 `web_search` 提供商。无需 API
密钥或账号。

<Warning>
  DuckDuckGo 是一个**实验性的非官方**集成，它从 DuckDuckGo 的非 JavaScript 搜索页面拉取结果——而不是官方 API。请预期它有时会因机器人挑战页面或 HTML 变更而失效。
</Warning>

## 设置

无需 API 密钥——只需将 DuckDuckGo 设置为你的提供商：

<Steps>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # Select "duckduckgo" as the provider
    ```
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

用于区域和 SafeSearch 的可选插件级设置：

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo 区域代码
            safeSearch: "moderate", // "strict"、"moderate" 或 "off"
          },
        },
      },
    },
  },
}
```

## 工具参数

| 参数 | 说明 |
| ------------ | ---------------------------------------------------------- |
| `query` | 搜索查询（必填） |
| `count` | 返回结果数量（1-10，默认：5） |
| `region` | DuckDuckGo 区域代码（例如 `us-en`、`uk-en`、`de-de`） |
| `safeSearch` | SafeSearch 级别：`strict`、`moderate`（默认）或 `off` |

区域和 SafeSearch 也可以在插件配置中设置（见上文）——工具
参数会按单次查询覆盖配置值。

## 说明

- **无需 API 密钥** —— 开箱即用，零配置
- **实验性** —— 从 DuckDuckGo 的非 JavaScript HTML
  搜索页面收集结果，而不是官方 API 或 SDK
- **机器人挑战风险** —— DuckDuckGo 在高频或自动化使用场景下可能返回 CAPTCHA 或阻止请求
- **HTML 解析** —— 结果依赖页面结构，而页面结构可能在不提前通知的情况下发生变化
- **自动检测顺序** —— DuckDuckGo 是首个无需密钥的自动检测回退项
  （顺序 100）。已配置密钥的 API 支持型提供商会优先运行，
  然后是 Ollama Web 搜索（顺序 110），再然后是 SearXNG（顺序 200）
- **未配置时，SafeSearch 默认值为 moderate**

<Tip>
  对于生产用途，建议考虑使用 [Brave Search](/zh-CN/tools/brave-search)（提供免费层级）
  或其他基于 API 的提供商。
</Tip>

## 相关内容

- [Web Search overview](/zh-CN/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh-CN/tools/brave-search) -- 提供结构化结果和免费层级
- [Exa Search](/zh-CN/tools/exa-search) -- 带内容提取的神经搜索
