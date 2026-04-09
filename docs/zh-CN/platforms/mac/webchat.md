---
read_when:
    - 调试 mac WebChat 视图或 local loopback 端口
summary: mac 应用如何嵌入 Gateway 网关 WebChat 以及如何调试它
title: WebChat（macOS）
x-i18n:
    generated_at: "2026-04-08T06:38:54Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4f2c45fa5512cc9c5d3b3aa188d94e2e5a90e4bcce607d959d40bea8b17c90c5
    source_path: platforms\mac\webchat.md
    workflow: 15
---

# WebChat（macOS 应用）

macOS 菜单栏应用将 WebChat UI 作为原生 SwiftUI 视图嵌入。它连接到 Gateway 网关，并默认使用所选智能体的**主会话**（同时提供其他会话的会话切换器）。

- **本地模式**：直接连接到本地 Gateway 网关 WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 网关控制端口，并将该隧道用作数据平面。

## 启动与调试

- 手动：Lobster 菜单 → “打开聊天”。
- 用于测试的自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh`（subsystem `ai.openclaw`，category `WebChatSwiftUI`）。

## 连接方式

- 数据平面：Gateway 网关 WS 方法 `chat.history`、`chat.send`、`chat.abort`、`chat.inject`，以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- `chat.history` 返回已针对显示进行标准化的转录行：会从可见文本中移除内联指令标签，移除纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块）以及泄露的 ASCII/全角模型控制令牌，省略纯静默令牌的助手消息行，例如精确匹配的 `NO_REPLY` / `no_reply`，并且可将过大的行替换为占位符。
- 会话：默认使用主会话（`main`，或当作用域为全局时使用 `global`）。UI 可以在不同会话之间切换。
- 新手引导使用专用会话，以保持首次运行设置彼此分离。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway 网关 WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化（不是完整的浏览器沙箱）。
