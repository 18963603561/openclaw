---
read_when:
    - 你想在 OpenClaw 中使用 Bedrock Mantle 托管的 OSS 模型
    - 你需要用于 GPT-OSS、Qwen、Kimi 或 GLM 的 Mantle OpenAI 兼容端点
summary: 在 OpenClaw 中使用 Amazon Bedrock Mantle（OpenAI 兼容）模型
title: Amazon Bedrock Mantle
x-i18n:
    generated_at: "2026-04-08T06:50:31Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4e5b33ede4067fb7de02a046f3e375cbd2af4bf68e7751c8dd687447f1a78c86
    source_path: providers\bedrock-mantle.md
    workflow: 15
---

# Amazon Bedrock Mantle

OpenClaw 内置了 **Amazon Bedrock Mantle** 提供商，用于连接到 Mantle 的 OpenAI 兼容端点。Mantle 通过由 Bedrock 基础设施支持的标准 `/v1/chat/completions` 接口托管开源模型和第三方模型（GPT-OSS、Qwen、Kimi、GLM 等）。

## OpenClaw 支持的内容

- 提供商：`amazon-bedrock-mantle`
- API：`openai-completions`（OpenAI 兼容）
- 认证：显式 `AWS_BEARER_TOKEN_BEDROCK`，或通过 IAM 凭证链生成 bearer token
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型发现

设置了 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 会直接使用它。否则，OpenClaw 会尝试从 AWS 默认凭证链生成 Mantle bearer token，其中包括共享凭证 / 配置 profile、SSO、Web identity，以及实例或任务角色。然后它会通过查询该区域的 `/v1/models` 端点来发现可用的 Mantle 模型。发现结果会缓存 1 小时，而基于 IAM 派生的 bearer token 会按小时刷新。

支持的区域：`us-east-1`、`us-east-2`、`us-west-2`、`ap-northeast-1`、
`ap-south-1`、`ap-southeast-3`、`eu-central-1`、`eu-west-1`、`eu-west-2`、
`eu-south-1`、`eu-north-1`、`sa-east-1`。

## 新手引导

1. 在**Gateway 网关主机**上选择一种认证路径：

显式 bearer token：

```bash
export AWS_BEARER_TOKEN_BEDROCK="..."
# Optional (defaults to us-east-1):
export AWS_REGION="us-west-2"
```

IAM 凭证：

```bash
# Any AWS SDK-compatible auth source works here, for example:
export AWS_PROFILE="default"
export AWS_REGION="us-west-2"
```

2. 验证模型已被发现：

```bash
openclaw models list
```

发现的模型会显示在 `amazon-bedrock-mantle` 提供商下。除非你想覆盖默认值，否则不需要额外配置。

## 手动配置

如果你更喜欢显式配置而不是自动发现：

```json5
{
  models: {
    providers: {
      "amazon-bedrock-mantle": {
        baseUrl: "https://bedrock-mantle.us-east-1.api.aws/v1",
        api: "openai-completions",
        auth: "api-key",
        apiKey: "env:AWS_BEARER_TOKEN_BEDROCK",
        models: [
          {
            id: "gpt-oss-120b",
            name: "GPT-OSS 120B",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 32000,
            maxTokens: 4096,
          },
        ],
      },
    },
  },
}
```

## 说明

- 当未设置 `AWS_BEARER_TOKEN_BEDROCK` 时，OpenClaw 可以基于与 AWS SDK 兼容的 IAM 凭证为你签发 Mantle bearer token。
- 这个 bearer token 与标准 [Amazon Bedrock](/zh-CN/providers/bedrock) 提供商使用的 `AWS_BEARER_TOKEN_BEDROCK` 相同。
- 是否支持 reasoning 会根据模型 ID 中是否包含 `thinking`、`reasoner` 或 `gpt-oss-120b` 等模式来推断。
- 如果 Mantle 端点不可用，或未返回任何模型，该提供商会被静默跳过。
