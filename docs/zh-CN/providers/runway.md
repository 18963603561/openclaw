---
read_when:
    - 你想在 OpenClaw 中使用 Runway 视频生成
    - 你需要 Runway API key / 环境变量设置
    - 你想将 Runway 设为默认视频提供商
summary: OpenClaw 中的 Runway 视频生成设置
title: Runway
x-i18n:
    generated_at: "2026-04-08T06:57:43Z"
    model: gpt-5.4
    provider: openai
    source_hash: bc615d1a26f7a4b890d29461e756690c858ecb05024cf3c4d508218022da6e76
    source_path: providers\runway.md
    workflow: 15
---

# Runway

OpenClaw 内置了 `runway` 提供商，用于托管视频生成。

- 提供商 id：`runway`
- 认证：`RUNWAYML_API_SECRET`（规范写法）或 `RUNWAY_API_KEY`
- API：基于任务的 Runway 视频生成（通过 `GET /v1/tasks/{id}` 轮询）

## 快速开始

1. 设置 API key：

```bash
openclaw onboard --auth-choice runway-api-key
```

2. 将 Runway 设置为默认视频提供商：

```bash
openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5"
```

3. 让智能体生成视频。系统会自动使用 Runway。

## 支持的模式

| 模式 | 模型 | 参考输入 |
| -------------- | ------------------ | ----------------------- |
| text-to-video | `gen4.5`（默认） | 无 |
| image-to-video | `gen4.5` | 1 个本地或远程图像 |
| video-to-video | `gen4_aleph` | 1 个本地或远程视频 |

- 支持通过 data URI 使用本地图像和视频参考。
- video-to-video 当前必须使用 `runway/gen4_aleph`。
- 纯文本运行当前支持 `16:9` 和 `9:16` 宽高比。

## 配置

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## 相关内容

- [视频生成](/tools/video-generation) -- 共享工具参数、提供商选择和异步行为
- [配置参考](/gateway/configuration-reference#agent-defaults)
