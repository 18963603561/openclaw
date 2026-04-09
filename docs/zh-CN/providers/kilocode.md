---
read_when:
    - 你想用一个 API key 访问多个 LLM
    - 你想在 OpenClaw 中通过 Kilo Gateway 运行模型
summary: 使用 Kilo Gateway 的统一 API 在 OpenClaw 中访问多种模型
title: Kilo Gateway
x-i18n:
    generated_at: "2026-04-08T06:53:21Z"
    model: gpt-5.4
    provider: openai
    source_hash: 857266967b4a7553d501990631df2bae0f849d061521dc9f34e29687ecb94884
    source_path: providers\kilocode.md
    workflow: 15
---

# Kilo Gateway

Kilo Gateway 提供了一个**统一 API**，可通过单一端点和 API key 将请求路由到多种模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可工作。

## 获取 API key

1. 前往 [app.kilo.ai](https://app.kilo.ai)
2. 登录或创建账号
3. 进入 API Keys 页面并生成一个新 key

## CLI 设置

```bash
openclaw onboard --auth-choice kilocode-api-key
```

或者设置环境变量：

```bash
export KILOCODE_API_KEY="<your-kilocode-api-key>" # pragma: allowlist secret
```

## 配置片段

```json5
{
  env: { KILOCODE_API_KEY: "<your-kilocode-api-key>" }, // pragma: allowlist secret
  agents: {
    defaults: {
      model: { primary: "kilocode/kilo/auto" },
    },
  },
}
```

## 默认模型

默认模型是 `kilocode/kilo/auto`，这是一个由 Kilo Gateway 管理的 provider 自有智能路由模型。

OpenClaw 将 `kilocode/kilo/auto` 视为稳定的默认引用，但不会公布从任务到上游模型映射的源码支撑关系。

## 可用模型

OpenClaw 会在启动时从 Kilo Gateway 动态发现可用模型。使用
`/models kilocode` 查看你的账号可用的完整模型列表。

Gateway 上可用的任何模型都可以使用 `kilocode/` 前缀：

```
kilocode/kilo/auto              (default - smart routing)
kilocode/anthropic/claude-sonnet-4
kilocode/openai/gpt-5.4
kilocode/google/gemini-3-pro-preview
...and many more
```

## 说明

- 模型引用格式为 `kilocode/<model-id>`（例如 `kilocode/anthropic/claude-sonnet-4`）。
- 默认模型：`kilocode/kilo/auto`
- Base URL：`https://api.kilo.ai/api/gateway/`
- 内置回退目录始终包含 `kilocode/kilo/auto`（`Kilo Auto`），其属性为
  `input: ["text", "image"]`、`reasoning: true`、`contextWindow: 1000000`
  以及 `maxTokens: 128000`
- 启动时，OpenClaw 会尝试请求 `GET https://api.kilo.ai/api/gateway/models`，并将发现到的模型合并到静态回退目录之前
- `kilocode/kilo/auto` 背后的精确上游路由由 Kilo Gateway 管理，
  并非在 OpenClaw 中硬编码
- 源码中将 Kilo Gateway 记录为兼容 OpenRouter，因此它会保留在
  代理风格的 OpenAI 兼容路径上，而不是使用原生 OpenAI 请求整形
- 基于 Gemini 的 Kilo 引用会保留在 proxy-Gemini 路径上，因此 OpenClaw 会在该路径中保留
  Gemini thought-signature 清理，而不会启用原生 Gemini
  回放校验或引导重写。
- Kilo 的共享流包装器会添加 provider app header，并为受支持的具体模型引用标准化
  代理推理载荷。`kilocode/kilo/auto`
  以及其他不支持代理推理的提示会跳过该推理注入。
- 更多模型/提供商选项，见 [/concepts/model-providers](/zh-CN/concepts/model-providers)。
- Kilo Gateway 在底层使用你的 API key 作为 Bearer token。
