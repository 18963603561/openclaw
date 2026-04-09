---
read_when:
    - 你想让 OpenClaw 连接本地 inferrs 服务器运行
    - 你正通过 inferrs 提供 Gemma 或其他模型
    - 你需要 inferrs 的精确 OpenClaw 兼容标志
summary: 通过 inferrs（兼容 OpenAI 的本地服务器）运行 OpenClaw
title: inferrs
x-i18n:
    generated_at: "2026-04-08T06:53:20Z"
    model: gpt-5.4
    provider: openai
    source_hash: d84f660d49a682d0c0878707eebe1bc1e83dd115850687076ea3938b9f9c86c6
    source_path: providers\inferrs.md
    workflow: 15
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) 可以通过兼容 OpenAI 的
`/v1` API 提供本地模型。OpenClaw 可通过通用
`openai-completions` 路径与 `inferrs` 协同工作。

当前，最好将 `inferrs` 视为一个自定义的自托管、兼容 OpenAI 的后端，
而不是一个专用的 OpenClaw 提供商插件。

## 快速开始

1. 使用一个模型启动 `inferrs`。

示例：

```bash
inferrs serve gg-hf-gg/gemma-4-E2B-it \
  --host 127.0.0.1 \
  --port 8080 \
  --device metal
```

2. 验证服务器是否可访问。

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/models
```

3. 添加一个显式的 OpenClaw 提供商条目，并将你的默认模型指向它。

## 完整配置示例

此示例在本地 `inferrs` 服务器上使用 Gemma 4。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/gg-hf-gg/gemma-4-E2B-it" },
      models: {
        "inferrs/gg-hf-gg/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "gg-hf-gg/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## 为什么 `requiresStringContent` 很重要

某些 `inferrs` 的 Chat Completions 路由只接受字符串形式的
`messages[].content`，而不接受结构化内容片段数组。

如果 OpenClaw 运行失败，并出现如下错误：

```text
messages[1].content: invalid type: sequence, expected a string
```

请设置：

```json5
compat: {
  requiresStringContent: true
}
```

OpenClaw 会在发送请求前，将纯文本内容片段压平为普通字符串。

## Gemma 与工具 schema 注意事项

某些当前的 `inferrs` + Gemma 组合可以接受较小的直接
`/v1/chat/completions` 请求，但在完整的 OpenClaw 智能体运行时
轮次中仍会失败。

如果发生这种情况，请先尝试：

```json5
compat: {
  requiresStringContent: true,
  supportsTools: false
}
```

这会为该模型禁用 OpenClaw 的工具 schema 界面，并可减少对更严格本地后端的提示压力。

如果极小的直接请求仍然可行，但正常的 OpenClaw 智能体轮次继续在
`inferrs` 内部崩溃，那么剩余问题通常属于上游模型 / 服务器行为，
而不是 OpenClaw 的传输层。

## 手动冒烟测试

配置完成后，测试这两个层面：

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"gg-hf-gg/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'

openclaw infer model run \
  --model inferrs/gg-hf-gg/gemma-4-E2B-it \
  --prompt "What is 2 + 2? Reply with one short sentence." \
  --json
```

如果第一条命令成功而第二条失败，请使用下方的故障排除说明。

## 故障排除

- `curl /v1/models` 失败：`inferrs` 未运行、无法访问，或未绑定到预期的 host / port。
- `messages[].content ... expected a string`：设置
  `compat.requiresStringContent: true`。
- 直接的小型 `/v1/chat/completions` 调用成功，但 `openclaw infer model run`
  失败：尝试 `compat.supportsTools: false`。
- OpenClaw 不再出现 schema 错误，但 `inferrs` 在更大的智能体轮次上仍然崩溃：请将其视为上游 `inferrs` 或模型限制，并减少提示压力，或切换本地后端 / 模型。

## 代理式行为

`inferrs` 被视为一个代理式、兼容 OpenAI 的 `/v1` 后端，而不是
原生 OpenAI 端点。

- 这里不适用仅限原生 OpenAI 的请求整形
- 没有 `service_tier`、没有 Responses `store`、没有提示缓存提示，也没有
  OpenAI 推理兼容负载整形
- 在自定义 `inferrs` base URL 上，不会注入隐藏的 OpenClaw 归因头
  （`originator`、`version`、`User-Agent`）

## 另请参阅

- [本地模型](/zh-CN/gateway/local-models)
- [故障排除](/zh-CN/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- [模型提供商](/zh-CN/concepts/model-providers)
