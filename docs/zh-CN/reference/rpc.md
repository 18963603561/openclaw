---
read_when:
    - 添加或更改外部 CLI 集成
    - 调试 RPC 适配器（signal-cli、imsg）
summary: 用于外部 CLI（signal-cli、旧版 imsg）和 Gateway 网关模式的 RPC 适配器
title: RPC 适配器
x-i18n:
    generated_at: "2026-04-08T07:03:35Z"
    model: gpt-5.4
    provider: openai
    source_hash: 06dc6b97184cc704ba4ec4a9af90502f4316bcf717c3f4925676806d8b184c57
    source_path: reference\rpc.md
    workflow: 15
---

# RPC 适配器

OpenClaw 通过 JSON-RPC 集成外部 CLI。目前使用两种模式。

## 模式 A：HTTP 守护进程（signal-cli）

- `signal-cli` 作为守护进程运行，通过 HTTP 提供 JSON-RPC。
- 事件流为 SSE（`/api/v1/events`）。
- 健康探测：`/api/v1/check`。
- 当 `channels.signal.autoStart=true` 时，OpenClaw 负责其生命周期。

设置和端点请参阅 [Signal](/zh-CN/channels/signal)。

## 模式 B：stdio 子进程（旧版：imsg）

> **注意：** 对于新的 iMessage 设置，请改用 [BlueBubbles](/zh-CN/channels/bluebubbles)。

- OpenClaw 会将 `imsg rpc` 作为子进程启动（旧版 iMessage 集成）。
- JSON-RPC 通过 stdin / stdout 按行分隔传输（每行一个 JSON 对象）。
- 不需要 TCP 端口，也不需要守护进程。

使用到的 core 方法：

- `watch.subscribe` → 通知（`method: "message"`）
- `watch.unsubscribe`
- `send`
- `chats.list`（探测 / 诊断）

关于旧版设置和寻址（优先使用 `chat_id`），请参阅 [iMessage](/zh-CN/channels/imessage)。

## 适配器准则

- Gateway 网关拥有该进程（启动 / 停止与提供商生命周期绑定）。
- 保持 RPC 客户端具备弹性：超时、退出后重启。
- 优先使用稳定 ID（例如 `chat_id`），而不是显示字符串。
