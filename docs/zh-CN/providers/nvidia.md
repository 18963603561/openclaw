---
read_when:
    - 你想在 OpenClaw 中免费使用开放模型
    - 你需要设置 NVIDIA_API_KEY
summary: 在 OpenClaw 中使用 NVIDIA 兼容 OpenAI 的 API
title: NVIDIA
x-i18n:
    generated_at: "2026-04-08T06:55:56Z"
    model: gpt-5.4
    provider: openai
    source_hash: b00f8cedaf223a33ba9f6a6dd8cf066d88cebeea52d391b871e435026182228a
    source_path: providers\nvidia.md
    workflow: 15
---

# NVIDIA

NVIDIA 在 `https://integrate.api.nvidia.com/v1` 提供兼容 OpenAI 的 API，可免费使用开放模型。请使用从 [build.nvidia.com](https://build.nvidia.com/settings/api-keys) 获取的 API key 进行认证。

## CLI 设置

先导出 key，然后运行新手引导并设置一个 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b
```

如果你仍然使用 `--token`，请记住它会进入 shell 历史记录和 `ps` 输出；在可能情况下，优先使用环境变量。

## 配置片段

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## 模型 ID

| 模型引用 | 名称 | 上下文 | 最大输出 |
| ------------------------------------------ | ---------------------------- | ------- | ---------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144 | 8,192      |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144 | 8,192      |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608 | 8,192      |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752 | 8,192      |

## 说明

- 兼容 OpenAI 的 `/v1` 端点；请使用从 [build.nvidia.com](https://build.nvidia.com/) 获取的 API key。
- 设置 `NVIDIA_API_KEY` 后，provider 会自动启用。
- 内置目录是静态的；源码中的成本默认值为 `0`。
