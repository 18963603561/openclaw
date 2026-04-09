---
read_when:
    - 将 Codex、Claude Code 或其他 MCP 客户端连接到由 OpenClaw 支持的渠道时
    - 运行 `openclaw mcp serve` 时
    - 管理 OpenClaw 保存的 MCP 服务器定义时
summary: 通过 MCP 暴露 OpenClaw 渠道对话，并管理已保存的 MCP 服务器定义
title: mcp
x-i18n:
    generated_at: "2026-04-08T03:54:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: b35de9e14f96666eeca2f93c06cb214e691152f911d45ee778efe9cf5bf96cc2
    source_path: cli\mcp.md
    workflow: 15
---

# mcp

`openclaw mcp` 有两个用途：

- 使用 `openclaw mcp serve` 将 OpenClaw 作为 MCP 服务器运行
- 使用 `list`、`show`、`set` 和 `unset` 管理由 OpenClaw 持有的出站 MCP 服务器定义

换句话说：

- `serve` 表示 OpenClaw 充当 MCP 服务器
- `list` / `show` / `set` / `unset` 表示 OpenClaw 充当其他 MCP 服务器的客户端侧注册表，供其运行时后续使用

当 OpenClaw 应自己托管一个编码 harness 会话，并通过 ACP 路由该运行时时，请使用 [`openclaw acp`](/cli/acp)。

## OpenClaw 作为 MCP 服务器

这对应 `openclaw mcp serve` 路径。

## 何时使用 `serve`

在以下情况下使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 客户端应直接与由 OpenClaw 支持的渠道对话通信
- 你已经有一个本地或远程的 OpenClaw Gateway 网关，并具有已路由会话
- 你希望使用一个 MCP 服务器跨 OpenClaw 的各个渠道后端工作，而不是分别运行每个渠道的桥接器

当 OpenClaw 应自己托管编码运行时，并将智能体会话保持在 OpenClaw 内部时，请改用 [`openclaw acp`](/cli/acp)。

## 它如何工作

`openclaw mcp serve` 会启动一个 stdio MCP 服务器。该进程由 MCP 客户端持有。当客户端保持 stdio 会话打开时，桥接器会通过 WebSocket 连接到本地或远程 OpenClaw Gateway 网关，并通过 MCP 暴露已路由的渠道对话。

生命周期：

1. MCP 客户端启动 `openclaw mcp serve`
2. 桥接器连接到 Gateway 网关
3. 已路由会话变成 MCP 对话和 transcript/history 工具
4. 当桥接器连接期间，实时事件会排入内存队列
5. 如果启用了 Claude 渠道模式，同一会话还可以接收 Claude 特定的推送通知

重要行为：

- 实时队列状态从桥接器连接时开始
- 更早的 transcript 历史通过 `messages_read` 读取
- Claude 推送通知仅在 MCP 会话存活期间存在
- 当客户端断开连接时，桥接器退出，实时队列也会消失

## 选择客户端模式

同一个桥接器可以有两种使用方式：

- 通用 MCP 客户端：仅使用标准 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 以及审批工具。
- Claude Code：使用标准 MCP 工具外加 Claude 特定渠道适配器。启用 `--claude-channel-mode on`，或保留默认值 `auto`。

目前，`auto` 的行为与 `on` 相同。尚无客户端能力检测。

## `serve` 暴露了什么

该桥接器使用现有 Gateway 网关会话路由元数据来暴露由渠道支持的对话。当 OpenClaw 已经拥有带有已知路由的会话状态时，一个对话就会出现，例如：

- `channel`
- recipient 或 destination 元数据
- 可选的 `accountId`
- 可选的 `threadId`

这让 MCP 客户端可以在一个地方完成以下操作：

- 列出最近的已路由对话
- 读取最近的 transcript 历史
- 等待新的入站事件
- 通过相同路由发送回复
- 查看桥接器连接期间到达的审批请求

## 用法

```bash
# Local Gateway
openclaw mcp serve

# Remote Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Remote Gateway with password auth
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# Enable verbose bridge logs
openclaw mcp serve --verbose

# Disable Claude-specific push notifications
openclaw mcp serve --claude-channel-mode off
```

## 桥接工具

当前桥接器暴露以下 MCP 工具：

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

列出最近的、已经在 Gateway 网关会话状态中拥有路由元数据的会话支持对话。

常用过滤器：

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

通过 `session_key` 返回一个对话。

### `messages_read`

读取一个会话支持对话最近的 transcript 消息。

