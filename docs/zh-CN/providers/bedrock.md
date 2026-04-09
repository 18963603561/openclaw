---
read_when:
    - 你想在 OpenClaw 中使用 Amazon Bedrock 模型
    - 你需要为模型调用设置 AWS 凭证 / 区域
summary: 在 OpenClaw 中使用 Amazon Bedrock（Converse API）模型
title: Amazon Bedrock
x-i18n:
    generated_at: "2026-04-08T06:51:02Z"
    model: gpt-5.4
    provider: openai
    source_hash: 70bb29fe9199084b1179ced60935b5908318f5b80ced490bf44a45e0467c4929
    source_path: providers\bedrock.md
    workflow: 15
---

# Amazon Bedrock

OpenClaw 可以通过 pi‑ai 的 **Bedrock Converse** 流式提供商使用 **Amazon Bedrock** 模型。Bedrock 认证使用的是 **AWS SDK 默认凭证链**，而不是 API 密钥。

## pi-ai 支持的内容

- 提供商：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 认证：AWS 凭证（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型发现

OpenClaw 可以自动发现支持**流式传输**和**文本输出**的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels` 和 `bedrock:ListInferenceProfiles`，结果会被缓存（默认：1 小时）。

隐式提供商的启用方式如下：

- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 为 `true`，即使不存在 AWS 环境变量标记，OpenClaw 也会尝试发现。
- 如果 `plugins.entries.amazon-bedrock.config.discovery.enabled` 未设置，OpenClaw 仅会在看到以下 AWS 认证标记之一时自动添加隐式 Bedrock 提供商：
  `AWS_BEARER_TOKEN_BEDROCK`、`AWS_ACCESS_KEY_ID` +
  `AWS_SECRET_ACCESS_KEY`，或 `AWS_PROFILE`。
- 实际的 Bedrock 运行时认证路径仍然使用 AWS SDK 默认链，因此即使发现过程需要通过 `enabled: true` 显式启用，共享配置、SSO 和 IMDS 实例角色认证仍然可以工作。

配置选项位于 `plugins.entries.amazon-bedrock.config.discovery` 下：

```json5
{
  plugins: {
    entries: {
      "amazon-bedrock": {
        config: {
          discovery: {
            enabled: true,
            region: "us-east-1",
            providerFilter: ["anthropic", "amazon"],
            refreshInterval: 3600,
            defaultContextWindow: 32000,
            defaultMaxTokens: 4096,
          },
        },
      },
    },
  },
}
```

说明：

- `enabled` 默认为自动模式。在自动模式下，OpenClaw 仅会在看到受支持的 AWS 环境变量标记时启用隐式 Bedrock 提供商。
- `region` 默认取 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，然后回退到 `us-east-1`。
- `providerFilter` 匹配 Bedrock 提供商名称（例如 `anthropic`）。
- `refreshInterval` 的单位是秒；设置为 `0` 可禁用缓存。
- `defaultContextWindow`（默认：`32000`）和 `defaultMaxTokens`（默认：`4096`）会用于已发现模型（如果你明确知道模型限制，可以覆盖）。
- 对于显式的 `models.providers["amazon-bedrock"]` 条目，OpenClaw 仍然可以通过 `AWS_BEARER_TOKEN_BEDROCK` 等 AWS 环境变量标记提前解析 Bedrock 环境变量标记认证，而无需强制加载完整运行时认证。实际模型调用的认证路径仍使用 AWS SDK 默认链。

## 新手引导

1. 确保 AWS 凭证在 **Gateway 网关 host** 上可用：

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# Optional:
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# Optional (Bedrock API key/bearer token):
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2. 在你的配置中添加一个 Bedrock 提供商和模型（不需要 `apiKey`）：

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "us.anthropic.claude-opus-4-6-v1:0",
            name: "Claude Opus 4.6 (Bedrock)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
    },
  },
}
```

## EC2 实例角色

当你在附加了 IAM 角色的 EC2 实例上运行 OpenClaw 时，AWS SDK 可以使用实例元数据服务（IMDS）进行认证。对于 Bedrock 模型发现，除非你显式设置
`plugins.entries.amazon-bedrock.config.discovery.enabled: true`，否则 OpenClaw 只会根据 AWS 环境变量标记自动启用隐式提供商。

对使用 IMDS 的 host，推荐如下设置：

- 将 `plugins.entries.amazon-bedrock.config.discovery.enabled` 设为 `true`。
- 设置 `plugins.entries.amazon-bedrock.config.discovery.region`（或导出 `AWS_REGION`）。
- **不需要**伪造 API 密钥。
- 只有在你明确想为自动模式或状态界面提供环境变量标记时，才需要 `AWS_PROFILE=default`。

