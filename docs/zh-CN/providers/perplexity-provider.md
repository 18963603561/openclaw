---
read_when:
    - 你想将 Perplexity 配置为网页搜索提供商
    - 你需要 Perplexity API 密钥或 OpenRouter 代理设置
summary: Perplexity 网页搜索提供商设置（API 密钥、搜索模式、过滤）
title: Perplexity（提供商）
x-i18n:
    generated_at: "2026-04-08T06:56:50Z"
    model: gpt-5.4
    provider: openai
    source_hash: df9082d15d6a36a096e21efe8cee78e4b8643252225520f5b96a0b99cf5a7a4b
    source_path: providers\perplexity-provider.md
    workflow: 15
---

# Perplexity（网页搜索提供商）

Perplexity 插件通过 Perplexity Search API 或经由 OpenRouter 的 Perplexity Sonar 提供网页搜索能力。

<Note>
本页介绍的是 Perplexity **提供商**设置。关于 Perplexity
**工具**（即智能体如何使用它），请参见 [Perplexity 工具](/tools/perplexity-search)。
</Note>

- 类型：网页搜索提供商（不是模型提供商）
- 认证：`PERPLEXITY_API_KEY`（直连）或 `OPENROUTER_API_KEY`（通过 OpenRouter）
- 配置路径：`plugins.entries.perplexity.config.webSearch.apiKey`

## 快速开始

1. 设置 API 密钥：

```bash
openclaw configure --section web
```

或直接设置：

```bash
openclaw config set plugins.entries.perplexity.config.webSearch.apiKey "pplx-xxxxxxxxxxxx"
```

2. 配置完成后，智能体会在进行网页搜索时自动使用 Perplexity。

## 搜索模式

插件会根据 API 密钥前缀自动选择传输方式：

| 密钥前缀 | 传输方式                     | 功能                                     |
| -------- | ---------------------------- | ---------------------------------------- |
| `pplx-`  | 原生 Perplexity Search API   | 结构化结果、域名 / 语言 / 日期过滤       |
| `sk-or-` | OpenRouter（Sonar）          | 带引用的 AI 综合答案                     |

## 原生 API 过滤

使用原生 Perplexity API（`pplx-` 密钥）时，搜索支持：

- **国家**：2 位国家代码
- **语言**：ISO 639-1 语言代码
- **日期范围**：天、周、月、年
- **域名过滤**：允许列表 / 拒绝列表（最多 20 个域名）
- **内容预算**：`max_tokens`、`max_tokens_per_page`

## 环境说明

如果 Gateway 网关以守护进程方式运行（launchd / systemd），请确保
`PERPLEXITY_API_KEY` 对该进程可用（例如放在
`~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
