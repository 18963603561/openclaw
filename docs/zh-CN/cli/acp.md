---
read_when:
    - 设置基于 ACP 的 IDE 集成
    - 调试到 Gateway 网关 的 ACP 会话路由
summary: 运行 ACP bridge 以支持 IDE 集成
title: acp
x-i18n:
    generated_at: "2026-04-08T03:50:25Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2461b181e4a97dd84580581e9436ca1947a224decce8044132dbcf7fb2b7502c
    source_path: cli\acp.md
    workflow: 15
---

# acp

运行与 OpenClaw Gateway 网关 通信的 [Agent Client Protocol（ACP）](https://agentclientprotocol.com/) bridge。

此命令通过 stdio 为 IDE 提供 ACP，并通过 WebSocket 将提示转发到 Gateway 网关。
它会保持 ACP 会话与 Gateway 网关 会话键之间的映射关系。

`openclaw acp` 是一个由 Gateway 网关 支撑的 ACP bridge，不是完整的 ACP 原生编辑器
运行时。它专注于会话路由、提示投递和基础流式更新。

如果你希望外部 MCP 客户端直接与 OpenClaw 渠道
会话通信，而不是托管一个 ACP harness 会话，请使用
[`openclaw mcp serve`](/zh-CN/cli/mcp)。

## 这不是什么

本页经常与 ACP harness 会话混淆。

`openclaw acp` 的含义是：

- OpenClaw 充当 ACP 服务器
- IDE 或 ACP 客户端连接到 OpenClaw
- OpenClaw 将该工作转发到一个 Gateway 网关 会话

这与 [ACP ???](/zh-CN/tools/acp-agents) 不同；在那里，OpenClaw 会通过 `acpx` 运行一个
外部 harness，例如 Codex 或 Claude Code。

快速规则：

- 编辑器/客户端希望通过 ACP 与 OpenClaw 通信：使用 `openclaw acp`
- OpenClaw 应启动 Codex/Claude/Gemini 作为 ACP harness：使用 `/acp spawn` 和 [ACP ???](/zh-CN/tools/acp-agents)

## 兼容性矩阵

| ACP 区域 | 状态 | 说明 |
| --------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialize`、`newSession`、`prompt`、`cancel` | 已实现 | 通过 stdio 到 Gateway 网关 chat/send + abort 的核心 bridge 流程。 |
| `listSessions`、斜杠命令 | 已实现 | 会话列表基于 Gateway 网关 会话状态；命令通过 `available_commands_update` 通告。 |
| `loadSession` | 部分支持 | 重新将 ACP 会话绑定到一个 Gateway 网关 会话键，并回放已存储的用户/assistant 文本历史。尚未重建工具/系统历史。 |
| 提示内容（`text`、嵌入式 `resource`、图片） | 部分支持 | 文本/resource 会被展平为聊天输入；图片会变成 Gateway 网关 附件。 |
| 会话模式 | 部分支持 | 支持 `session/set_mode`，并且 bridge 暴露了初始的 Gateway 网关 支撑会话控制项，包括 thought level、工具详细程度、reasoning、usage detail 和 elevated actions。更广泛的 ACP 原生模式/配置接口仍不在范围内。 |
| 会话信息与 usage 更新 | 部分支持 | bridge 会根据缓存的 Gateway 网关 会话快照发送 `session_info_update` 和尽力而为的 `usage_update` 通知。usage 为近似值，且仅在 Gateway 网关 token 总量被标记为最新时发送。 |
| 工具流式传输 | 部分支持 | `tool_call` / `tool_call_update` 事件会包含原始 I/O、文本内容，以及当 Gateway 网关 工具参数/结果暴露这些信息时尽力提供的文件位置。嵌入式终端和更丰富的 Diffs 原生输出尚未暴露。 |
| 按会话的 MCP 服务器（`mcpServers`） | 不支持 | bridge 模式会拒绝按会话传入的 MCP 服务器请求。请改为在 OpenClaw Gateway 网关 或智能体上配置 MCP。 |
| 客户端文件系统方法（`fs/read_text_file`、`fs/write_text_file`） | 不支持 | bridge 不会调用 ACP 客户端文件系统方法。 |
| 客户端终端方法（`terminal/*`） | 不支持 | bridge 不会创建 ACP 客户端终端，也不会通过工具调用流式传输终端 id。 |
| 会话计划 / thought 流式传输 | 不支持 | bridge 当前发送的是输出文本和工具状态，而不是 ACP 计划或 thought 更新。 |

## 已知限制

- `loadSession` 会回放已存储的用户和 assistant 文本历史，但不会
  重建历史工具调用、系统通知或更丰富的 ACP 原生事件
  类型。
- 如果多个 ACP 客户端共享同一个 Gateway 网关 会话键，事件和取消
  路由仅为尽力而为，而不是针对每个客户端严格隔离。当你需要干净的编辑器本地
  turn 时，请优先使用默认隔离的 `acp:<uuid>` 会话。
- Gateway 网关 stop 状态会被转换为 ACP stop reason，但这种映射
  不如完全 ACP 原生运行时那样有表现力。
- 初始会话控制目前只暴露一组聚焦的 Gateway 网关 参数：
  thought level、工具详细程度、reasoning、usage detail 和 elevated
  actions。模型选择和 exec-host 控制尚未作为 ACP
  配置选项暴露。
- `session_info_update` 和 `usage_update` 源自 Gateway 网关 会话
  快照，而不是实时的 ACP 原生运行时核算。usage 是近似值，
  不包含成本数据，并且只有在 Gateway 网关 将总 token
  数据标记为最新时才会发送。
- 工具跟随数据采用尽力而为方式。bridge 可以显示出现在已知工具参数/结果中的文件路径，
  但尚不会发送 ACP 终端或结构化文件 Diffs。

## 用法

```bash
openclaw acp

# 远程 Gateway 网关
openclaw acp --url wss://gateway-host:18789 --token <token>

# 远程 Gateway 网关（从文件读取 token）
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 附加到一个现有会话键
openclaw acp --session agent:main:main

# 按标签附加（必须已存在）
openclaw acp --session-label "support inbox"

# 在第一次提示前重置该会话键
openclaw acp --session agent:main:main --reset-session
```

## ACP 客户端（调试）

使用内置 ACP 客户端，在无需 IDE 的情况下对 bridge 做基本检查。
它会启动 ACP bridge，并允许你以交互方式输入提示。

```bash
openclaw acp client

# 让启动的 bridge 指向远程 Gateway 网关
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# 覆盖服务器命令（默认：openclaw）
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

权限模型（客户端调试模式）：

- 自动批准基于 allowlist，且仅适用于受信任的核心工具 ID。
- `read` 自动批准限定在当前工作目录内（设置了 `--cwd` 时）。
- ACP 仅自动批准狭义只读类别：活动 cwd 下的受限 `read` 调用，以及只读搜索工具（`search`、`web_search`、`memory_search`）。未知/非核心工具、超范围读取、具备 exec 能力的工具、控制平面工具、变更型工具以及交互流程始终需要显式提示批准。
- 服务器提供的 `toolCall.kind` 被视为不可信元数据（不是授权来源）。
- 此 ACP bridge 策略与 ACPX harness 权限分离。如果你通过 `acpx` backend 运行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是该 harness 会话的紧急 “yolo” 开关。

## 如何使用

当一个 IDE（或其他客户端）支持 Agent Client Protocol，并且你希望
它驱动一个 OpenClaw Gateway 网关 会话时，请使用 ACP。

1. 确保 Gateway 网关 正在运行（本地或远程）。
2. 配置 Gateway 网关 目标（配置或命令行标志）。
3. 让你的 IDE 通过 stdio 运行 `openclaw acp`。

示例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

示例直接运行（不写入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# 推荐用于本地进程安全
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 选择智能体

ACP 不会直接选择智能体。它按 Gateway 网关 会话键进行路由。

使用带智能体作用域的会话键来指定某个智能体：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每个 ACP 会话映射到单个 Gateway 网关 会话键。一个智能体可以拥有多个
会话；ACP 默认使用一个隔离的 `acp:<uuid>` 会话，除非你覆盖
该键或标签。

bridge 模式不支持按会话的 `mcpServers`。如果 ACP 客户端
在 `newSession` 或 `loadSession` 期间发送它们，bridge 会返回一个清晰
错误，而不是静默忽略。

如果你希望 ACPX 支撑的会话能看到 OpenClaw 插件工具，请启用
Gateway 网关 侧的 ACPX 插件 bridge，而不是尝试传入按会话的
`mcpServers`。参见 [ACP ???](/zh-CN/tools/acp-agents#plugin-tools-mcp-bridge)。

## 从 `acpx` 使用（Codex、Claude、其他 ACP 客户端）

如果你希望某个编码智能体，例如 Codex 或 Claude Code，通过 ACP 与你的
OpenClaw 机器人通信，请使用 `acpx` 自带的 `openclaw` 目标。

典型流程：

1. 运行 Gateway 网关，并确保 ACP bridge 可以访问它。
2. 让 `acpx openclaw` 指向 `openclaw acp`。
3. 指定编码智能体要使用的 OpenClaw 会话键。

示例：

```bash
# 向默认 OpenClaw ACP 会话发起一次性请求
acpx openclaw exec "Summarize the active OpenClaw session state."

# 为后续轮次创建持久命名会话
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果你希望 `acpx openclaw` 每次都指向特定的 Gateway 网关 和会话键，
请在 `~/.acpx/config.json` 中覆盖 `openclaw` 智能体命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

对于仓库本地的 OpenClaw checkout，请使用直接 CLI 入口点，而不是
开发运行器，以保持 ACP 流干净。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

这是让 Codex、Claude Code 或其他支持 ACP 的客户端
从 OpenClaw 智能体中提取上下文信息，而无需抓取终端内容的最简单方式。

## Zed 编辑器设置

在 `~/.config/zed/settings.json` 中添加一个自定义 ACP 智能体（或使用 Zed 的设置 UI）：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

若要指定某个 Gateway 网关 或智能体：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": [
        "acp",
        "--url",
        "wss://gateway-host:18789",
        "--token",
        "<token>",
        "--session",
        "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中，打开智能体面板并选择 “OpenClaw ACP” 以启动一个线程。

## 会话映射

默认情况下，ACP 会话会获得一个带 `acp:` 前缀的隔离 Gateway 网关 会话键。
若要复用已知会话，请传入会话键或标签：

- `--session <key>`：使用指定的 Gateway 网关 会话键。
- `--session-label <label>`：按标签解析现有会话。
- `--reset-session`：在首次使用前为该键生成一个新的会话 id（相同键，新 transcript）。

如果你的 ACP 客户端支持 metadata，你也可以按会话覆盖：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

会话键的更多信息请参见 [??](/zh-CN/concepts/session)。

## 选项

- `--url <url>`：Gateway 网关 WebSocket URL（若已配置，则默认使用 `gateway.remote.url`）。
- `--token <token>`：Gateway 网关 认证 token。
- `--token-file <path>`：从文件读取 Gateway 网关 认证 token。
- `--password <password>`：Gateway 网关 认证密码。
- `--password-file <path>`：从文件读取 Gateway 网关 认证密码。
- `--session <key>`：默认会话键。
- `--session-label <label>`：要解析的默认会话标签。
- `--require-existing`：若会话键/标签不存在则失败。
- `--reset-session`：首次使用前重置会话键。
- `--no-prefix-cwd`：不要在提示前附加工作目录前缀。
- `--provenance <off|meta|meta+receipt>`：包含 ACP provenance 元数据或 receipts。
- `--verbose, -v`：向 stderr 输出详细日志。

安全说明：

- 在某些系统上，`--token` 和 `--password` 可能会出现在本地进程列表中。
- 推荐使用 `--token-file`/`--password-file` 或环境变量（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 网关 认证解析遵循与其他 Gateway 网关 客户端共享的约定：
  - 本地模式：环境变量（`OPENCLAW_GATEWAY_*`）-> `gateway.auth.*` -> 仅当 `gateway.auth.*` 未设置时才回退到 `gateway.remote.*`（已配置但无法解析的本地 SecretRef 会以失败关闭）
  - 远程模式：`gateway.remote.*`，并按远程优先级规则使用环境变量/配置回退
  - `--url` 是可安全覆盖的，不会复用隐式配置/环境变量凭证；请传入显式 `--token`/`--password`（或文件变体）
- ACP 运行时 backend 子进程会收到 `OPENCLAW_SHELL=acp`，可用于上下文相关的 shell/profile 规则。
- `openclaw acp client` 会在启动的 bridge 进程上设置 `OPENCLAW_SHELL=acp-client`。

### `acp client` 选项

- `--cwd <dir>`：ACP 会话的工作目录。
- `--server <command>`：ACP 服务器命令（默认：`openclaw`）。
- `--server-args <args...>`：传给 ACP 服务器的附加参数。
- `--server-verbose`：在 ACP 服务器上启用详细日志。
- `--verbose, -v`：客户端详细日志。
