---
read_when:
    - 你想用一个 API key 访问多个 LLM
    - 你需要 Baidu Qianfan 设置指引
summary: 使用 Qianfan 的统一 API 在 OpenClaw 中访问多种模型
title: Qianfan
x-i18n:
    generated_at: "2026-04-08T06:57:11Z"
    model: gpt-5.4
    provider: openai
    source_hash: 965d83dd968563447ce3571a73bd71c6876275caff8664311a852b2f9827e55b
    source_path: providers\qianfan.md
    workflow: 15
---

# Qianfan 提供商指南

Qianfan 是 Baidu 的 MaaS 平台，提供一个**统一 API**，可通过单一端点和 API key 将请求路由到多种模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换 base URL 即可工作。

## 前提条件

1. 一个已开通 Qianfan API 访问权限的 Baidu Cloud 账号
2. 一个来自 Qianfan 控制台的 API key
3. 已在你的系统上安装 OpenClaw

## 获取你的 API key

1. 访问 [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建一个新应用或选择一个现有应用
3. 生成一个 API key（格式：`bce-v3/ALTAK-...`）
4. 复制该 API key，以便在 OpenClaw 中使用

## CLI 设置

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 配置片段

```json5
{
  env: { QIANFAN_API_KEY: "bce-v3/ALTAK-..." },
  agents: {
    defaults: {
      model: { primary: "qianfan/deepseek-v3.2" },
      models: {
        "qianfan/deepseek-v3.2": { alias: "QIANFAN" },
      },
    },
  },
  models: {
    providers: {
      qianfan: {
        baseUrl: "https://qianfan.baidubce.com/v2",
        api: "openai-completions",
        models: [
          {
            id: "deepseek-v3.2",
            name: "DEEPSEEK V3.2",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 98304,
            maxTokens: 32768,
          },
          {
            id: "ernie-5.0-thinking-preview",
            name: "ERNIE-5.0-Thinking-Preview",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 119000,
            maxTokens: 64000,
          },
        ],
      },
    },
  },
}
```

## 说明

- 默认内置模型引用：`qianfan/deepseek-v3.2`
- 默认 Base URL：`https://qianfan.baidubce.com/v2`
- 当前内置目录包含 `deepseek-v3.2` 和 `ernie-5.0-thinking-preview`
- 仅当你需要自定义 base URL 或模型元数据时，才添加或覆盖 `models.providers.qianfan`
- Qianfan 走兼容 OpenAI 的传输路径，而不是原生 OpenAI 请求整形

## 相关文档

- [OpenClaw 配置](/zh-CN/gateway/configuration)
- [模型提供商](/zh-CN/concepts/model-providers)
- [智能体设置](/zh-CN/concepts/agent)
- [Qianfan API Documentation](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
