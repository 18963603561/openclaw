---
read_when:
    - 你想在 OpenClaw 中使用 fal 图像生成
    - 你需要 FAL_KEY 认证流程
    - 你想为 `image_generate` 或 `video_generate` 使用 fal 默认值
summary: OpenClaw 中的 fal 图像和视频生成设置
title: fal
x-i18n:
    generated_at: "2026-04-08T06:51:49Z"
    model: gpt-5.4
    provider: openai
    source_hash: 1922907d2c8360c5877a56495323d54bd846d47c27a801155e3d11e3f5706fbd
    source_path: providers\fal.md
    workflow: 15
---

# fal

OpenClaw 内置了一个 `fal` 提供商，用于托管图像和视频生成。

- 提供商：`fal`
- 认证：`FAL_KEY`（规范写法；`FAL_API_KEY` 也可作为回退方式）
- API：fal 模型端点

## 快速开始

1. 设置 API key：

```bash
openclaw onboard --auth-choice fal-api-key
```

2. 设置默认图像模型：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## 图像生成

内置的 `fal` 图像生成提供商默认使用
`fal/fal-ai/flux/dev`。

- 生成：每次请求最多 4 张图像
- 编辑模式：已启用，支持 1 张参考图像
- 支持 `size`、`aspectRatio` 和 `resolution`
- 当前编辑限制：fal 图像编辑端点**不**支持
  `aspectRatio` 覆盖

要将 fal 用作默认图像提供商：

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "fal/fal-ai/flux/dev",
      },
    },
  },
}
```

## 视频生成

内置的 `fal` 视频生成提供商默认使用
`fal/fal-ai/minimax/video-01-live`。

- 模式：text-to-video 和单图参考流程
- 运行时：针对长时间运行任务，使用基于队列的 submit / status / result 流程

要将 fal 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "fal/fal-ai/minimax/video-01-live",
      },
    },
  },
}
```

## 相关内容

- [图像生成](/zh-CN/tools/image-generation)
- [视频生成](/zh-CN/tools/video-generation)
- [配置参考](/zh-CN/gateway/configuration-reference#agent-defaults)
