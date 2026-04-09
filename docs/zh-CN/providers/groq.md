---
read_when:
    - 你想在 OpenClaw 中使用 Groq
    - 你需要 API key 环境变量或 CLI 认证选项
summary: Groq 设置（认证 + 模型选择）
title: Groq
x-i18n:
    generated_at: "2026-04-08T06:52:23Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7e27532cafcdaf1ac336fa310e08e4e3245d2d0eb0e94e0bcf42c532c6a9a80b
    source_path: providers\groq.md
    workflow: 15
---

# Groq

[Groq](https://groq.com) 使用定制 LPU 硬件，在开源模型
（Llama、Gemma、Mistral 等）上提供超高速推理。OpenClaw 通过其兼容 OpenAI 的 API 连接到 Groq。

- Provider：`groq`
- 认证：`GROQ_API_KEY`
- API：兼容 OpenAI

## 快速开始

1. 在 [console.groq.com/keys](https://console.groq.com/keys) 获取 API key。

2. 设置 API key：

```bash
export GROQ_API_KEY="gsk_..."
```

3. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 配置文件示例

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## 音频转写

Groq 还提供基于 Whisper 的快速音频转写。当将其配置为媒体理解 provider 时，OpenClaw 会通过共享 `tools.media.audio`
接口，使用 Groq 的 `whisper-large-v3-turbo`
模型来转写语音消息。

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

## 环境说明

如果 Gateway 网关作为 daemon 运行（launchd/systemd），请确保 `GROQ_API_KEY` 对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。

## 音频说明

- 共享配置路径：`tools.media.audio`
- 默认 Groq 音频 Base URL：`https://api.groq.com/openai/v1`
- 默认 Groq 音频模型：`whisper-large-v3-turbo`
- Groq 音频转写使用兼容 OpenAI 的 `/audio/transcriptions`
  路径

## 可用模型

Groq 的模型目录变化较快。运行 `openclaw models list | grep groq`
可查看当前可用模型，或查阅
[console.groq.com/docs/models](https://console.groq.com/docs/models)。

热门选择包括：

- **Llama 3.3 70B Versatile** - 通用型，大上下文
- **Llama 3.1 8B Instant** - 快速、轻量
- **Gemma 2 9B** - 紧凑、高效
- **Mixtral 8x7B** - MoE 架构，推理能力强

## 链接

- [Groq Console](https://console.groq.com)
- [API Documentation](https://console.groq.com/docs)
- [Model List](https://console.groq.com/docs/models)
- [Pricing](https://groq.com/pricing)