### `attachments_fetch`

从一条 transcript 消息中提取非文本消息内容块。这是 transcript 内容上的一种元数据视图，而不是独立的持久附件 blob 存储。

### `events_poll`

从一个数字游标开始读取已排队的实时事件。

### `events_wait`

执行长轮询，直到下一个匹配的已排队事件到达，或超时到期。

当通用 MCP 客户端需要近实时投递，但又不使用 Claude 特定推送协议时，请使用此工具。

### `messages_send`

通过会话上已记录的相同路由发回文本。

当前行为：

- 需要一个现有对话路由
- 使用会话的 channel、recipient、account id 和 thread id
- 仅发送文本

### `permissions_list_open`

列出桥接器自连接到 Gateway 网关以来观察到的待处理 exec/plugin 审批请求。

### `permissions_respond`

使用以下动作之一来处理单个待处理 exec/plugin 审批请求：

- `allow-once`
- `allow-always`
- `deny`

## 事件模型

桥接器在连接期间会维护一个内存中的事件队列。

当前事件类型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

重要限制：

- 该队列仅包含实时内容；它从 MCP 桥接器启动时开始
- `events_poll` 和 `events_wait` 本身不会重放更早的 Gateway 网关历史
- 持久积压历史应通过 `messages_read` 读取

## Claude 渠道通知

桥接器还可以暴露 Claude 特定渠道通知。这是 OpenClaw 对 Claude Code 渠道适配器的等价实现：标准 MCP 工具仍然可用，但实时入站消息也可以作为 Claude 特定的 MCP 通知到达。

标志：

- `--claude-channel-mode off`：仅标准 MCP 工具
- `--claude-channel-mode on`：启用 Claude 渠道通知
- `--claude-channel-mode auto`：当前默认值；桥接行为与 `on` 相同

启用 Claude 渠道模式后，服务器会声明 Claude 实验性能力，并可发出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

当前桥接行为：

- 入站的 `user` transcript 消息会被转发为 `notifications/claude/channel`
- 通过 MCP 接收到的 Claude 权限请求会在内存中跟踪
- 如果关联对话后续发送 `yes abcde` 或 `no abcde`，桥接器会将其转换为 `notifications/claude/channel/permission`
- 这些通知仅限实时会话；如果 MCP 客户端断开连接，就没有推送目标了

这是有意设计为客户端特定的。通用 MCP 客户端应依赖标准轮询工具。

## MCP 客户端配置

