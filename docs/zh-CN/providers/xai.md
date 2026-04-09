---
read_when:
    - 你想在 OpenClaw 中使用 Grok 模型
    - 你正在配置 xAI 认证或模型 id
summary: 在 OpenClaw 中使用 xAI Grok 模型
title: xAI
x-i18n:
    generated_at: "2026-04-08T07:02:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: 64bc899655427cc10bdc759171c7d1ec25ad9f1e4f9d803f1553d3d586c6d71d
    source_path: providers\xai.md
    workflow: 15
---

# xAI

OpenClaw 内置了一个用于 Grok 模型的 `xai` 提供商插件。

## 设置

1. 在 xAI 控制台中创建一个 API key。
2. 设置 `XAI_API_KEY`，或运行：

```bash
openclaw onboard --auth-choice xai-api-key
```

3. 选择一个模型，例如：

```json5
{
  agents: { defaults: { model: { primary: "xai/grok-4" } } },
}
```

OpenClaw 现在使用 xAI Responses API 作为内置的 xAI 传输方式。同一个
`XAI_API_KEY` 也可以为基于 Grok 的 `web_search`、一等公民 `x_search` 以及远程 `code_execution` 提供支持。
如果你将 xAI key 存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，
内置的 xAI 模型提供商现在也会将该 key 作为回退方式复用。
`code_execution` 调优配置位于 `plugins.entries.xai.config.codeExecution` 下。

## 当前内置模型目录

OpenClaw 现在默认内置以下 xAI 模型家族：

- `grok-3`、`grok-3-fast`、`grok-3-mini`、`grok-3-mini-fast`
- `grok-4`、`grok-4-0709`
- `grok-4-fast`、`grok-4-fast-non-reasoning`
- `grok-4-1-fast`、`grok-4-1-fast-non-reasoning`
- `grok-4.20-beta-latest-reasoning`、`grok-4.20-beta-latest-non-reasoning`
- `grok-code-fast-1`

当较新的 `grok-4*` 和 `grok-code-fast*` id
遵循相同 API 结构时，该插件也会向前解析这些 id。

快速模型说明：

- `grok-4-fast`、`grok-4-1-fast` 以及 `grok-4.20-beta-*` 变体，是当前内置目录中具备图像能力的 Grok 引用。
- `/fast on` 或 `agents.defaults.models["xai/<model>"].params.fastMode: true`
  会按如下方式重写原生 xAI 请求：
  - `grok-3` -> `grok-3-fast`
  - `grok-3-mini` -> `grok-3-mini-fast`
  - `grok-4` -> `grok-4-fast`
  - `grok-4-0709` -> `grok-4-fast`

旧版兼容别名仍会被规范化为内置的规范 id。例如：

- `grok-4-fast-reasoning` -> `grok-4-fast`
- `grok-4-1-fast-reasoning` -> `grok-4-1-fast`
- `grok-4.20-reasoning` -> `grok-4.20-beta-latest-reasoning`
- `grok-4.20-non-reasoning` -> `grok-4.20-beta-latest-non-reasoning`

## Web 搜索

内置的 `grok` Web 搜索提供商也使用 `XAI_API_KEY`：

```bash
openclaw config set tools.web.search.provider grok
```

## 视频生成

内置的 `xai` 插件也会通过共享的
`video_generate` 工具注册视频生成。

- 默认视频模型：`xai/grok-imagine-video`
- 模式：text-to-video、image-to-video，以及远程视频编辑 / 延展流程
- 支持 `aspectRatio` 和 `resolution`
- 当前限制：不接受本地视频 buffer；对于视频参考 / 编辑输入，请使用远程 `http(s)`
  URL

要将 xAI 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "xai/grok-imagine-video",
      },
    },
  },
}
```

关于共享工具参数、提供商选择和故障切换行为，请参阅 [视频生成](/tools/video-generation)。

## 已知限制

- 当前认证仅支持 API key。OpenClaw 还没有提供 xAI OAuth / 设备码流程。
- `grok-4.20-multi-agent-experimental-beta-0304` 在常规 xAI 提供商路径上不受支持，因为它需要与标准 OpenClaw xAI 传输不同的上游 API 能力面。

## 说明

- OpenClaw 会在共享 runner 路径上自动应用 xAI 专属的工具 schema 和工具调用兼容性修复。
- 原生 xAI 请求默认启用 `tool_stream: true`。设置
  `agents.defaults.models["xai/<model>"].params.tool_stream` 为 `false`
  可将其禁用。
- 内置的 xAI wrapper 会在发送原生 xAI 请求之前，去除不受支持的 strict 工具 schema 标志和 reasoning 载荷键。
- `web_search`、`x_search` 和 `code_execution` 以 OpenClaw 工具形式暴露。OpenClaw 会在每次工具请求中启用它所需的特定 xAI 内置能力，而不是把所有原生工具附加到每一轮聊天中。
- `x_search` 和 `code_execution` 由内置 xAI 插件拥有，而不是硬编码在 core 模型运行时中。
- `code_execution` 是远程 xAI 沙箱执行，不是本地 [`exec`](/tools/exec)。
- 更广泛的提供商概览请参阅 [模型提供商](/zh-CN/providers/index)。
