---
read_when:
    - 你想在 OpenClaw 中使用 Volcano Engine 或 Doubao 模型
    - 你需要 Volcengine API 密钥设置
summary: Volcano Engine 设置（Doubao 模型、通用端点 + 编码端点）
title: Volcengine（Doubao）
x-i18n:
    generated_at: "2026-04-08T07:00:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: 85d9e737e906cd705fb31479d6b78d92b68c9218795ea9667516c1571dcaaf3a
    source_path: providers\volcengine.md
    workflow: 15
---

# Volcengine（Doubao）

Volcengine 提供商可访问运行在 Volcano Engine 上的 Doubao 模型和第三方模型，并为通用工作负载和编码工作负载提供分离的端点。

- 提供商：`volcengine`（通用）+ `volcengine-plan`（编码）
- 认证：`VOLCANO_ENGINE_API_KEY`
- API：兼容 OpenAI

## 快速开始

1. 设置 API 密钥：

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## 提供商与端点

| 提供商            | 端点                                      | 用途         |
| ----------------- | ----------------------------------------- | ------------ |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型     |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编码模型     |

这两个提供商都通过同一个 API 密钥进行配置。设置时会自动同时注册二者。

## 可用模型

通用提供商（`volcengine`）：

| 模型引用                                     | 名称                            | 输入        | 上下文长度 |
| -------------------------------------------- | ------------------------------- | ----------- | ---------- |
| `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | text, image | 256,000    |
| `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000    |
| `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | text, image | 256,000    |
| `volcengine/glm-4-7-251222`                  | GLM 4.7                         | text, image | 200,000    |
| `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | text, image | 128,000    |

编码提供商（`volcengine-plan`）：

| 模型引用                                          | 名称                     | 输入 | 上下文长度 |
| ------------------------------------------------- | ------------------------ | ---- | ---------- |
| `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | text | 256,000    |
| `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | text | 256,000    |
| `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | text | 200,000    |
| `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | text | 256,000    |
| `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | text | 256,000    |
| `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | text | 256,000    |

`openclaw onboard --auth-choice volcengine-api-key` 当前会将
`volcengine-plan/ark-code-latest` 设置为默认模型，同时也会注册通用
`volcengine` 目录。

在新手引导 / 配置流程的模型选择期间，Volcengine 认证选项会优先显示
`volcengine/*` 和 `volcengine-plan/*` 条目。如果这些模型尚未加载，
OpenClaw 会回退到未过滤的完整目录，而不是显示一个空的提供商范围选择器。

## 环境说明

如果 Gateway 网关以守护进程方式运行（launchd / systemd），请确保
`VOLCANO_ENGINE_API_KEY` 对该进程可用（例如放在
`~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
