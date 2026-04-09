---
read_when:
    - 你正在使用 voice-call 插件，并想了解 CLI 入口点
    - 你想快速查看 `voicecall call|continue|status|tail|expose` 的示例
summary: '`openclaw voicecall` 的 CLI 参考（voice-call 插件命令界面）'
title: voicecall
x-i18n:
    generated_at: "2026-04-08T03:57:19Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2c99e7a3d256e1c74a0f07faba9675cc5a88b1eb2fc6e22993caf3874d4f340a
    source_path: cli\voicecall.md
    workflow: 15
---

# `openclaw voicecall`

`voicecall` 是一个由插件提供的命令。只有在安装并启用了 voice-call 插件时，它才会显示。

主要文档：

- Voice Call 插件： [Voice Call](/plugins/voice-call)

## 常用命令

```bash
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>
```

## 暴露 webhook（Tailscale）

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

安全说明：仅将 webhook 端点暴露给你信任的网络。在可能时，优先使用 Tailscale Serve，而不是 Funnel。
