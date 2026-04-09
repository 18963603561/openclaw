---
read_when:
    - 你想让 OpenClaw 连接本地 SGLang 服务器运行
    - 你想通过自己的模型使用兼容 OpenAI 的 `/v1` 端点
summary: 通过 SGLang（兼容 OpenAI 的自托管服务器）运行 OpenClaw
title: SGLang
x-i18n:
    generated_at: "2026-04-08T06:58:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: 9850277c6c5e318e60237688b4d8a5b1387d4e9586534ae2eb6ad953abba8948
    source_path: providers\sglang.md
    workflow: 15
---

# SGLang

SGLang 可以通过**兼容 OpenAI 的** HTTP API 提供开源模型。
OpenClaw 可以使用 `openai-completions` API 连接到 SGLang。

当你通过 `SGLANG_API_KEY` 显式启用（如果你的服务器不强制认证，任意值都可以），且未定义显式 `models.providers.sglang` 条目时，OpenClaw 还可以**自动发现** SGLang 中可用的模型。

## 快速开始

1. 使用兼容 OpenAI 的服务器启动 SGLang。

你的 base URL 应暴露 `/v1` 端点（例如 `/v1/models`、
`/v1/chat/completions`）。SGLang 通常运行在：

- `http://127.0.0.1:30000/v1`

2. 显式启用（如果未配置认证，任意值都可以）：

```bash
export SGLANG_API_KEY="sglang-local"
```

3. 运行新手引导并选择 `SGLang`，或直接设置一个模型：

```bash
openclaw onboard
```

```json5
{
  agents: {
    defaults: {
      model: { primary: "sglang/your-model-id" },
    },
  },
}
```

## 模型发现（隐式提供商）

当设置了 `SGLANG_API_KEY`（或存在认证配置文件），并且你**没有**
定义 `models.providers.sglang` 时，OpenClaw 会查询：

- `GET http://127.0.0.1:30000/v1/models`

并将返回的 id 转换为模型条目。

如果你显式设置了 `models.providers.sglang`，则会跳过自动发现，
你必须手动定义模型。

## 显式配置（手动模型）

在以下情况下使用显式配置：

- SGLang 运行在不同的 host / port 上。
- 你想固定 `contextWindow` / `maxTokens` 的值。
- 你的服务器需要真实的 API 密钥（或你想控制请求头）。

```json5
{
  models: {
    providers: {
      sglang: {
        baseUrl: "http://127.0.0.1:30000/v1",
        apiKey: "${SGLANG_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local SGLang Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## 故障排除

- 检查服务器是否可访问：

```bash
curl http://127.0.0.1:30000/v1/models
```

- 如果请求因认证错误失败，请设置与你服务器配置匹配的真实 `SGLANG_API_KEY`，或在
  `models.providers.sglang` 下显式配置该提供商。

## 代理式行为

SGLang 被视为代理式、兼容 OpenAI 的 `/v1` 后端，而不是
原生 OpenAI 端点。

- 这里不适用仅限原生 OpenAI 的请求整形
- 没有 `service_tier`、没有 Responses `store`、没有提示缓存提示，也没有
  OpenAI 推理兼容负载整形
- 在自定义 SGLang base URL 上，不会注入隐藏的 OpenClaw 归因头
  （`originator`、`version`、`User-Agent`）
