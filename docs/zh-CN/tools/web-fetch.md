---
read_when:
    - 你想抓取一个 URL 并提取可读内容
    - 你需要配置 `web_fetch` 或其 Firecrawl 回退
    - 你想了解 `web_fetch` 的限制和缓存
sidebarTitle: Web Fetch
summary: '`web_fetch` 工具 —— 带可读内容提取的 HTTP 抓取'
title: Web Fetch
x-i18n:
    generated_at: "2026-04-09T01:02:50Z"
    model: gpt-5.4
    provider: openai
    source_hash: 60c933a25d0f4511dc1683985988e115b836244c5eac4c6667b67c8eb15401e0
    source_path: tools\web-fetch.md
    workflow: 15
---

# Web Fetch

`web_fetch` 工具会执行普通的 HTTP GET，并提取可读内容
（将 HTML 转为 Markdown 或文本）。它**不会**执行 JavaScript。

对于重度依赖 JS 的网站或受登录保护的页面，请改用
[?????](/zh-CN/tools/browser)。

## 快速开始

`web_fetch` **默认启用** —— 无需任何配置。智能体可以
立即调用它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具参数

| 参数 | 类型 | 说明 |
| ------------- | -------- | ---------------------------------------- |
| `url` | `string` | 要抓取的 URL（必填，仅支持 http/https） |
| `extractMode` | `string` | `"markdown"`（默认）或 `"text"` |
| `maxChars` | `number` | 将输出截断到指定字符数 |

## 工作原理

<Steps>
  <Step title="抓取">
    发送带有类似 Chrome 的 User-Agent 和 `Accept-Language`
    请求头的 HTTP GET。会阻止私有/内部主机名，并在重定向后再次检查。
  </Step>
  <Step title="提取">
    对 HTML 响应运行 Readability（正文内容提取）。
  </Step>
  <Step title="回退（可选）">
    如果 Readability 失败且已配置 Firecrawl，则通过
    Firecrawl API 以绕过机器人限制模式重试。
  </Step>
  <Step title="缓存">
    结果会缓存 15 分钟（可配置），以减少对同一 URL 的重复
    抓取。
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // 默认：true
        provider: "firecrawl", // 可选；省略时自动检测
        maxChars: 50000, // 最大输出字符数
        maxCharsCap: 50000, // maxChars 参数的硬上限
        maxResponseBytes: 2000000, // 解析前的最大下载大小
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        readability: true, // 使用 Readability 提取
        userAgent: "Mozilla/5.0 ...", // 覆盖 User-Agent
      },
    },
  },
}
```

## Firecrawl 回退

如果 Readability 提取失败，`web_fetch` 可以回退到
[Firecrawl](/zh-CN/tools/firecrawl)，以绕过机器人限制并获得更好的提取效果：

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // 可选；省略时根据可用凭证自动检测
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // 如果已设置 FIRECRAWL_API_KEY，则此项可选
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // 缓存时长（1 天）
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 支持 SecretRef 对象。
旧版 `tools.web.fetch.firecrawl.*` 配置可由 `openclaw doctor --fix` 自动迁移。

<Note>
  如果 Firecrawl 已启用，而它的 SecretRef 无法解析，且又没有
  `FIRECRAWL_API_KEY` 环境变量回退，gateway 启动会快速失败。
</Note>

<Note>
  Firecrawl `baseUrl` 覆盖受到严格限制：必须使用 `https://`，并且
  必须指向官方 Firecrawl 宿主（`api.firecrawl.dev`）。
</Note>

当前运行时行为：

- `tools.web.fetch.provider` 用于显式选择抓取回退提供商。
- 如果省略 `provider`，OpenClaw 会从可用凭证中自动检测第一个就绪的 `web_fetch`
  提供商。当前内置提供商是 Firecrawl。
- 如果禁用了 Readability，`web_fetch` 会直接跳到所选
  提供商回退。如果没有可用提供商，则会以关闭方式失败。

## 限制和安全性

- `maxChars` 会被限制在 `tools.web.fetch.maxCharsCap` 之内
- 响应体会在解析前受 `maxResponseBytes` 限制；超大
  响应会被截断并附带警告
- 私有/内部主机名会被阻止
- 重定向会被检查，并受 `maxRedirects` 限制
- `web_fetch` 是尽力而为的 —— 某些网站需要使用 [?????](/zh-CN/tools/browser)

## 工具配置文件

如果你使用工具配置文件或 allowlists，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## 相关内容

- [Web ??](/zh-CN/tools/web) -- 使用多个提供商搜索网页
- [?????](/zh-CN/tools/browser) -- 面向重度 JS 网站的完整浏览器自动化
- [Firecrawl](/zh-CN/tools/firecrawl) -- Firecrawl 搜索和抓取工具
