---
read_when:
    - 调试或配置 WebChat 访问
summary: 用于聊天 UI 的 loopback WebChat 静态宿主与 Gateway WebSocket 使用方式
title: WebChat
x-i18n:
    generated_at: "2026-04-09T01:04:41Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2588be04e9ae38149bdf284bf4d75b6784d63899026d2351c4e0e7efdf05ff39
    source_path: web\webchat.md
    workflow: 15
---

# WebChat（Gateway WebSocket UI）

状态：macOS/iOS SwiftUI 聊天 UI 会直接连接到 Gateway WebSocket。

## 它是什么

- 一个面向 gateway 的原生聊天 UI（没有嵌入式浏览器，也没有本地静态服务器）。
- 使用与其他渠道相同的会话和路由规则。
- 确定性路由：回复始终会返回到 WebChat。

## 快速开始

1. 启动 gateway。
2. 打开 WebChat UI（macOS/iOS 应用）或 Control UI 聊天标签页。
3. 确保已配置有效的 gateway 认证路径（默认使用共享密钥，
   即使在 loopback 上也是如此）。

## 工作原理（行为）

- UI 会连接到 Gateway WebSocket，并使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 为了稳定性会进行边界控制：Gateway 可能会截断较长的文本字段、省略较重的元数据，并将超大条目替换为 `[chat.history omitted: message too large]`。
- `chat.history` 也会进行显示规范化：可见文本中会去除内联投递指令标签，
  例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`，以及纯文本工具调用 XML
  载荷（包括 `<tool_call>...</tool_call>`、
  `<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
  `<function_calls>...</function_calls>` 和被截断的工具调用块），还会去除泄漏的 ASCII/全角模型控制 token；
  对于可见文本完整内容仅为精确静默 token `NO_REPLY` / `no_reply` 的 assistant 条目，则会被省略。
- `chat.inject` 会将一条 assistant 备注直接附加到转录中，并广播到 UI（不会触发智能体运行）。
- 已中止的运行仍可能在 UI 中保留部分 assistant 输出可见。
- 当存在缓冲输出时，Gateway 会将已中止的部分 assistant 文本持久化到转录历史中，并为这些条目标记中止元数据。
- 历史始终从 gateway 获取（不会监视本地文件）。
- 如果 gateway 不可达，WebChat 将变为只读。

## Control UI 智能体工具面板

- Control UI 的 `/agents` 工具面板有两个独立视图：
  - **Available Right Now** 使用 `tools.effective(sessionKey=...)`，显示当前
    会话在运行时实际可以使用的内容，包括核心、插件和渠道持有的工具。
  - **Tool Configuration** 使用 `tools.catalog`，并保持聚焦于配置文件、覆盖项和
    catalog 语义。
- 运行时可用性是按会话划分的。在同一个智能体上切换会话，可能会改变
  **Available Right Now** 列表。
- 配置编辑器并不意味着运行时一定可用；实际访问权限仍遵循策略优先级
  （`allow`/`deny`，以及按智能体和提供商/渠道划分的覆盖）。

## 远程使用

- 远程模式会通过 SSH/Tailscale 对 gateway WebSocket 进行隧道传输。
- 你不需要运行单独的 WebChat 服务器。

## 配置参考（WebChat）

完整配置请参见：[配置](/zh-CN/gateway/configuration)

WebChat 选项：

- `gateway.webchat.chatHistoryMaxChars`：`chat.history` 响应中文本字段的最大字符数。当转录条目超过此限制时，Gateway 会截断较长文本字段，并可能将超大消息替换为占位符。客户端也可以在单次 `chat.history` 调用中发送按请求生效的 `maxChars`，以覆盖此默认值。

相关全局选项：

- `gateway.port`、`gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：
  共享密钥 WebSocket 认证。
- `gateway.auth.allowTailscale`：启用时，浏览器 Control UI 聊天标签页可以使用 Tailscale
  Serve 身份头。
- `gateway.auth.mode: "trusted-proxy"`：用于位于身份感知**非 loopback**代理源之后的浏览器客户端的反向代理认证（参见 [Trusted Proxy Auth](/zh-CN/gateway/trusted-proxy-auth)）。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储和主键默认值。
