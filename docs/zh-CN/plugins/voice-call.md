---
read_when:
    - 你想从 OpenClaw 发起一个呼出语音通话
    - 你正在配置或开发 voice-call 插件
summary: Voice Call 插件：通过 Twilio/Telnyx/Plivo 进行呼出 + 呼入通话（插件安装 + 配置 + CLI）
title: Voice Call 插件
x-i18n:
    generated_at: "2026-04-08T06:49:22Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4e6d10c9fde6ce1f51637af285edc0c710e9cb7702231c0a91b527b721eaddc1
    source_path: plugins\voice-call.md
    workflow: 15
---

# Voice Call（插件）

通过插件为 OpenClaw 提供语音通话。支持呼出通知以及带有呼入策略的多轮对话。

当前 provider：

- `twilio`（Programmable Voice + Media Streams）
- `telnyx`（Call Control v2）
- `plivo`（Voice API + XML transfer + GetInput speech）
- `mock`（开发/无网络）

快速理解模型：

- 安装插件
- 重启 Gateway 网关
- 在 `plugins.entries.voice-call.config` 下进行配置
- 使用 `openclaw voicecall ...` 或 `voice_call` 工具

## 它运行在哪里（本地 vs 远程）

Voice Call 插件运行在**Gateway 网关进程内部**。

如果你使用远程 Gateway 网关，请在**运行 Gateway 网关的机器**上安装/配置该插件，然后重启 Gateway 网关以加载它。

## 安装

### 选项 A：从 npm 安装（推荐）

```bash
openclaw plugins install @openclaw/voice-call
```

之后重启 Gateway 网关。

### 选项 B：从本地文件夹安装（开发用途，不复制）

```bash
PLUGIN_SRC=./path/to/local/voice-call-plugin
openclaw plugins install "$PLUGIN_SRC"
cd "$PLUGIN_SRC" && pnpm install
```

之后重启 Gateway 网关。

## 配置

在 `plugins.entries.voice-call.config` 下设置配置：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio", // or "telnyx" | "plivo" | "mock"
          fromNumber: "+15550001234",
          toNumber: "+15550005678",

          twilio: {
            accountSid: "ACxxxxxxxx",
            authToken: "...",
          },

          telnyx: {
            apiKey: "...",
            connectionId: "...",
            // Telnyx webhook public key from the Telnyx Mission Control Portal
            // (Base64 string; can also be set via TELNYX_PUBLIC_KEY).
            publicKey: "...",
          },

          plivo: {
            authId: "MAxxxxxxxxxxxxxxxxxxxx",
            authToken: "...",
          },

          // Webhook server
          serve: {
            port: 3334,
            path: "/voice/webhook",
          },

          // Webhook security (recommended for tunnels/proxies)
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
            trustedProxyIPs: ["100.64.0.1"],
          },

          // Public exposure (pick one)
          // publicUrl: "https://example.ngrok.app/voice/webhook",
          // tunnel: { provider: "ngrok" },
          // tailscale: { mode: "funnel", path: "/voice/webhook" }

          outbound: {
            defaultMode: "notify", // notify | conversation
          },

          streaming: {
            enabled: true,
            provider: "openai", // optional; first registered realtime transcription provider when unset
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
            preStartTimeoutMs: 5000,
            maxPendingConnections: 32,
            maxPendingConnectionsPerIp: 4,
            maxConnections: 128,
          },
        },
      },
    },
  },
}
```

说明：

- Twilio/Telnyx 需要一个**可公开访问**的 webhook URL。
- Plivo 需要一个**可公开访问**的 webhook URL。
- `mock` 是一个本地开发 provider（不发起网络调用）。
- 如果旧配置仍使用 `provider: "log"`、`twilio.from` 或旧版 `streaming.*` OpenAI 键，请运行 `openclaw doctor --fix` 进行改写。
- 除非 `skipSignatureVerification` 为 true，否则 Telnyx 需要 `telnyx.publicKey`（或 `TELNYX_PUBLIC_KEY`）。
- `skipSignatureVerification` 仅用于本地测试。
- 如果你使用 ngrok 免费层，请将 `publicUrl` 设置为精确的 ngrok URL；签名校验始终会被强制执行。
- `tunnel.allowNgrokFreeTierLoopbackBypass: true` 仅在 `tunnel.provider="ngrok"` 且 `serve.bind` 为 loopback（ngrok 本地 agent）时，允许带有无效签名的 Twilio webhook。仅用于本地开发。
- ngrok 免费层 URL 可能变化，或增加中间页行为；如果 `publicUrl` 漂移，Twilio 签名将失效。生产环境中，优先使用稳定域名或 Tailscale funnel。
- 流式传输安全默认值：
  - `streaming.preStartTimeoutMs` 会关闭那些从未发送有效 `start` frame 的 socket。
- `streaming.maxPendingConnections` 限制未经认证、启动前 socket 的总数。
- `streaming.maxPendingConnectionsPerIp` 限制每个源 IP 未经认证、启动前 socket 的数量。
- `streaming.maxConnections` 限制已打开媒体流 socket 的总数（包括待启动和活动中的）。
- 运行时回退目前仍接受这些旧版 voice-call 键，但推荐的改写路径是 `openclaw doctor --fix`，兼容 shim 只是临时方案。

## 流式转写

`streaming` 用于为实时通话音频选择一个实时转写 provider。

当前运行时行为：

- `streaming.provider` 是可选的。未设置时，Voice Call 会使用第一个已注册的实时转写 provider。
- 当前内置 provider 是 OpenAI，由内置 `openai` 插件注册。
- provider 自有的原始配置位于 `streaming.providers.<providerId>` 下。
- 如果 `streaming.provider` 指向一个未注册的 provider，或者根本没有注册任何实时转写 provider，Voice Call 会记录一条警告，并跳过媒体流式处理，而不是让整个插件失败。

OpenAI 流式转写默认值：

- API key：`streaming.providers.openai.apiKey` 或 `OPENAI_API_KEY`
- model：`gpt-4o-transcribe`
- `silenceDurationMs`：`800`
- `vadThreshold`：`0.5`

示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "openai",
            streamPath: "/voice/stream",
            providers: {
              openai: {
                apiKey: "sk-...", // optional if OPENAI_API_KEY is set
                model: "gpt-4o-transcribe",
                silenceDurationMs: 800,
                vadThreshold: 0.5,
              },
            },
          },
        },
      },
    },
  },
}
```

