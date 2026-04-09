---
read_when:
    - 修改音频转写或媒体处理时
summary: 入站音频/语音消息如何被下载、转写并注入到回复中
title: 音频与语音消息
x-i18n:
    generated_at: "2026-04-08T06:09:12Z"
    model: gpt-5.4
    provider: openai
    source_hash: dd464df24268b1104c9bbdb6f424ba90747342b4c0f4d2e39d95055708cbd0ae
    source_path: nodes\audio.md
    workflow: 15
---

# 音频 / 语音消息（2026-01-17）

## 当前可用功能

- **媒体理解（音频）**：如果启用了音频理解（或已自动检测到可用能力），OpenClaw 会：
  1. 定位第一个音频附件（本地路径或 URL），并在需要时下载它。
  2. 在发送给每个模型条目之前强制执行 `maxBytes`。
  3. 按顺序运行第一个符合条件的模型条目（provider 或 CLI）。
  4. 如果失败或跳过（大小/超时），则尝试下一个条目。
  5. 成功后，用一个 `[Audio]` 块替换 `Body`，并设置 `{{Transcript}}`。
- **命令解析**：当转写成功时，`CommandBody`/`RawBody` 会被设置为转写文本，因此斜杠命令仍然可用。
- **详细日志**：在 `--verbose` 模式下，我们会记录转写何时运行，以及它何时替换正文。

## 自动检测（默认）

如果你**没有配置模型**，并且 `tools.media.audio.enabled` **未**设置为 `false`，
OpenClaw 会按以下顺序自动检测，并在找到第一个可用选项后停止：

1. **当前回复模型**，前提是其 provider 支持音频理解。
2. **本地 CLI**（如果已安装）
   - `sherpa-onnx-offline`（需要设置 `SHERPA_ONNX_MODEL_DIR`，其中包含 encoder/decoder/joiner/tokens）
   - `whisper-cli`（来自 `whisper-cpp`；使用 `WHISPER_CPP_MODEL` 或内置的 tiny 模型）
   - `whisper`（Python CLI；会自动下载模型）
3. **Gemini CLI**（`gemini`），使用 `read_many_files`
4. **provider 认证**
   - 已配置的 `models.providers.*` 中支持音频的条目会优先尝试
   - 内置回退顺序为：OpenAI → Groq → Deepgram → Google → Mistral

如需禁用自动检测，请设置 `tools.media.audio.enabled: false`。
如需自定义，请设置 `tools.media.audio.models`。
注意：在 macOS/Linux/Windows 上，对二进制的检测都是尽力而为；请确保 CLI 位于 `PATH` 中（我们会展开 `~`），或设置一个带有完整命令路径的显式 CLI 模型。

## 配置示例

### provider + CLI 回退（OpenAI + Whisper CLI）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        maxBytes: 20971520,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
            timeoutSeconds: 45,
          },
        ],
      },
    },
  },
}
```

### 仅 provider，并带作用域门控

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        scope: {
          default: "allow",
          rules: [{ action: "deny", match: { chatType: "group" } }],
        },
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

### 仅 provider（Deepgram）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "deepgram", model: "nova-3" }],
      },
    },
  },
}
```

### 仅 provider（Mistral Voxtral）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}
```

### 将转写内容回显到聊天中（可选启用）

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        echoTranscript: true, // default is false
        echoFormat: '📝 "{transcript}"', // optional, supports {transcript}
        models: [{ provider: "openai", model: "gpt-4o-mini-transcribe" }],
      },
    },
  },
}
```

## 说明与限制

