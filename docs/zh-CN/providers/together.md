---
read_when:
    - 你想在 OpenClaw 中使用 Together AI
    - 你需要 API 密钥环境变量或 CLI 认证选项
summary: Together AI 设置（认证 + 模型选择）
title: Together AI
x-i18n:
    generated_at: "2026-04-08T06:58:43Z"
    model: gpt-5.4
    provider: openai
    source_hash: b68fdc15bfcac8d59e3e0c06a39162abd48d9d41a9a64a0ac622cd8e3f80a595
    source_path: providers\together.md
    workflow: 15
---

# Together AI

[Together AI](https://together.ai) 通过统一 API 提供对领先开源模型的访问，包括 Llama、DeepSeek、Kimi 等。

- 提供商：`together`
- 认证：`TOGETHER_API_KEY`
- API：兼容 OpenAI
- Base URL：`https://api.together.xyz/v1`

## 快速开始

1. 设置 API 密钥（推荐：为 Gateway 网关存储它）：

```bash
openclaw onboard --auth-choice together-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

这会将 `together/moonshotai/Kimi-K2.5` 设置为默认模型。

## 环境说明

如果 Gateway 网关以守护进程方式运行（launchd / systemd），请确保 `TOGETHER_API_KEY`
对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供）。

## 内置目录

OpenClaw 当前内置了以下 Together 目录：

| 模型引用                                                     | 名称                                   | 输入        | 上下文长度   | 说明                             |
| ------------------------------------------------------------ | -------------------------------------- | ----------- | ------------ | -------------------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | text, image | 262,144      | 默认模型；已启用推理             |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | text        | 202,752      | 通用文本模型                     |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | text        | 131,072      | 快速指令模型                     |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | text, image | 10,000,000   | 多模态                           |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | text, image | 20,000,000   | 多模态                           |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | text        | 131,072      | 通用文本模型                     |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | text        | 131,072      | 推理模型                         |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | text        | 262,144      | 次选 Kimi 文本模型               |

新手引导预设会将 `together/moonshotai/Kimi-K2.5` 设为默认模型。

## 视频生成

内置的 `together` 插件还通过共享
`video_generate` 工具注册了视频生成功能。

- 默认视频模型：`together/Wan-AI/Wan2.2-T2V-A14B`
- 模式：文生视频和单图参考流程
- 支持 `aspectRatio` 和 `resolution`

要将 Together 用作默认视频提供商：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

有关共享工具参数、提供商选择和故障转移行为，请参见
[视频生成](/tools/video-generation)。
