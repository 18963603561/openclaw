---
read_when:
    - 你想选择一个模型提供商
    - 你需要快速了解受支持的 LLM 后端概览
summary: OpenClaw 支持的模型提供商（LLM）
title: 提供商目录
x-i18n:
    generated_at: "2026-04-08T06:52:56Z"
    model: gpt-5.4
    provider: openai
    source_hash: e7bee5528b7fc9a982b3d0eaa4930cb77f7bded19a47aec00572b6fcbd823a70
    source_path: providers\index.md
    workflow: 15
---

# 模型提供商

OpenClaw 可以使用许多 LLM 提供商。选择一个提供商，完成认证，然后将默认模型设置为 `provider/model`。

在找聊天渠道文档（WhatsApp/Telegram/Discord/Slack/Mattermost（插件）/等）？请参见 [渠道](/zh-CN/channels)。

## 快速开始

1. 使用提供商完成认证（通常通过 `openclaw onboard`）。
2. 设置默认模型：

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## 提供商文档

- [Alibaba Model Studio](/zh-CN/providers/alibaba)
- [Amazon Bedrock](/zh-CN/providers/bedrock)
- [Anthropic（API + Claude CLI）](/zh-CN/providers/anthropic)
- [Arcee AI（Trinity 模型）](/zh-CN/providers/arcee)
- [?????](/zh-CN/concepts/model-providers#byteplus-international)
- [Chutes](/zh-CN/providers/chutes)
- [ComfyUI](/zh-CN/providers/comfy)
- [Cloudflare AI Gateway](/zh-CN/providers/cloudflare-ai-gateway)
- [DeepSeek](/zh-CN/providers/deepseek)
- [fal](/zh-CN/providers/fal)
- [Fireworks](/zh-CN/providers/fireworks)
- [GitHub Copilot](/zh-CN/providers/github-copilot)
- [GLM 模型](/zh-CN/providers/glm)
- [Google（Gemini）](/zh-CN/providers/google)
- [Groq（LPU 推理）](/zh-CN/providers/groq)
- [Hugging Face（Inference）](/zh-CN/providers/huggingface)
- [inferrs（本地模型）](/zh-CN/providers/inferrs)
- [Kilocode](/zh-CN/providers/kilocode)
- [LiteLLM（统一 Gateway 网关）](/zh-CN/providers/litellm)
- [MiniMax](/zh-CN/providers/minimax)
- [Mistral](/zh-CN/providers/mistral)
- [Moonshot AI（Kimi + Kimi Coding）](/zh-CN/providers/moonshot)
- [NVIDIA](/zh-CN/providers/nvidia)
- [Ollama（云端 + 本地模型）](/zh-CN/providers/ollama)
- [OpenAI（API + Codex）](/zh-CN/providers/openai)
- [OpenCode](/zh-CN/providers/opencode)
- [OpenCode Go](/zh-CN/providers/opencode-go)
- [OpenRouter](/zh-CN/providers/openrouter)
- [Perplexity（提供商）](/zh-CN/providers/perplexity-provider)
- [Qianfan](/zh-CN/providers/qianfan)
- [Qwen Cloud](/zh-CN/providers/qwen)
- [Runway](/zh-CN/providers/runway)
- [SGLang（本地模型）](/zh-CN/providers/sglang)
- [StepFun](/zh-CN/providers/stepfun)
- [Synthetic](/zh-CN/providers/synthetic)
- [Together AI](/zh-CN/providers/together)
- [Venice（Venice AI，注重隐私）](/zh-CN/providers/venice)
- [Vercel AI Gateway](/zh-CN/providers/vercel-ai-gateway)
- [Vydra](/zh-CN/providers/vydra)
- [vLLM（本地模型）](/zh-CN/providers/vllm)
- [Volcengine（Doubao）](/zh-CN/providers/volcengine)
- [xAI](/zh-CN/providers/xai)
- [Xiaomi](/zh-CN/providers/xiaomi)
- [Z.AI](/zh-CN/providers/zai)

## 共享概览页面

- [其他内置变体](/zh-CN/providers/models#additional-bundled-provider-variants) - Anthropic Vertex、Copilot Proxy 和 Gemini CLI OAuth
- [图像生成](/zh-CN/tools/image-generation) - 共享 `image_generate` 工具、提供商选择和故障转移
- [音乐生成](/zh-CN/tools/music-generation) - 共享 `music_generate` 工具、提供商选择和故障转移
- [视频生成](/zh-CN/tools/video-generation) - 共享 `video_generate` 工具、提供商选择和故障转移

## 转写提供商

- [Deepgram（音频转写）](/zh-CN/providers/deepgram)

## 社区工具

- [Claude Max API Proxy](/zh-CN/providers/claude-max-api-proxy) - 面向 Claude 订阅凭证的社区代理（使用前请核实 Anthropic 策略/条款）

关于完整的提供商目录（xAI、Groq、Mistral 等）以及高级配置，
请参见 [模型提供商](/zh-CN/concepts/model-providers)。
