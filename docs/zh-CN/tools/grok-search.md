---
read_when:
    - 你想将 Grok 用于 `web_search`
    - 你需要一个用于网络搜索的 `XAI_API_KEY`
summary: 通过 xAI 的网络 grounding 响应进行 Grok 网络搜索
title: Grok 搜索
x-i18n:
    generated_at: "2026-04-09T00:56:10Z"
    model: gpt-5.4
    provider: openai
    source_hash: ae2343012eebbe75d3ecdde3cb4470415c3275b694d0339bc26c46675a652054
    source_path: tools\grok-search.md
    workflow: 15
---

# Grok 搜索

OpenClaw 支持将 Grok 用作 `web_search` 提供商，使用 xAI 的网络 grounding
响应生成由实时搜索结果支持并带有引用的 AI 综合答案。

同一个 `XAI_API_KEY` 也可用于内置的 `x_search` 工具，以进行 X
（原 Twitter）帖子搜索。如果你将该密钥存储在
`plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在也会将其复用为
内置 xAI 模型提供商的回退配置。

对于帖子级别的 X 指标，例如转发、回复、书签或浏览量，优先使用
`x_search` 并提供精确的帖子 URL 或状态 ID，而不是宽泛的搜索
查询。

## 新手引导与配置

如果你在以下流程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以显示一个单独的后续步骤，以使用同一个
`XAI_API_KEY` 启用 `x_search`。这个后续步骤：

- 只会在你为 `web_search` 选择 Grok 后出现
- 不是一个单独的顶层网络搜索提供商选项
- 还可以在同一流程中选择性设置 `x_search` 模型

如果你跳过了该步骤，之后仍可在配置中启用或修改 `x_search`。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [xAI](https://console.x.ai/) 获取一个 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 网关环境中设置 `XAI_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // 如果已设置 XAI_API_KEY，则此项可选
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**环境变量替代方式：** 在 Gateway 网关环境中设置 `XAI_API_KEY`。
对于 Gateway 网关安装，请将其放入 `~/.openclaw/.env`。

## 工作原理

Grok 使用 xAI 的网络 grounding 响应生成带有行内
引用的综合答案，类似于 Gemini 的 Google 搜索 grounding 方式。

## 支持的参数

Grok 搜索支持 `query`。

为了兼容共享的 `web_search`，也接受 `count`，但 Grok 仍然
返回一个带引用的综合答案，而不是一个包含 N 条结果的列表。

当前不支持提供商特定过滤器。

## 相关内容

- [Web Search overview](/zh-CN/tools/web) -- 所有提供商和自动检测
- [x_search in Web Search](/zh-CN/tools/web#x_search) -- 通过 xAI 提供的一等公民 X 搜索
- [Gemini Search](/zh-CN/tools/gemini-search) -- 通过 Google grounding 提供的 AI 综合答案
