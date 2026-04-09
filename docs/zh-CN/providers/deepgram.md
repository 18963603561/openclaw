---
read_when:
    - 你想为音频附件使用 Deepgram Speech-to-Text
    - 你需要一个快速的 Deepgram 配置示例
summary: 用于入站语音便笺的 Deepgram 转录
title: Deepgram
x-i18n:
    generated_at: "2026-04-08T06:51:30Z"
    model: gpt-5.4
    provider: openai
    source_hash: dabd1f6942c339fbd744fbf38040b6a663b06ddf4d9c9ee31e3ac034de9e79d9
    source_path: providers\deepgram.md
    workflow: 15
---

# Deepgram（音频转录）

Deepgram 是一个 Speech-to-Text API。在 OpenClaw 中，它用于通过 `tools.media.audio` 对**入站音频 / 语音便笺进行转录**。

启用后，OpenClaw 会将音频文件上传到 Deepgram，并将转录结果注入回复流水线（`{{Transcript}}` + `[Audio]` 块）。这**不是流式传输**；它使用的是预录音转录端点。

网站：[https://deepgram.com](https://deepgram.com)  
文档：[https://developers.deepgram.com](https://developers.deepgram.com)

## 快速开始

1. 设置你的 API key：

```
DEEPGRAM_API_KEY=dg_...
```

2. 启用该提供商：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

## 选项

- `model`：Deepgram 模型 id（默认：`nova-3`）
- `language`：语言提示（可选）
- `tools.media.audio.providerOptions.deepgram.detect_language`：启用语言检测（可选）
- `tools.media.audio.providerOptions.deepgram.punctuate`：启用标点（可选）
- `tools.media.audio.providerOptions.deepgram.smart_format`：启用智能格式化（可选）

带语言的示例：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3", language: "en" }],
      },
    },
  },
}
```

带 Deepgram 选项的示例：

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        providerOptions: {
          deepgram: {
            detect_language: true,
            punctuate: true,
            smart_format: true,
          },
        },
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

## 说明

- 认证遵循标准提供商认证顺序；`DEEPGRAM_API_KEY` 是最简单的路径。
- 使用代理时，可通过 `tools.media.audio.baseUrl` 和 `tools.media.audio.headers` 覆盖端点或 headers。
- 输出遵循与其他提供商相同的音频规则（大小上限、超时和转录注入）。
