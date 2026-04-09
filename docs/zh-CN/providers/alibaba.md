---
read_when:
    - 你想在 OpenClaw 中使用 Alibaba Wan 视频生成
    - 你需要设置 Model Studio 或 DashScope API 密钥以进行视频生成
summary: 在 OpenClaw 中使用 Alibaba Model Studio 的 Wan 视频生成
title: Alibaba Model Studio
x-i18n:
    generated_at: "2026-04-08T06:49:29Z"
    model: gpt-5.4
    provider: openai
    source_hash: 97a1eddc7cbd816776b9368f2a926b5ef9ee543f08d151a490023736f67dc635
    source_path: providers\alibaba.md
    workflow: 15
---

# Alibaba Model Studio

OpenClaw 内置了一个 `alibaba` 视频生成提供商，用于在 Alibaba Model Studio / DashScope 上运行 Wan 模型。

- 提供商：`alibaba`
- 首选认证方式：`MODELSTUDIO_API_KEY`
- 同时接受：`DASHSCOPE_API_KEY`、`QWEN_API_KEY`
- API：DashScope / Model Studio 异步视频生成

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

2. 设置默认视频模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "alibaba/wan2.6-t2v",
      },
    },
  },
}
```

## 内置 Wan 模型

当前内置的 `alibaba` 提供商注册了以下模型：

- `alibaba/wan2.6-t2v`
- `alibaba/wan2.6-i2v`
- `alibaba/wan2.6-r2v`
- `alibaba/wan2.6-r2v-flash`
- `alibaba/wan2.7-r2v`

## 当前限制

- 每次请求最多 **1** 个输出视频
- 最多 **1** 张输入图像
- 最多 **4** 个输入视频
- 最长 **10 秒** 时长
- 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 参考图像 / 视频模式当前要求使用**远程 http(s) URL**

## 与 Qwen 的关系

内置的 `qwen` 提供商也通过 Alibaba 托管的 DashScope 端点提供 Wan 视频生成。使用方式如下：

- 当你想使用规范的 Qwen 提供商界面时，使用 `qwen/...`
- 当你想使用供应商直接拥有的 Wan 视频界面时，使用 `alibaba/...`

## 相关内容

- [视频生成](/tools/video-generation)
- [Qwen](/zh-CN/providers/qwen)
- [配置参考](/gateway/configuration-reference#agent-defaults)
