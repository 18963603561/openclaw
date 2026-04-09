---
read_when:
    - 在 macOS/iOS/Android 上实现 Talk 模式
    - 修改语音/ TTS /打断行为
summary: Talk 模式：通过 ElevenLabs TTS 进行连续语音对话
title: Talk 模式
x-i18n:
    generated_at: "2026-04-08T06:10:30Z"
    model: gpt-5.4
    provider: openai
    source_hash: 3f10a3e9ee8fc2b4f7a89771d6e7b7373166a51ef9e9aa2d8c5ea67fc0729f9d
    source_path: nodes\talk.md
    workflow: 15
---

# Talk 模式

Talk 模式是一个连续语音对话循环：

1. 监听语音
2. 将转录发送给模型（主会话，`chat.send`）
3. 等待响应
4. 通过已配置的 Talk 提供商进行播报（`talk.speak`）

## 行为（macOS）

- 当 Talk 模式启用时，显示**常驻悬浮层**。
- 在 **Listening → Thinking → Speaking** 阶段之间切换。
- 在**短暂停顿**（静音窗口）后，发送当前转录内容。
- 回复会被**写入 WebChat**（与手动输入相同）。
- **语音打断**（默认开启）：如果用户在助手说话时开始讲话，我们会停止播放，并为下一次提示记录打断时间戳。

## 回复中的语音指令

助手可以在回复前添加**单行 JSON** 前缀，以控制语音：

```json
{ "voice": "<voice-id>", "once": true }
```

规则：

- 仅第一条非空行生效。
- 未知键会被忽略。
- `once: true` 仅应用于当前回复。
- 如果没有 `once`，该语音会成为 Talk 模式新的默认语音。
- 在 TTS 播放前，这一行 JSON 会被剥离。

支持的键：

- `voice` / `voice_id` / `voiceId`
- `model` / `model_id` / `modelId`
- `speed`、`rate`（WPM）、`stability`、`similarity`、`style`、`speakerBoost`
- `seed`、`normalize`、`lang`、`output_format`、`latency_tier`
- `once`

## 配置（`~/.openclaw/openclaw.json`）

```json5
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}
```

默认值：

- `interruptOnSpeech`：true
- `silenceTimeoutMs`：未设置时，Talk 会在发送转录前保持平台默认暂停窗口（`macOS 和 Android 为 700 ms，iOS 为 900 ms`）
- `voiceId`：回退到 `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID`（或者在 API key 可用时使用第一个 ElevenLabs 语音）
- `modelId`：未设置时默认为 `eleven_v3`
- `apiKey`：回退到 `ELEVENLABS_API_KEY`（或在可用时回退到 Gateway 网关 shell profile）
- `outputFormat`：在 macOS/iOS 上默认是 `pcm_44100`，在 Android 上默认是 `pcm_24000`（设置 `mp3_*` 可强制使用 MP3 流式传输）

## macOS UI

- 菜单栏开关：**Talk**
- 配置标签页：**Talk 模式** 分组（voice id + 打断开关）
- 悬浮层：
  - **Listening**：云朵会随着麦克风音量脉冲变化
  - **Thinking**：下沉动画
  - **Speaking**：向外辐射的环形动画
  - 点击云朵：停止播报
  - 点击 X：退出 Talk 模式

## 说明

- 需要 Speech 和 Microphone 权限。
- 使用针对会话键 `main` 的 `chat.send`。
- Gateway 网关会通过活动的 Talk 提供商使用 `talk.speak` 解析 Talk 播放。仅当该 RPC 不可用时，Android 才会回退到本地系统 TTS。
- `eleven_v3` 的 `stability` 仅接受 `0.0`、`0.5` 或 `1.0`；其他模型接受 `0..1`。
- 设置 `latency_tier` 时，会将其校验为 `0..4`。
- Android 支持 `pcm_16000`、`pcm_22050`、`pcm_24000` 和 `pcm_44100` 输出格式，用于低延迟 `AudioTrack` 流式播放。
