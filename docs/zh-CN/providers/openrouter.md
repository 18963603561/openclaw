---
read_when:
    - 你想用一个 API key 访问多个 LLM
    - 你想在 OpenClaw 中通过 OpenRouter 运行模型
summary: 使用 OpenRouter 的统一 API 在 OpenClaw 中访问多种模型
title: OpenRouter
x-i18n:
    generated_at: "2026-04-08T06:56:14Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8dd354ba060bcb47724c89ae17c8e2af8caecac4bd996fcddb584716c1840b87
    source_path: providers\openrouter.md
    workflow: 15
---

# OpenRouter

OpenRouter 提供了一个**统一 API**，可通过单一端点和 API key 将请求路由到多种模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可工作。

## CLI 设置

```bash
openclaw onboard --auth-choice openrouter-api-key
```

## 配置片段

```json5
{
  env: { OPENROUTER_API_KEY: "sk-or-..." },
  agents: {
    defaults: {
      model: { primary: "openrouter/auto" },
    },
  },
}
```

## 说明

- 模型引用格式为 `openrouter/<provider>/<model>`。
- 新手引导默认使用 `openrouter/auto`。之后可通过
  `openclaw models set openrouter/<provider>/<model>` 切换到具体模型。
- 更多模型/提供商选项，见 [?????](/zh-CN/concepts/model-providers)。
- OpenRouter 在底层使用你的 API key 作为 Bearer token。
- 对于真实的 OpenRouter 请求（`https://openrouter.ai/api/v1`），OpenClaw 还会
  添加 OpenRouter 文档中说明的应用归因 headers：
  `HTTP-Referer: https://openclaw.ai`、`X-OpenRouter-Title: OpenClaw` 和
  `X-OpenRouter-Categories: cli-agent`。
- 在已验证的 OpenRouter 路由上，Anthropic 模型引用还会保留
  OpenRouter 专用的 Anthropic `cache_control` 标记，这是 OpenClaw 用于
  改善 system/developer prompt 块 prompt-cache 复用的机制。
- 如果你将 OpenRouter provider 重新指向其他代理/base URL，OpenClaw
  不会注入这些 OpenRouter 专用 headers 或 Anthropic 缓存标记。
- OpenRouter 仍然走代理风格的 OpenAI 兼容路径，因此
  原生 OpenAI 专用的请求整形，例如 `serviceTier`、Responses `store`、
  OpenAI reasoning-compat 载荷和 prompt-cache 提示，不会被转发。
- 基于 Gemini 的 OpenRouter 引用会保留在 proxy-Gemini 路径上：OpenClaw 会在该路径中保留
  Gemini thought-signature 清理，但不会启用原生 Gemini
  回放校验或引导重写。
- 在受支持的非 `auto` 路由上，OpenClaw 会将所选 thinking 级别映射到
  OpenRouter 代理推理载荷。不受支持的模型提示以及
  `openrouter/auto` 会跳过该推理注入。
- 如果你在模型参数下传入 OpenRouter provider 路由，OpenClaw 会在共享流包装器运行之前
  将其作为 OpenRouter 路由元数据进行转发。
