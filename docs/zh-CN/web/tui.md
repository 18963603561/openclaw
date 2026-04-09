---
read_when:
    - 你想要一份对初学者友好的 TUI 操作指南
    - 你需要完整的 TUI 功能、命令和快捷键列表
summary: 终端 UI（TUI）：从任意机器连接到 Gateway 网关
title: TUI
x-i18n:
    generated_at: "2026-04-09T01:04:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: a73f70d65ecc7bff663e8df28c07d70d2920d4732fbb8288c137d65b8653ac52
    source_path: web\tui.md
    workflow: 15
---

# TUI（终端用户界面）

## 快速开始

1. 启动 Gateway 网关。

```bash
openclaw gateway
```

2. 打开 TUI。

```bash
openclaw tui
```

3. 输入一条消息并按 Enter。

远程 Gateway 网关：

```bash
openclaw tui --url ws://<host>:<port> --token <gateway-token>
```

如果你的 Gateway 网关使用 password 认证，请使用 `--password`。

## 你会看到什么

- Header：连接 URL、当前智能体、当前会话。
- 聊天日志：用户消息、助手回复、系统通知、工具卡片。
- 状态行：连接 / 运行状态（connecting、running、streaming、idle、error）。
- Footer：连接状态 + 智能体 + 会话 + model + think / fast / verbose / reasoning + token 计数 + deliver。
- 输入框：带自动补全的文本编辑器。

## 心智模型：智能体 + 会话

- 智能体是唯一 slug（例如 `main`、`research`）。Gateway 网关会暴露这个列表。
- 会话属于当前智能体。
- 会话键按 `agent:<agentId>:<sessionKey>` 的形式存储。
  - 如果你输入 `/session main`，TUI 会将其展开为 `agent:<currentAgent>:main`。
  - 如果你输入 `/session agent:other:main`，你会显式切换到那个智能体会话。
- 会话作用域：
  - `per-sender`（默认）：每个智能体有多个会话。
  - `global`：TUI 始终使用 `global` 会话（选择器可能为空）。
- 当前智能体 + 会话始终显示在 Footer 中。

## 发送与投递

- 消息会发送到 Gateway 网关；默认不会投递给提供商。
- 打开投递：
  - `/deliver on`
  - 或在 Settings 面板中开启
  - 或启动时使用 `openclaw tui --deliver`

## 选择器与覆盖层

- Model 选择器：列出可用模型并设置会话覆盖项。
- 智能体选择器：选择另一个智能体。
- 会话选择器：只显示当前智能体的会话。
- Settings：切换 deliver、工具输出展开以及 thinking 可见性。

## 键盘快捷键

- Enter：发送消息
- Esc：中止活动运行
- Ctrl+C：清空输入框（按两次退出）
- Ctrl+D：退出
- Ctrl+L：model 选择器
- Ctrl+G：智能体选择器
- Ctrl+P：会话选择器
- Ctrl+O：切换工具输出展开
- Ctrl+T：切换 thinking 可见性（会重新加载历史）

## Slash Commands

核心命令：

- `/help`
- `/status`
- `/agent <id>`（或 `/agents`）
- `/session <key>`（或 `/sessions`）
- `/model <provider/model>`（或 `/models`）

会话控制：

- `/think <off|minimal|low|medium|high>`
- `/fast <status|on|off>`
- `/verbose <on|full|off>`
- `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`
- `/elevated <on|off|ask|full>`（别名：`/elev`）
- `/activation <mention|always>`
- `/deliver <on|off>`

会话生命周期：

- `/new` 或 `/reset`（重置会话）
- `/abort`（中止活动运行）
- `/settings`
- `/exit`

其他 Gateway slash commands（例如 `/context`）会被转发到 Gateway 网关，并作为系统输出显示。参见 [????](/zh-CN/tools/slash-commands)。

## 本地 shell 命令

- 以 `!` 作为一行前缀，可在 TUI 所在主机上运行本地 shell 命令。
- TUI 会在每个会话中提示一次是否允许本地执行；如果拒绝，则该会话中的 `!` 会保持禁用。
- 命令会在 TUI 工作目录中的一个全新、非交互式 shell 中运行（不会持久保存 `cd` / env）。
- 本地 shell 命令会在环境中接收 `OPENCLAW_SHELL=tui-local`。
- 单独一个 `!` 会作为普通消息发送；行首空格不会触发本地 exec。

## 工具输出

- 工具调用会显示为带参数 + 结果的卡片。
- Ctrl+O 可在折叠 / 展开视图之间切换。
- 工具运行期间，部分更新会流式写入同一张卡片。

## 终端颜色

- TUI 会让助手正文文本保持你终端的默认前景色，因此深色和浅色终端都能保持可读性。
- 如果你的终端使用浅色背景且自动检测错误，请在启动 `openclaw tui` 之前设置 `OPENCLAW_THEME=light`。
- 如果想强制使用原始深色调色板，请设置 `OPENCLAW_THEME=dark`。

## 历史与流式输出

- 连接时，TUI 会加载最近的历史记录（默认 200 条消息）。
- 流式响应会原地更新，直到最终完成。
- TUI 还会监听智能体工具事件，以显示更丰富的工具卡片。

## 连接细节

- TUI 以 `mode: "tui"` 向 Gateway 网关注册。
- 重新连接时会显示系统消息；事件缺口会在日志中体现。

## 选项

- `--url <url>`：Gateway WebSocket URL（默认来自配置或 `ws://127.0.0.1:<port>`）
- `--token <token>`：Gateway token（如果需要）
- `--password <password>`：Gateway password（如果需要）
- `--session <key>`：会话键（默认：`main`；当作用域为 global 时为 `global`）
- `--deliver`：将助手回复投递给提供商（默认关闭）
- `--thinking <level>`：为发送覆盖 thinking 级别
- `--message <text>`：连接后发送一条初始消息
- `--timeout-ms <ms>`：智能体超时时间，单位毫秒（默认取自 `agents.defaults.timeoutSeconds`）
- `--history-limit <n>`：要加载的历史条目数（默认 `200`）

说明：当你设置了 `--url` 时，TUI 不会回退到配置或环境凭证。
请显式传入 `--token` 或 `--password`。如果缺少显式凭证，将报错。

## 故障排除

发送消息后没有输出：

- 在 TUI 中运行 `/status`，确认 Gateway 网关已连接且处于 idle / busy。
- 检查 Gateway 网关日志：`openclaw logs --follow`。
- 确认智能体可以运行：`openclaw status` 和 `openclaw models status`。
- 如果你期望消息出现在聊天渠道中，请启用投递（`/deliver on` 或 `--deliver`）。

## 连接故障排除

- `disconnected`：确认 Gateway 网关正在运行，且你的 `--url` / `--token` / `--password` 正确。
- 选择器中没有智能体：检查 `openclaw agents list` 和你的路由配置。
- 会话选择器为空：你可能处于 global 作用域，或者还没有任何会话。

## 相关内容

- [?? UI](/zh-CN/web/control-ui) — 基于 Web 的控制界面
- [CLI 参考](/zh-CN/cli) — 完整 CLI 命令参考