旧版键仍可通过 `openclaw doctor --fix` 自动迁移：

- `streaming.sttProvider` → `streaming.provider`
- `streaming.openaiApiKey` → `streaming.providers.openai.apiKey`
- `streaming.sttModel` → `streaming.providers.openai.model`
- `streaming.silenceDurationMs` → `streaming.providers.openai.silenceDurationMs`
- `streaming.vadThreshold` → `streaming.providers.openai.vadThreshold`

## 过期通话清理器

使用 `staleCallReaperSeconds` 来结束那些从未收到终态 webhook 的通话
（例如永远未完成的 notify 模式通话）。默认值为 `0`
（禁用）。

推荐范围：

- **生产环境：** 对于 notify 风格流程，使用 `120`–`300` 秒。
- 请将该值设置为**高于 `maxDurationSeconds`**，以便正常通话能够完成。一个合适的起点是 `maxDurationSeconds + 30–60` 秒。

示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          maxDurationSeconds: 300,
          staleCallReaperSeconds: 360,
        },
      },
    },
  },
}
```

## Webhook 安全

当代理或隧道位于 Gateway 网关前方时，插件会重建公开 URL
以进行签名校验。这些选项用于控制信任哪些转发头。

`webhookSecurity.allowedHosts` 用于对转发头中的 host 建立 allowlist。

`webhookSecurity.trustForwardingHeaders` 在没有 allowlist 的情况下信任转发头。

`webhookSecurity.trustedProxyIPs` 仅在请求的远端 IP 匹配列表时
才信任转发头。

Twilio 和 Plivo 启用了 webhook 重放保护。被重放的有效 webhook
请求会被确认，但会跳过其副作用处理。

Twilio 会话轮次会在 `<Gather>` 回调中携带每轮专属 token，因此
过期/重放的语音回调不能满足较新的待处理转写轮次。

对于未经认证的 webhook 请求，如果缺少 provider 要求的签名头，
则会在读取请求体之前直接拒绝。

voice-call webhook 在签名校验前使用共享的预认证请求体配置文件（64 KB / 5 秒）
以及按 IP 的并发上限。

使用稳定公开 host 的示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          publicUrl: "https://voice.example.com/voice/webhook",
          webhookSecurity: {
            allowedHosts: ["voice.example.com"],
          },
        },
      },
    },
  },
}
```

## 通话 TTS

Voice Call 会使用核心 `messages.tts` 配置来为通话中的
流式语音播放提供支持。你也可以在插件配置下用**相同结构**
进行覆盖——它会与 `messages.tts` 进行深度合并。

```json5
{
  tts: {
    provider: "elevenlabs",
    providers: {
      elevenlabs: {
        voiceId: "pMsXgVXv3BLzUgSXRplE",
        modelId: "eleven_multilingual_v2",
      },
    },
  },
}
```

说明：