- provider 认证遵循标准模型认证顺序（auth profiles、环境变量、`models.providers.*.apiKey`）。
- Groq 设置详情见：[Groq](/zh-CN/providers/groq)。
- 当使用 `provider: "deepgram"` 时，Deepgram 会读取 `DEEPGRAM_API_KEY`。
- Deepgram 设置详情见：[Deepgram（音频转写）](/zh-CN/providers/deepgram)。
- Mistral 设置详情见：[Mistral](/zh-CN/providers/mistral)。
- 音频 providers 可通过 `tools.media.audio` 覆盖 `baseUrl`、`headers` 和 `providerOptions`。
- 默认大小上限为 20 MB（`tools.media.audio.maxBytes`）。超出大小的音频会对该模型跳过，并尝试下一个条目。
- 小于 1024 字节的极小/空音频文件会在 provider/CLI 转写之前被跳过。
- 音频的默认 `maxChars` **未设置**（完整转写）。可设置 `tools.media.audio.maxChars` 或按条目设置 `maxChars` 以裁剪输出。
- OpenAI 的自动默认模型是 `gpt-4o-mini-transcribe`；如需更高准确率，请设置 `model: "gpt-4o-transcribe"`。
- 使用 `tools.media.audio.attachments` 可处理多个语音消息（`mode: "all"` + `maxAttachments`）。
- 转写文本可在模板中通过 `{{Transcript}}` 使用。
- `tools.media.audio.echoTranscript` 默认关闭；启用后，会在智能体处理之前先将转写确认发送回原始聊天。
- `tools.media.audio.echoFormat` 用于自定义回显文本（占位符：`{transcript}`）。
- CLI stdout 有上限（5 MB）；请保持 CLI 输出简洁。

### 代理环境支持

基于 provider 的音频转写支持标准出站代理环境变量：

- `HTTPS_PROXY`
- `HTTP_PROXY`
- `https_proxy`
- `http_proxy`

如果未设置任何代理环境变量，则使用直连出站。如果代理配置格式错误，OpenClaw 会记录一条警告并回退为直连抓取。

## 群组中的提及检测

当群聊设置了 `requireMention: true` 时，OpenClaw 现在会在检查提及**之前**先转写音频。这样即使语音消息中包含提及，也能被正确处理。

**工作方式：**

1. 如果语音消息没有文本正文，并且群组要求提及，OpenClaw 会执行一次“预检”转写。
2. 系统会在转写结果中检查提及模式（例如 `@BotName`、emoji 触发词）。
3. 如果检测到提及，消息会继续进入完整的回复流水线。
4. 转写文本会用于提及检测，因此语音消息也可以通过提及门控。

**回退行为：**

- 如果预检阶段的转写失败（超时、API 错误等），消息将根据仅文本的提及检测结果进行处理。
- 这样可确保混合消息（文本 + 音频）不会被错误丢弃。

**按 Telegram 群组/话题选择退出：**

- 设置 `channels.telegram.groups.<chatId>.disableAudioPreflight: true` 可跳过该群组的预检转写提及检查。
- 设置 `channels.telegram.groups.<chatId>.topics.<threadId>.disableAudioPreflight` 可按话题覆盖（`true` 表示跳过，`false` 表示强制启用）。
- 默认值为 `false`（当满足提及门控条件时启用预检）。

**示例：**用户在一个设置了 `requireMention: true` 的 Telegram 群组中发送一条语音消息，内容是“Hey @Claude, what's the weather?”。这条语音会先被转写，系统检测到提及，然后智能体进行回复。

## 注意事项

- 作用域规则采用首个匹配优先。`chatType` 会被规范化为 `direct`、`group` 或 `room`。
- 请确保你的 CLI 以 0 退出并输出纯文本；如果输出 JSON，需要通过 `jq -r .text` 进行处理。
- 对于 `parakeet-mlx`，如果你传入 `--output-dir`，当 `--output-format` 为 `txt`（或省略）时，OpenClaw 会读取 `<output-dir>/<media-basename>.txt`；非 `txt` 输出格式会回退为解析 stdout。
- 请保持合理的超时时间（`timeoutSeconds`，默认 60 秒），以避免阻塞回复队列。
- 预检转写仅会处理**第一个**音频附件用于提及检测。其他音频会在主媒体理解阶段处理。
