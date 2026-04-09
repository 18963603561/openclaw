---
read_when:
    - 你想为 OpenClaw 选择一个聊天渠道
    - 你需要受支持消息平台的快速概览
summary: OpenClaw 可连接的消息平台
title: 聊天渠道
x-i18n:
    generated_at: "2026-04-08T03:42:43Z"
    model: gpt-5.4
    provider: openai
    source_hash: 246ee6f16aebe751241f00102bb435978ed21f6158385aff5d8e222e30567416
    source_path: channels\index.md
    workflow: 15
---

# 聊天渠道

OpenClaw 可以通过你已经在使用的任意聊天应用与你交流。每个渠道都通过 Gateway 网关连接。
所有渠道都支持文本；媒体和 reactions 支持情况则因渠道而异。

## 受支持的渠道

- [BlueBubbles](/zh-CN/channels/bluebubbles) — **iMessage 的推荐方案**；使用 BlueBubbles macOS 服务器 REST API，支持完整功能（内置插件；编辑、撤回、特效、reactions、群组管理 —— 编辑功能目前在 macOS 26 Tahoe 上不可用）。
- [Discord](/zh-CN/channels/discord) — Discord Bot API + Gateway 网关；支持服务器、渠道和私信。
- [Feishu](/zh-CN/channels/feishu) — 通过 WebSocket 接入的 Feishu/Lark 机器人（内置插件）。
- [Google Chat](/zh-CN/channels/googlechat) — 通过 HTTP webhook 接入的 Google Chat API 应用。
- [iMessage (legacy)](/zh-CN/channels/imessage) — 通过 imsg CLI 的旧版 macOS 集成（已弃用，新部署请使用 BlueBubbles）。
- [IRC](/zh-CN/channels/irc) — 经典 IRC 服务器；支持渠道和私信，并带有配对 / allowlist 控制。
- [LINE](/zh-CN/channels/line) — LINE Messaging API 机器人（内置插件）。
- [Matrix](/zh-CN/channels/matrix) — Matrix 协议（内置插件）。
- [Mattermost](/zh-CN/channels/mattermost) — Bot API + WebSocket；支持渠道、群组、私信（内置插件）。
- [Microsoft Teams](/zh-CN/channels/msteams) — Bot Framework；支持企业场景（内置插件）。
- [Nextcloud Talk](/zh-CN/channels/nextcloud-talk) — 通过 Nextcloud Talk 实现的自托管聊天（内置插件）。
- [Nostr](/zh-CN/channels/nostr) — 通过 NIP-04 实现的去中心化私信（内置插件）。
- [QQ Bot](/zh-CN/channels/qqbot) — QQ Bot API；支持私聊、群聊和富媒体（内置插件）。
- [Signal](/zh-CN/channels/signal) — signal-cli；注重隐私。
- [Slack](/zh-CN/channels/slack) — Bolt SDK；适用于工作区应用。
- [Synology Chat](/zh-CN/channels/synology-chat) — 通过出站 + 入站 webhook 接入 Synology NAS Chat（内置插件）。
- [Telegram](/zh-CN/channels/telegram) — 通过 grammY 接入 Bot API；支持群组。
- [Tlon](/zh-CN/channels/tlon) — 基于 Urbit 的消息应用（内置插件）。
- [Twitch](/zh-CN/channels/twitch) — 通过 IRC 连接接入 Twitch 聊天（内置插件）。
- [Voice Call](/plugins/voice-call) — 通过 Plivo 或 Twilio 实现电话通信（插件，需单独安装）。
- [WebChat](/web/webchat) — 基于 WebSocket 的 Gateway 网关 WebChat UI。
- [WeChat](https://www.npmjs.com/package/@tencent-weixin/openclaw-weixin) — 通过扫码登录接入的腾讯 iLink Bot 插件；仅支持私聊。
- [WhatsApp](/zh-CN/channels/whatsapp) — 最流行；使用 Baileys，且需要 QR 配对。
- [Zalo](/zh-CN/channels/zalo) — Zalo Bot API；越南流行的消息应用（内置插件）。
- [Zalo Personal](/zh-CN/channels/zalouser) — 通过扫码登录接入的 Zalo 个人账号（内置插件）。

## 说明

- 渠道可以同时运行；配置多个渠道后，OpenClaw 会按聊天来源分别路由。
- 通常最快的设置方式是 **Telegram**（只需简单的 bot token）。WhatsApp 需要 QR 配对，并且会在磁盘上存储更多状态。
- 群组行为因渠道而异；请参阅 [群组](/zh-CN/channels/groups)。
- 出于安全考虑，会强制执行私信配对和 allowlists；请参阅 [安全](/gateway/security)。
- 故障排除：请参阅 [渠道故障排除](/zh-CN/channels/troubleshooting)。
- 模型提供商文档单独提供；请参阅 [模型提供商](/providers/models)。
