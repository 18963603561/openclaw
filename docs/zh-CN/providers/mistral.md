---
read_when:
    - 你想在 OpenClaw 中使用 Mistral 模型
    - 你需要 Mistral API key 新手引导和模型引用
summary: 在 OpenClaw 中使用 Mistral 模型和 Voxtral 转写
title: Mistral
x-i18n:
    generated_at: "2026-04-08T06:54:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4e32a0eb2a37dba6383ba338b06a8d0be600e7443aa916225794ccb0fdf46aee
    source_path: providers\mistral.md
    workflow: 15
---

# Mistral

OpenClaw 支持将 Mistral 同时用于文本/图像模型路由（`mistral/...`）以及通过 Voxtral 进行媒体理解中的音频转写。
Mistral 也可用于 memory embeddings（`memorySearch.provider = "mistral"`）。

## CLI 设置

```bash
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"
```

## 配置片段（LLM 提供商）

```json5
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}
```

## 内置 LLM 目录

OpenClaw 当前内置以下 Mistral 目录：

| 模型引用 | 输入 | 上下文 | 最大输出 | 说明 |
| -------------------------------- | ----------- | ------- | ---------- | ---------------------------------------------------------------- |
| `mistral/mistral-large-latest`   | text, image | 262,144 | 16,384     | 默认模型 |
| `mistral/mistral-medium-2508`    | text, image | 262,144 | 8,192      | Mistral Medium 3.1 |
| `mistral/mistral-small-latest`   | text, image | 128,000 | 16,384     | Mistral Small 4；可通过 API `reasoning_effort` 调节推理 |
| `mistral/pixtral-large-latest`   | text, image | 128,000 | 32,768     | Pixtral |
| `mistral/codestral-latest`       | text        | 256,000 | 4,096      | 编码 |
| `mistral/devstral-medium-latest` | text        | 262,144 | 32,768     | Devstral 2 |
| `mistral/magistral-small`        | text        | 128,000 | 40,000     | 启用推理 |

## 配置片段（使用 Voxtral 进行音频转写）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

## 可调节推理（`mistral-small-latest`）

`mistral/mistral-small-latest` 映射到 Mistral Small 4，并支持通过 Chat Completions API 的 `reasoning_effort` 使用[可调节推理](https://docs.mistral.ai/capabilities/reasoning/adjustable)（`none` 会尽量减少输出中的额外 thinking；`high` 会在最终答案前展示完整的 thinking 轨迹）。

OpenClaw 会将会话中的 **thinking** 级别映射到 Mistral 的 API：

- **off** / **minimal** → `none`
- **low** / **medium** / **high** / **xhigh** / **adaptive** → `high`

其他内置 Mistral 目录模型不会使用这个参数；如果你想使用 Mistral 原生以推理优先的行为，请继续使用 `magistral-*` 模型。

## 说明

- Mistral 认证使用 `MISTRAL_API_KEY`。
- provider Base URL 默认为 `https://api.mistral.ai/v1`。
- 新手引导默认模型为 `mistral/mistral-large-latest`。
- Mistral 的媒体理解默认音频模型为 `voxtral-mini-latest`。
- 媒体转写路径使用 `/v1/audio/transcriptions`。
- Memory embeddings 路径使用 `/v1/embeddings`（默认模型：`mistral-embed`）。
