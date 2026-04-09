---
read_when:
    - 你想在 OpenClaw 中使用 Vydra 媒体生成
    - 你需要 Vydra API 密钥设置指南
summary: 在 OpenClaw 中使用 Vydra 图像、视频和语音
title: Vydra
x-i18n:
    generated_at: "2026-04-08T07:00:39Z"
    model: gpt-5.4
    provider: openai
    source_hash: 24006a687ed6f9792e7b2b10927cc7ad71c735462a92ce03d5fa7c2b2ee2fcc2
    source_path: providers\vydra.md
    workflow: 15
---

# Vydra

内置的 Vydra 插件增加了以下能力：

- 通过 `vydra/grok-imagine` 进行图像生成
- 通过 `vydra/veo3` 和 `vydra/kling` 进行视频生成
- 通过 Vydra 基于 ElevenLabs 的 TTS 路由进行语音合成

OpenClaw 对这三种能力使用同一个 `VYDRA_API_KEY`。

## 重要 Base URL

请使用 `https://www.vydra.ai/api/v1`。

Vydra 的根域名 host（`https://vydra.ai/api/v1`）当前会重定向到 `www`。某些 HTTP 客户端会在这种跨 host 重定向中丢弃 `Authorization`，从而把有效的 API 密钥变成具有误导性的认证失败。内置插件直接使用 `www` base URL，以避免这个问题。

## 设置

交互式新手引导：

```bash
openclaw onboard --auth-choice vydra-api-key
```

或直接设置环境变量：

```bash
export VYDRA_API_KEY="vydra_live_..."
```

## 图像生成

默认图像模型：

- `vydra/grok-imagine`

将其设为默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "vydra/grok-imagine",
      },
    },
  },
}
```

当前内置支持仅限文生图。Vydra 托管的编辑路由要求使用远程图像 URL，而 OpenClaw 在内置插件中尚未添加 Vydra 专用上传桥接。

有关共享工具行为，请参见 [图像生成](/tools/image-generation)。

## 视频生成

已注册的视频模型：

- `vydra/veo3` 用于文生视频
- `vydra/kling` 用于图生视频

将 Vydra 设为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "vydra/veo3",
      },
    },
  },
}
```

说明：

- `vydra/veo3` 内置时仅作为文生视频支持。
- `vydra/kling` 当前要求使用远程图像 URL 作为参考。会直接拒绝本地文件上传。
- Vydra 当前的 `kling` HTTP 路由在到底要求 `image_url` 还是 `video_url` 上并不稳定；内置提供商会将同一个远程图像 URL 映射到这两个字段中。
- 内置插件保持保守，不会转发未文档化的样式控制项，例如宽高比、分辨率、水印或生成音频。

提供商专属实时覆盖测试：

```bash
OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_VYDRA_VIDEO=1 \
pnpm test:live -- extensions/vydra/vydra.live.test.ts
```

内置的 Vydra 实时测试文件现在覆盖：

- `vydra/veo3` 文生视频
- 使用远程图像 URL 的 `vydra/kling` 图生视频

需要时可覆盖远程图像夹具：

```bash
export OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL="https://example.com/reference.png"
```

有关共享工具行为，请参见 [视频生成](/tools/video-generation)。

## 语音合成

将 Vydra 设为语音提供商：

```json5
{
  messages: {
    tts: {
      provider: "vydra",
      providers: {
        vydra: {
          apiKey: "${VYDRA_API_KEY}",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
      },
    },
  },
}
```

默认值：

- 模型：`elevenlabs/tts`
- voice id：`21m00Tcm4TlvDq8ikWAM`

内置插件当前暴露一个已知可用的默认语音，并返回 MP3 音频文件。

## 相关内容

- [提供商目录](/zh-CN/providers/index)
- [图像生成](/tools/image-generation)
- [视频生成](/tools/video-generation)
