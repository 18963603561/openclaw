---
read_when:
    - 你想在 OpenClaw 中使用 Hugging Face Inference
    - 你需要 HF token 环境变量或 CLI 认证选项
summary: Hugging Face Inference 设置（认证 + 模型选择）
title: Hugging Face（Inference）
x-i18n:
    generated_at: "2026-04-08T06:53:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: 692d2caffbaf991670260da393c67ae7e6349b9e1e3ed5cb9a514f8a77192e86
    source_path: providers\huggingface.md
    workflow: 15
---

# Hugging Face（Inference）

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 通过单一路由 API 提供兼容 OpenAI 的 chat completions。你只需一个 token，即可访问许多模型（DeepSeek、Llama 等）。OpenClaw 使用的是**兼容 OpenAI 的端点**（仅 chat completions）；对于 text-to-image、embeddings 或 Speech，请直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

- 提供商：`huggingface`
- 认证：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（具备 **Make calls to Inference Providers** 权限的细粒度 token）
- API：OpenAI 兼容（`https://router.huggingface.co/v1`）
- 计费：单个 HF token；[定价](https://huggingface.co/docs/inference-providers/pricing) 按提供商费率执行，并带有免费层。

## 快速开始

1. 在 [Hugging Face → Settings → Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 创建一个细粒度 token，并授予 **Make calls to Inference Providers** 权限。
2. 运行新手引导，并在提供商下拉框中选择 **Hugging Face**，然后在提示时输入你的 API key：

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. 在 **Default Hugging Face model** 下拉框中，选择你想要的模型（当你拥有有效 token 时，该列表会从 Inference API 加载；否则会显示内置列表）。你的选择会被保存为默认模型。
4. 你也可以稍后在配置中设置或更改默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这会将 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 环境说明

如果 Gateway 网关作为守护进程运行（launchd / systemd），请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`
对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供）。

## 模型发现与新手引导下拉框

OpenClaw 会通过**直接调用 Inference 端点**来发现模型：

```bash
GET https://router.huggingface.co/v1/models
```

（可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；某些端点在未认证时只会返回子集。）响应是 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

当你配置了 Hugging Face API key（通过新手引导、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）后，OpenClaw 会使用这个 GET 请求来发现可用的 chat-completion 模型。在**交互式设置**期间，当你输入 token 后，你会看到一个 **Default Hugging Face model** 下拉框，其内容来自该列表（如果请求失败，则回退到内置目录）。在运行时（例如 Gateway 网关启动期间），只要存在 key，OpenClaw 就会再次调用 **GET** `https://router.huggingface.co/v1/models` 来刷新目录。该列表会与内置目录合并（以补充上下文窗口和成本等元数据）。如果请求失败或未设置 key，则只使用内置目录。

## 模型名称和可编辑选项

- **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称会通过 **GET /v1/models** 进行“水合”；否则会从模型 id 推导（例如 `deepseek-ai/DeepSeek-R1` → “DeepSeek R1”）。
- **覆盖显示名称：** 你可以在配置中为每个模型设置自定义标签，使其在 CLI 和 UI 中按你的希望显示：

```json5
{
  agents: {
    defaults: {
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
        "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
      },
    },
  },
}
```

- **策略后缀：** OpenClaw 当前内置的 Hugging Face 文档和 helper 将以下两个后缀视为内置策略变体：
  - **`:fastest`** —— 最高吞吐量。
  - **`:cheapest`** —— 每输出 token 成本最低。

  你可以将它们作为单独条目添加到 `models.providers.huggingface.models` 中，或在 `model.primary` 中带上该后缀。你也可以在 [Inference Provider settings](https://hf.co/settings/inference-providers) 中设置默认提供商顺序（无后缀 = 使用该顺序）。

- **配置合并：** `models.providers.huggingface.models` 中已有的条目（例如在 `models.json` 中）在配置合并时会被保留。因此，你在那里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

## 模型 ID 和配置示例

模型引用使用 `huggingface/<org>/<model>` 形式（Hub 风格 ID）。下表来自 **GET** `https://router.huggingface.co/v1/models`；你的目录中可能还包含更多模型。

**示例 ID（来自 inference 端点）：**

| 模型 | 引用（前缀加上 `huggingface/`） |
| ---------------------- | ----------------------------------- |
| DeepSeek R1 | `deepseek-ai/DeepSeek-R1` |
| DeepSeek V3.2 | `deepseek-ai/DeepSeek-V3.2` |
| Qwen3 8B | `Qwen/Qwen3-8B` |
| Qwen2.5 7B Instruct | `Qwen/Qwen2.5-7B-Instruct` |
| Qwen3 32B | `Qwen/Qwen3-32B` |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct | `meta-llama/Llama-3.1-8B-Instruct` |
| GPT-OSS 120B | `openai/gpt-oss-120b` |
| GLM 4.7 | `zai-org/GLM-4.7` |
| Kimi K2.5 | `moonshotai/Kimi-K2.5` |

你可以给模型 id 追加 `:fastest` 或 `:cheapest`。请在 [Inference Provider settings](https://hf.co/settings/inference-providers) 中设置你的默认顺序；完整列表请参阅 [Inference Providers](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models`。

### 完整配置示例

**以 DeepSeek R1 为主模型，并回退到 Qwen：**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-R1",
        fallbacks: ["huggingface/Qwen/Qwen3-8B"],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
      },
    },
  },
}
```

**将 Qwen 设为默认，并带有 `:cheapest` 和 `:fastest` 变体：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen3-8B" },
      models: {
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
        "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
        "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
      },
    },
  },
}
```

**带别名的 DeepSeek + Llama + GPT-OSS：**

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
        fallbacks: [
          "huggingface/meta-llama/Llama-3.3-70B-Instruct",
          "huggingface/openai/gpt-oss-120b",
        ],
      },
      models: {
        "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
        "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
        "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
      },
    },
  },
}
```

**多个带策略后缀的 Qwen 和 DeepSeek 模型：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
      models: {
        "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
        "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
        "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
        "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
      },
    },
  },
}
```
