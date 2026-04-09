---
read_when:
    - 你想让 OpenClaw 连接本地 vLLM 服务器运行
    - 你想使用兼容 OpenAI 的 `/v1` 端点运行你自己的模型
summary: 让 OpenClaw 运行在 vLLM 上（兼容 OpenAI 的本地服务器）
title: vLLM
x-i18n:
    generated_at: "2026-04-08T07:00:54Z"
    model: gpt-5.4
    provider: openai
    source_hash: ebde34d0453586d10340680b8d51465fdc98bd28e8a96acfaeb24606886b50f4
    source_path: providers\vllm.md
    workflow: 15
---

# vLLM

vLLM 可以通过**兼容 OpenAI** 的 HTTP API 提供开源模型（以及部分自定义模型）服务。OpenClaw 可以通过 `openai-completions` API 连接到 vLLM。

当你通过 `VLLM_API_KEY` 显式启用，并且没有定义显式的 `models.providers.vllm` 条目时，OpenClaw 也可以**自动发现** vLLM 上可用的模型（如果你的服务器不强制认证，`VLLM_API_KEY` 可使用任意值）。

## 快速开始

1. 以兼容 OpenAI 的服务器方式启动 vLLM。

你的 base URL 应暴露 `/v1` 端点（例如 `/v1/models`、`/v1/chat/completions`）。vLLM 常见运行地址为：

- `http://127.0.0.1:8000/v1`

2. 显式启用（如果未配置认证，任意值都可以）：

```bash
export VLLM_API_KEY="vllm-local"
```

3. 选择一个模型（替换为你的某个 vLLM 模型 ID）：

```json5
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}
```

## 模型发现（隐式 provider）

当设置了 `VLLM_API_KEY`（或存在凭证 profile），并且你**没有**定义 `models.providers.vllm` 时，OpenClaw 会查询：

- `GET http://127.0.0.1:8000/v1/models`

……并将返回的 ID 转换为模型条目。

如果你显式设置了 `models.providers.vllm`，则会跳过自动发现，你必须手动定义模型。

## 显式配置（手动模型）

在以下情况中请使用显式配置：

- vLLM 运行在不同的主机/端口上。
- 你想固定 `contextWindow`/`maxTokens` 值。
- 你的服务器需要真实 API key（或者你想控制 headers）。

```json5
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
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
curl http://127.0.0.1:8000/v1/models
```

- 如果请求因认证错误而失败，请设置与你服务器配置匹配的真实 `VLLM_API_KEY`，或者在 `models.providers.vllm` 下显式配置该 provider。

## 代理风格行为

vLLM 被视为代理风格的兼容 OpenAI `/v1` 后端，而不是原生
OpenAI 端点。

- 原生 OpenAI 专用的请求整形不适用于这里
- 没有 `service_tier`、没有 Responses `store`、没有 prompt-cache 提示，也没有
  OpenAI reasoning-compat 载荷整形
- 在自定义 vLLM base URL 上不会注入隐藏的 OpenClaw 归因 headers（`originator`、`version`、`User-Agent`）
