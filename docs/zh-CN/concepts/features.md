---
read_when:
    - 你想查看 OpenClaw 支持内容的完整列表
summary: OpenClaw 在渠道、路由、媒体和用户体验方面的能力。
title: 功能
x-i18n:
    generated_at: "2026-04-08T03:59:28Z"
    model: gpt-5.4
    provider: openai
    source_hash: 43eae89d9af44ea786dd0221d8d602ebcea15da9d5064396ac9920c0345e2ad3
    source_path: concepts\features.md
    workflow: 15
---

# 功能

## 亮点

<Columns>
  <Card title="Channels" icon="message-square">
    通过单个 Gateway 网关连接 Discord、iMessage、Signal、Slack、Telegram、WhatsApp、WebChat 等。
  </Card>
  <Card title="Plugins" icon="plug">
    内置插件可添加 Matrix、Nextcloud Talk、Nostr、Twitch、Zalo 等，在当前正式版本中通常无需单独安装。
  </Card>
  <Card title="Routing" icon="route">
    具备隔离会话的多智能体路由。
  </Card>
  <Card title="Media" icon="image">
    支持图片、音频、视频、文档，以及图片 / 视频生成。
  </Card>
  <Card title="Apps and UI" icon="monitor">
    Web Control UI 和 macOS 配套应用。
  </Card>
  <Card title="Mobile nodes" icon="smartphone">
    支持 iOS 和 Android 节点，具备配对、语音 / 聊天和丰富设备命令。
  </Card>
</Columns>

## 完整列表

**渠道：**

- 内置渠道包括 Discord、Google Chat、iMessage（旧版）、IRC、Signal、Slack、Telegram、WebChat 和 WhatsApp
- 内置插件渠道包括面向 iMessage 的 BlueBubbles、Feishu、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal
- 可选的单独安装渠道插件包括 Voice Call 和第三方软件包，例如 WeChat
- 第三方渠道插件可以进一步扩展 Gateway 网关，例如 WeChat
- 支持基于提及激活的群聊
- 通过 allowlists 和配对机制保障私信安全

**智能体：**

- 带工具流式传输的嵌入式智能体运行时
- 基于工作区或发送者的多智能体路由，并具备隔离会话
- 会话：直接聊天会折叠到共享的 `main`；群组彼此隔离
- 针对长回复的流式传输和分块

**身份验证与提供商：**

- 35+ 模型提供商（Anthropic、OpenAI、Google 等）
- 通过 OAuth 实现订阅身份验证（例如 OpenAI Codex）
- 支持自定义和自托管提供商（vLLM、SGLang、Ollama，以及任何兼容 OpenAI 或 Anthropic 的端点）

**媒体：**

- 支持图片、音频、视频和文档的入站与出站
- 共享的图片生成和视频生成能力面
- 语音笔记转录
- 通过多个提供商实现文本转语音

**应用与界面：**

- WebChat 和浏览器 Control UI
- macOS 菜单栏配套应用
- iOS 节点，支持配对、Canvas、相机、录屏、定位和语音
- Android 节点，支持配对、聊天、语音、Canvas、相机和设备命令

**工具与自动化：**

- 浏览器自动化、exec、沙箱隔离
- Web 搜索（Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web 搜索、Perplexity、SearXNG、Tavily）
- Cron 作业和 heartbeat 调度
- Skills、插件和工作流流水线（Lobster）
