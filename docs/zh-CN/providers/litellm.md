---
read_when:
    - 你想通过 LiteLLM 代理路由 OpenClaw
    - 你需要通过 LiteLLM 实现成本跟踪、日志记录或模型路由
summary: 通过 LiteLLM Proxy 运行 OpenClaw，以实现统一模型访问和成本跟踪
title: LiteLLM
x-i18n:
    generated_at: "2026-04-08T06:53:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4e8ca73458186285bc06967b397b8a008791dc58eea1159d6c358e1a794982d1
    source_path: providers\litellm.md
    workflow: 15
---

# LiteLLM

[LiteLLM](https://litellm.ai) 是一个开源 LLM Gateway 网关，为 100 多个模型提供商提供统一 API。将 OpenClaw 通过 LiteLLM 路由后，你可以获得集中式成本跟踪、日志记录，以及在不更改 OpenClaw 配置的情况下切换后端的灵活性。

## 为什么要将 LiteLLM 与 OpenClaw 配合使用？

- **成本跟踪** —— 精确查看 OpenClaw 在所有模型上的支出
- **模型路由** —— 无需修改配置即可在 Claude、GPT-4、Gemini、Bedrock 之间切换
- **虚拟密钥** —— 为 OpenClaw 创建带有支出限制的密钥
- **日志记录** —— 用于调试的完整请求 / 响应日志
- **回退** —— 当主提供商不可用时自动故障切换

## 快速开始

### 通过新手引导

```bash
openclaw onboard --auth-choice litellm-api-key
```

### 手动设置

1. 启动 LiteLLM Proxy：

```bash
pip install 'litellm[proxy]'
litellm --model claude-opus-4-6
```

2. 将 OpenClaw 指向 LiteLLM：

```bash
export LITELLM_API_KEY="your-litellm-key"

openclaw
```

就是这样。OpenClaw 现在会通过 LiteLLM 路由。

## 配置

### 环境变量

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### 配置文件

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## 虚拟密钥

为 OpenClaw 创建一个带有支出限制的专用密钥：

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "openclaw",
    "max_budget": 50.00,
    "budget_duration": "monthly"
  }'
```

将生成的密钥用作 `LITELLM_API_KEY`。

## 模型路由

LiteLLM 可以将模型请求路由到不同后端。请在你的 LiteLLM `config.yaml` 中配置：

```yaml
model_list:
  - model_name: claude-opus-4-6
    litellm_params:
      model: claude-opus-4-6
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: os.environ/OPENAI_API_KEY
```

OpenClaw 会继续请求 `claude-opus-4-6` —— LiteLLM 会负责路由。

## 查看使用情况

检查 LiteLLM 的仪表板或 API：

```bash
# Key info
curl "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-litellm-key"

# Spend logs
curl "http://localhost:4000/spend/logs" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

## 说明

- LiteLLM 默认运行在 `http://localhost:4000`
- OpenClaw 通过 LiteLLM 的代理式 OpenAI 兼容 `/v1`
  端点进行连接
- 通过 LiteLLM 时，不会应用原生 OpenAI 专属请求整形：
  不支持 `service_tier`、Responses `store`、提示缓存提示，也不支持
  OpenAI reasoning 兼容载荷整形
- 不会在自定义 LiteLLM base URL 上注入隐藏的 OpenClaw 归因 headers（`originator`、`version`、`User-Agent`）

## 另请参阅

- [LiteLLM 文档](https://docs.litellm.ai)
- [模型提供商](/zh-CN/concepts/model-providers)