stdio 客户端配置示例：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": [
        "mcp",
        "serve",
        "--url",
        "wss://gateway-host:18789",
        "--token-file",
        "/path/to/gateway.token"
      ]
    }
  }
}
```

对于大多数通用 MCP 客户端，请先使用标准工具界面，并忽略 Claude 模式。只有在客户端确实理解 Claude 特定通知方法时，才开启 Claude 模式。

## 选项

`openclaw mcp serve` 支持：

- `--url <url>`：Gateway 网关 WebSocket URL
- `--token <token>`：Gateway 网关 token
- `--token-file <path>`：从文件读取 token
- `--password <password>`：Gateway 网关密码
- `--password-file <path>`：从文件读取密码
- `--claude-channel-mode <auto|on|off>`：Claude 通知模式
- `-v`, `--verbose`：在 stderr 输出详细日志

如果可能，请优先使用 `--token-file` 或 `--password-file`，而不是内联机密信息。

## 安全和信任边界

桥接器不会自行发明路由。它只暴露 Gateway 网关已经知道如何路由的对话。

这意味着：

- sender allowlist、配对以及渠道级信任仍然属于底层 OpenClaw 渠道配置
- `messages_send` 只能通过现有的已存储路由进行回复
- 对当前桥接会话而言，审批状态仅存在于实时/内存中
- 桥接认证应使用与你信任其他远程 Gateway 网关客户端相同的 token 或密码控制

如果某个对话没有出现在 `conversations_list` 中，通常原因不是 MCP 配置，而是底层 Gateway 网关会话中缺失或不完整的路由元数据。

## 测试

OpenClaw 为该桥接器提供了可确定的 Docker 冒烟测试：

```bash
pnpm test:docker:mcp-channels
```

该冒烟测试会：

- 启动一个带预置数据的 Gateway 网关容器
- 启动第二个容器，并在其中运行 `openclaw mcp serve`
- 验证对话发现、transcript 读取、附件元数据读取、实时事件队列行为以及出站发送路由
- 通过真实 stdio MCP 桥接器验证 Claude 风格的渠道和权限通知

这是在不接入真实 Telegram、Discord 或 iMessage 账户的情况下，证明桥接器可用的最快方式。

关于更广泛的测试背景，参见 [测试](/help/testing)。

## 故障排除

### 没有返回任何对话

通常意味着 Gateway 网关会话本身尚不可路由。请确认底层会话已经存储了 channel/provider、recipient 以及可选的 account/thread 路由元数据。

### `events_poll` 或 `events_wait` 漏掉了较早的消息

这是预期行为。实时队列从桥接器连接时开始。较早的 transcript 历史请通过 `messages_read` 读取。

### Claude 通知没有显示

请检查以下各项：

- 客户端是否保持 stdio MCP 会话打开
- `--claude-channel-mode` 是否为 `on` 或 `auto`
- 客户端是否真的理解 Claude 特定通知方法
- 入站消息是否发生在桥接器连接之后

### 看不到审批

`permissions_list_open` 只显示桥接器连接期间观察到的审批请求。它不是持久化的审批历史 API。

## OpenClaw 作为 MCP 客户端注册表

这对应 `openclaw mcp list`、`show`、`set` 和 `unset` 路径。

这些命令不会通过 MCP 暴露 OpenClaw。它们管理的是 OpenClaw 配置中 `mcp.servers` 下由 OpenClaw 持有的 MCP 服务器定义。

这些已保存的定义用于 OpenClaw 后续启动或配置的运行时，例如内置 Pi 和其他运行时适配器。OpenClaw 会集中存储这些定义，这样这些运行时就不需要各自维护重复的 MCP 服务器列表。

重要行为：

- 这些命令只读取或写入 OpenClaw 配置
- 它们不会连接到目标 MCP 服务器
- 它们不会验证命令、URL 或远程传输当前是否可达
- 运行时适配器会在执行时决定自己实际支持哪些传输形态

## 已保存的 MCP 服务器定义

OpenClaw 还会在配置中存储一个轻量级 MCP 服务器注册表，供需要 OpenClaw 管理 MCP 定义的界面使用。

命令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

说明：

- `list` 会对服务器名称进行排序。
- 不带名称的 `show` 会打印完整的已配置 MCP 服务器对象。
- `set` 要求在命令行上传入一个 JSON 对象值。
- 如果指定的服务器不存在，`unset` 会失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

配置结构示例：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

### Stdio 传输

启动一个本地子进程，并通过 stdin/stdout 通信。

| 字段 | 说明 |
| -------------------------- | --------------------------------- |
| `command` | 要启动的可执行文件（必填） |
| `args` | 命令行参数数组 |
| `env` | 额外环境变量 |
| `cwd` / `workingDirectory` | 进程的工作目录 |

### SSE / HTTP 传输

通过 HTTP Server-Sent Events 连接到远程 MCP 服务器。

| 字段 | 说明 |
| --------------------- | ---------------------------------------------------------------- |
| `url` | 远程服务器的 HTTP 或 HTTPS URL（必填） |
| `headers` | 可选的 HTTP 头键值映射（例如认证 token） |
| `connectionTimeoutMs` | 每个服务器的连接超时（毫秒，可选） |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url` 中的敏感值（userinfo）以及 `headers` 中的敏感值会在日志和状态输出中被脱敏。

### Streamable HTTP 传输

`streamable-http` 是除 `sse` 和 `stdio` 之外的另一个传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段 | 说明 |
| --------------------- | -------------------------------------------------------------------------------------- |
| `url` | 远程服务器的 HTTP 或 HTTPS URL（必填） |
| `transport` | 设为 `"streamable-http"` 以选择此传输；省略时 OpenClaw 使用 `sse` |
| `headers` | 可选的 HTTP 头键值映射（例如认证 token） |
| `connectionTimeoutMs` | 每个服务器的连接超时（毫秒，可选） |

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

这些命令只管理已保存配置。它们不会启动渠道桥接器，不会打开实时 MCP 客户端会话，也不会证明目标服务器可达。

## 当前限制

本页记录的是当前已发布的桥接器行为。

当前限制：

- 对话发现依赖现有 Gateway 网关会话路由元数据
- 除 Claude 特定适配器外，暂无通用推送协议
- 尚无消息编辑或反应工具
- HTTP/SSE/streamable-http 传输只连接到单个远程服务器；尚不支持上游多路复用
- `permissions_list_open` 只包含桥接器连接期间观察到的审批
