---
read_when:
    - 调试 mac 应用健康状态指示器
summary: macOS 应用如何报告 gateway/Baileys 健康状态
title: 健康检查（macOS）
x-i18n:
    generated_at: "2026-04-08T06:14:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: f9223b2bbe272b32526f79cf878510ac5104e788402d94a1b1627e72c5fbebf5
    source_path: platforms\mac\health.md
    workflow: 15
---

# macOS 上的健康检查

如何从菜单栏应用中查看已关联渠道是否健康。

## 菜单栏

- 状态圆点现在会反映 Baileys 健康状态：
  - 绿色：已关联 + socket 最近成功打开。
  - 橙色：正在连接/重试中。
  - 红色：已登出或探测失败。
- 次级文本会显示“已关联 · 认证 12 分钟”，或显示失败原因。
- “Run Health Check” 菜单项会触发按需探测。

## 设置

- General 标签页新增一个健康卡片，显示：已关联认证时长、会话存储路径/数量、上次检查时间、上次错误/状态码，以及 Run Health Check / Reveal Logs 按钮。
- 使用缓存快照，因此 UI 可即时加载，并且在离线时也能优雅回退。
- **Channels 标签页**会显示渠道状态 + WhatsApp/Telegram 的控制项（登录二维码、登出、探测、上次断开/错误）。

## 探测的工作方式

- 应用会通过 `ShellExecutor` 大约每 60 秒运行一次 `openclaw health --json`，也支持按需运行。该探测会加载凭据并报告状态，但不会发送消息。
- 分别缓存上一次成功快照和上一次错误，以避免闪烁；并显示各自的时间戳。

## 如果仍不确定

- 你仍然可以使用 [健康检查](/zh-CN/gateway/health) 中的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`），并查看 `/tmp/openclaw/openclaw-*.log` 中 `web-heartbeat` / `web-reconnect` 的日志尾部。
