---
read_when:
    - 诊断渠道连接性或 Gateway 网关健康状态
    - 了解健康检查 CLI 命令和选项
summary: 健康检查命令与 Gateway 网关健康监控
title: 健康检查
x-i18n:
    generated_at: "2026-04-08T04:26:27Z"
    model: gpt-5.4
    provider: openai
    source_hash: b8824bca34c4d1139f043481c75f0a65d83e54008898c34cf69c6f98fd04e819
    source_path: gateway\health.md
    workflow: 15
---

# 健康检查（CLI）

用于验证渠道连接性的简明指南，无需靠猜测排查。

## 快速检查

- `openclaw status` — 本地摘要：Gateway 网关可达性/模式、更新提示、已连接渠道凭证时效、会话 + 最近活动。
- `openclaw status --all` — 完整本地诊断（只读、带颜色、可安全复制粘贴用于调试）。
- `openclaw status --deep` — 向正在运行的 Gateway 网关请求实时健康探测（`health` with `probe:true`），在支持时还包括按账户划分的渠道探测。
- `openclaw health` — 向正在运行的 Gateway 网关请求其健康状态快照（仅 WS；CLI 不会直接连接渠道 socket）。
- `openclaw health --verbose` — 强制执行实时健康探测，并打印 Gateway 网关连接详情。
- `openclaw health --json` — 机器可读的健康状态快照输出。
- 在 WhatsApp/WebChat 中发送独立消息 `/status`，无需调用智能体即可获取状态回复。
- 日志：tail `/tmp/openclaw/openclaw-*.log`，并筛选 `web-heartbeat`、`web-reconnect`、`web-auto-reply`、`web-inbound`。

## 深度诊断

- 磁盘上的凭证：`ls -l ~/.openclaw/credentials/whatsapp/<accountId>/creds.json`（`mtime` 应为最近时间）。
- 会话存储：`ls -l ~/.openclaw/agents/<agentId>/sessions/sessions.json`（该路径可在配置中覆盖）。数量和最近收件人会通过 `status` 显示。
- 重新关联流程：当日志中出现状态码 409–515 或 `loggedOut` 时，运行 `openclaw channels logout && openclaw channels login --verbose`。（注意：配对后，二维码登录流程会针对状态 515 自动重启一次。）

## 健康监控配置

- `gateway.channelHealthCheckMinutes`：Gateway 网关检查渠道健康状态的频率。默认值：`5`。设置为 `0` 可全局禁用健康监控重启。
- `gateway.channelStaleEventThresholdMinutes`：已连接渠道在被健康监控视为停滞并重启之前，允许保持空闲的最长时间。默认值：`30`。该值应大于或等于 `gateway.channelHealthCheckMinutes`。
- `gateway.channelMaxRestartsPerHour`：每个渠道/账户在滚动一小时窗口内的健康监控重启上限。默认值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全局监控启用的情况下，为特定渠道禁用健康监控重启。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多账户覆盖项，优先于渠道级设置。
- 这些按渠道划分的覆盖项适用于当前已暴露该能力的内置渠道监控：Discord、Google Chat、iMessage、Microsoft Teams、Signal、Slack、Telegram 和 WhatsApp。

## 当出现故障时

- `logged out` 或状态码 409–515 → 使用 `openclaw channels logout` 然后 `openclaw channels login` 重新关联。
- Gateway 网关不可达 → 启动它：`openclaw gateway --port 18789`（如果端口繁忙，使用 `--force`）。
- 没有入站消息 → 确认已连接手机在线，并且发送者被允许（`channels.whatsapp.allowFrom`）；对于群聊，确保允许列表 + 提及规则匹配（`channels.whatsapp.groups`、`agents.list[].groupChat.mentionPatterns`）。

## 专用 “health” 命令

`openclaw health` 会向正在运行的 Gateway 网关请求其健康状态快照（CLI 不会直接连接渠道
socket）。默认情况下，它可以返回一个较新的缓存 Gateway 网关快照；随后
Gateway 网关会在后台刷新该缓存。`openclaw health --verbose` 则会强制执行
实时探测。该命令会在可用时报告已连接凭证/认证时效、
各渠道探测摘要、会话存储摘要以及探测耗时。如果
Gateway 网关不可达，或探测失败/超时，它会以非零状态退出。

选项：

- `--json`：机器可读的 JSON 输出
- `--timeout <ms>`：覆盖默认的 10 秒探测超时
- `--verbose`：强制实时探测并打印 Gateway 网关连接详情
- `--debug`：`--verbose` 的别名

健康状态快照包含：`ok`（布尔值）、`ts`（时间戳）、`durationMs`（探测耗时）、各渠道状态、智能体可用性，以及会话存储摘要。
