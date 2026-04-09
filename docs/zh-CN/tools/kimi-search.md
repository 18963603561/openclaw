---
read_when:
    - 你想将 Kimi 用于 web_search
    - 你需要 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
summary: 通过 Moonshot 网页搜索实现 Kimi web_search
title: Kimi Search
x-i18n:
    generated_at: "2026-04-09T00:56:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: 753757a5497a683c35b4509ed3709b9514dc14a45612675d0f729ae6668c82a5
    source_path: tools\kimi-search.md
    workflow: 15
---

# Kimi Search

OpenClaw 支持将 Kimi 用作 `web_search` 提供商，使用 Moonshot 网页搜索生成带有引用的 AI 合成答案。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取一个 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 网关环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

当你在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可以询问：

- Moonshot API 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认的 Kimi 网页搜索模型（默认为 `kimi-k2.5`）

## 配置

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // 如果已设置 KIMI_API_KEY 或 MOONSHOT_API_KEY，则可选
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

如果你对聊天使用中国 API 主机（`models.providers.moonshot.baseUrl`：
`https://api.moonshot.cn/v1`），当省略 `tools.web.search.kimi.baseUrl` 时，
OpenClaw 会为 Kimi `web_search` 复用同一个主机，这样来自
[platform.moonshot.cn](https://platform.moonshot.cn/) 的密钥就不会误打到国际端点
（这通常会返回 HTTP 401）。如果你需要不同的搜索 base URL，请使用
`tools.web.search.kimi.baseUrl` 进行覆盖。

**环境变量替代方式：** 在 Gateway 网关环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。
对于 Gateway 网关安装，请将其放入 `~/.openclaw/.env`。

如果你省略 `baseUrl`，OpenClaw 默认使用 `https://api.moonshot.ai/v1`。
如果你省略 `model`，OpenClaw 默认使用 `kimi-k2.5`。

## 工作原理

Kimi 使用 Moonshot 网页搜索生成带有内联引用的合成答案，
类似于 Gemini 和 Grok 的 grounding 响应方式。

## 支持的参数

Kimi 搜索支持 `query`。

为了与共享 `web_search` 兼容，也接受 `count`，但 Kimi 仍然返回一个带有引用的合成答案，而不是一个包含 N 条结果的列表。

当前不支持提供商特定过滤器。

## 相关内容

- [Web ??](/zh-CN/tools/web) -- 所有提供商和自动检测
- [Moonshot AI](/zh-CN/providers/moonshot) -- Moonshot AI 模型 + Kimi Coding 提供商文档
- [Gemini Search](/zh-CN/tools/gemini-search) -- 通过 Google grounding 提供 AI 合成答案
- [Grok 搜索](/zh-CN/tools/grok-search) -- 通过 xAI grounding 提供 AI 合成答案