```bash
# Recommended: explicit discovery enable + region
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# Optional: add an env marker if you want auto mode without explicit enable
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 实例角色所需的 **IAM 权限**：

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（用于自动发现）
- `bedrock:ListInferenceProfiles`（用于推理配置文件发现）

或者附加托管策略 `AmazonBedrockFullAccess`。

## 快速设置（AWS 路径）

```bash
# 1. Create IAM role and instance profile
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. Attach to your EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. On the EC2 instance, enable discovery explicitly
openclaw config set plugins.entries.amazon-bedrock.config.discovery.enabled true
openclaw config set plugins.entries.amazon-bedrock.config.discovery.region us-east-1

# 4. Optional: add an env marker if you want auto mode without explicit enable
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. Verify models are discovered
openclaw models list
```

## 推理配置文件

OpenClaw 会在基础模型之外，一并发现**区域性和全局推理配置文件**。当某个配置文件映射到已知基础模型时，该配置文件会继承该模型的能力（上下文窗口、最大 token、推理、视觉），并自动注入正确的 Bedrock 请求区域。这意味着跨区域的 Claude 配置文件无需手动覆盖提供商设置也能正常工作。

推理配置文件 id 的形式如 `us.anthropic.claude-opus-4-6-v1:0`（区域性）
或 `anthropic.claude-opus-4-6-v1:0`（全局）。如果其后端模型已经出现在发现结果中，该配置文件会继承其完整能力集；否则会应用安全默认值。

不需要额外配置。只要启用了发现，且 IAM 主体拥有 `bedrock:ListInferenceProfiles` 权限，配置文件就会与基础模型一起出现在 `openclaw models list` 中。

## 说明

- Bedrock 要求你在 AWS 账户 / 区域中启用**模型访问权限**。
- 自动发现需要 `bedrock:ListFoundationModels` 和
  `bedrock:ListInferenceProfiles` 权限。
- 如果你依赖自动模式，请在 gateway host 上设置受支持的 AWS 认证环境变量标记之一。如果你更倾向于使用无环境变量标记的 IMDS / 共享配置认证，请设置
  `plugins.entries.amazon-bedrock.config.discovery.enabled: true`。
- OpenClaw 会按以下顺序展示凭证来源：`AWS_BEARER_TOKEN_BEDROCK`，
  然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，再然后是 `AWS_PROFILE`，最后是默认 AWS SDK 链。
- 是否支持推理取决于具体模型；请查看对应 Bedrock 模型卡以了解当前能力。
- 如果你更喜欢托管密钥流程，也可以在 Bedrock 前面放一个兼容 OpenAI 的代理，然后将其配置为一个 OpenAI 提供商。

## Guardrails

你可以通过在 `amazon-bedrock` 插件配置中添加一个 `guardrail` 对象，将 [Amazon Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
应用到所有 Bedrock 模型调用中。Guardrails 可让你强制执行内容过滤、主题拒绝、词语过滤、敏感信息过滤和上下文基础校验。

```json5
{
  plugins: {
    entries: {
      "amazon-bedrock": {
        config: {
          guardrail: {
            guardrailIdentifier: "abc123", // guardrail ID or full ARN
            guardrailVersion: "1", // version number or "DRAFT"
            streamProcessingMode: "sync", // optional: "sync" or "async"
            trace: "enabled", // optional: "enabled", "disabled", or "enabled_full"
          },
        },
      },
    },
  },
}
```

- `guardrailIdentifier`（必填）接受 guardrail ID（例如 `abc123`）或完整 ARN（例如 `arn:aws:bedrock:us-east-1:123456789012:guardrail/abc123`）。
- `guardrailVersion`（必填）指定要使用的已发布版本，或使用 `"DRAFT"` 表示工作草稿。
- `streamProcessingMode`（可选）控制在流式传输期间，guardrail 校验是同步运行（`"sync"`）还是异步运行（`"async"`）。如果省略，Bedrock 会使用其默认行为。
- `trace`（可选）在 API 响应中启用 guardrail trace 输出。调试时设为 `"enabled"` 或 `"enabled_full"`；生产环境中省略或设为 `"disabled"`。

Gateway 网关使用的 IAM 主体除了标准调用权限外，还必须拥有 `bedrock:ApplyGuardrail` 权限。

## 用于记忆搜索的 Embeddings

Bedrock 也可以作为 [memory search](/zh-CN/concepts/memory-search) 的 embedding 提供商。这与推理提供商是分开配置的 —— 将 `agents.defaults.memorySearch.provider` 设为 `"bedrock"`：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0", // default
      },
    },
  },
}
```

Bedrock embeddings 与推理使用相同的 AWS SDK 凭证链（实例角色、SSO、访问密钥、共享配置和 Web identity）。不需要 API 密钥。当 `provider` 为 `"auto"` 时，如果该凭证链能够成功解析，就会自动检测 Bedrock。

受支持的 embedding 模型包括 Amazon Titan Embed（v1、v2）、Amazon Nova Embed、Cohere Embed（v3、v4）以及 TwelveLabs Marengo。完整模型列表和维度选项请参见
[记忆配置参考 —— Bedrock](/zh-CN/reference/memory-config#bedrock-embedding-config)。