- 插件配置中的旧版 `tts.<provider>` 键（`openai`、`elevenlabs`、`microsoft`、`edge`）会在加载时自动迁移到 `tts.providers.<provider>`。在提交到仓库的配置中，优先使用 `providers` 结构。
- **Microsoft speech 会被语音通话忽略**（电话音频需要 PCM；当前的 Microsoft 传输不暴露电话 PCM 输出）。
- 当启用 Twilio 媒体流时，会使用核心 TTS；否则，通话将回退到 provider 原生语音。
- 如果一个 Twilio 媒体流已经处于活动状态，Voice Call 不会回退到 TwiML `<Say>`。在这种状态下，如果电话 TTS 不可用，播放请求会失败，而不会混用两条播放路径。
- 当电话 TTS 回退到次级 provider 时，Voice Call 会记录一条带有 provider 链（`from`、`to`、`attempts`）的警告日志，便于调试。

### 更多示例

仅使用核心 TTS（不覆盖）：

```json5
{
  messages: {
    tts: {
      provider: "openai",
      providers: {
        openai: { voice: "alloy" },
      },
    },
  },
}
```

仅对通话覆盖为 ElevenLabs（保留其他地方的核心默认值）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "elevenlabs_key",
                voiceId: "pMsXgVXv3BLzUgSXRplE",
                modelId: "eleven_multilingual_v2",
              },
            },
          },
        },
      },
    },
  },
}
```

仅覆盖通话的 OpenAI model（深度合并示例）：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          tts: {
            providers: {
              openai: {
                model: "gpt-4o-mini-tts",
                voice: "marin",
              },
            },
          },
        },
      },
    },
  },
}
```

## 呼入通话

呼入策略默认是 `disabled`。若要启用呼入通话，请设置：

```json5
{
  inboundPolicy: "allowlist",
  allowFrom: ["+15550001234"],
  inboundGreeting: "Hello! How can I help?",
}
```

`inboundPolicy: "allowlist"` 是一种低保障的来电号码筛选。插件会对
provider 提供的 `From` 值进行标准化，并将其与 `allowFrom` 进行比较。
webhook 校验用于验证 provider 投递和载荷完整性，但它并不能证明 PSTN/VoIP 来电号码所有权。请将 `allowFrom` 视为来电显示过滤，而不是强身份认证。

自动回复使用智能体系统。可通过以下项进行调优：

- `responseModel`
- `responseSystemPrompt`
- `responseTimeoutMs`

### 语音输出契约

对于自动回复，Voice Call 会向系统提示附加一个严格的语音输出契约：

- `{"spoken":"..."}`

随后，Voice Call 会以防御性方式提取语音文本：

- 忽略被标记为推理/错误内容的载荷。
- 解析直接 JSON、带围栏的 JSON，或内联 `"spoken"` 键。
- 回退到纯文本，并移除疑似规划/元信息的开头段落。

这样可以让语音播放聚焦于面向来电者的文本，并避免将规划文本泄露到音频中。

### 会话启动行为

对于呼出 `conversation` 通话，首条消息处理与实时播放状态绑定：

- 仅在初始问候语正在主动播放时，才会抑制 barge-in 队列清理和自动回复。
- 如果初始播放失败，通话会返回 `listening` 状态，并保留首条消息以供重试。
- 对于 Twilio 流式传输，初始播放会在流连接建立时立即开始，不增加额外延迟。

### Twilio 流断开宽限期

当 Twilio 媒体流断开时，Voice Call 会等待 `2000ms` 后再自动结束通话：

- 如果在该时间窗口内流重新连接，则会取消自动结束。
- 如果宽限期结束后仍未重新注册任何流，则会结束该通话，以防止活跃通话卡住。

## CLI

```bash
openclaw voicecall call --to "+15555550123" --message "Hello from OpenClaw"
openclaw voicecall start --to "+15555550123"   # alias for call
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall speak --call-id <id> --message "One moment"
openclaw voicecall end --call-id <id>
openclaw voicecall status --call-id <id>
openclaw voicecall tail
openclaw voicecall latency                     # summarize turn latency from logs
openclaw voicecall expose --mode funnel
```

`latency` 会从默认的 voice-call 存储路径读取 `calls.jsonl`。
使用 `--file <path>` 指向不同日志，使用 `--last <n>` 将分析范围限制为最近 N 条记录（默认 200）。
输出包括轮次延迟和监听等待时间的 p50/p90/p99。

## 智能体工具

工具名称：`voice_call`

动作：

- `initiate_call`（message、to?、mode?）
- `continue_call`（callId、message）
- `speak_to_user`（callId、message）
- `end_call`（callId）
- `get_status`（callId）

此仓库在 `skills/voice-call/SKILL.md` 中附带了匹配的 skill 文档。

## Gateway 网关 RPC

- `voicecall.initiate`（`to?`、`message`、`mode?`）
- `voicecall.continue`（`callId`、`message`）
- `voicecall.speak`（`callId`、`message`）
- `voicecall.end`（`callId`）
- `voicecall.status`（`callId`）
