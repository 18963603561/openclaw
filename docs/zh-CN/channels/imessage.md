---
read_when:
    - 设置 iMessage 支持时
    - 调试 iMessage 收发时
summary: 通过 imsg 提供的旧版 iMessage 支持（基于 stdio 的 JSON-RPC）。新的部署应使用 BlueBubbles。
title: iMessage
x-i18n:
    generated_at: "2026-04-08T03:42:42Z"
    model: gpt-5.4
    provider: openai
    source_hash: 086d85bead49f75d12ae6b14ac917af52375b6afd28f6af1a0dcbbc7fcb628a0
    source_path: channels\imessage.md
    workflow: 15
---

# iMessage（旧版：imsg）

<Warning>
对于新的 iMessage 部署，请使用 <a href="/zh-CN/channels/bluebubbles">BlueBubbles</a>。

`imsg` 集成属于旧版能力，未来版本中可能会移除。
</Warning>

状态：旧版外部 CLI 集成。Gateway 网关 会启动 `imsg rpc`，并通过 stdio 上的 JSON-RPC 通信（不需要单独的守护进程/端口）。

<CardGroup cols={3}>
  <Card title="BlueBubbles（推荐）" icon="message-circle" href="/zh-CN/channels/bluebubbles">
    新部署中优先使用的 iMessage 方案。
  </Card>
  <Card title="Pairing" icon="link" href="/zh-CN/channels/pairing">
    iMessage 私信默认使用 pairing 模式。
  </Card>
  <Card title="配置参考" icon="settings" href="/zh-CN/gateway/configuration-reference#imessage">
    完整的 iMessage 字段参考。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="本地 Mac（快速路径）">
    <Steps>
      <Step title="安装并验证 imsg">

```bash
brew install steipete/tap/imsg
imsg rpc --help
```

      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "/usr/local/bin/imsg",
      dbPath: "/Users/<you>/Library/Messages/chat.db",
    },
  },
}
```

      </Step>

      <Step title="启动 Gateway 网关">

```bash
openclaw gateway
```

      </Step>

      <Step title="批准首次私信 pairing（默认 dmPolicy）">

```bash
openclaw pairing list imessage
openclaw pairing approve imessage <CODE>
```

        pairing 请求会在 1 小时后过期。
      </Step>
    </Steps>

  </Tab>

  <Tab title="通过 SSH 连接远程 Mac">
    OpenClaw 只要求 `cliPath` 兼容 stdio，因此你可以让 `cliPath` 指向一个包装脚本，通过 SSH 连接远程 Mac 并运行 `imsg`。

```bash
#!/usr/bin/env bash
exec ssh -T gateway-host imsg "$@"
```

    启用附件时，推荐使用如下配置：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "user@gateway-host", // 用于通过 SCP 拉取附件
      includeAttachments: true,
      // 可选：覆盖允许的附件根目录。
      // 默认包含 /Users/*/Library/Messages/Attachments
      attachmentRoots: ["/Users/*/Library/Messages/Attachments"],
      remoteAttachmentRoots: ["/Users/*/Library/Messages/Attachments"],
    },
  },
}
```

    如果未设置 `remoteHost`，OpenClaw 会尝试通过解析 SSH 包装脚本自动检测它。
    `remoteHost` 必须是 `host` 或 `user@host`（不能包含空格或 SSH 选项）。
    OpenClaw 对 SCP 使用严格的主机密钥校验，因此中继主机的密钥必须已存在于 `~/.ssh/known_hosts` 中。
    附件路径会根据允许的根目录（`attachmentRoots` / `remoteAttachmentRoots`）进行校验。

  </Tab>
</Tabs>

## 要求与权限（macOS）

- Messages 必须已在运行 `imsg` 的 Mac 上登录。
- 运行 OpenClaw/`imsg` 的进程上下文必须具备完全磁盘访问权限（用于访问 Messages 数据库）。
- 通过 Messages.app 发送消息需要自动化权限。

<Tip>
权限是按进程上下文授予的。如果 Gateway 网关 以无头方式运行（LaunchAgent/SSH），请在相同上下文中执行一次交互式命令以触发权限提示：

```bash
imsg chats --limit 1
# or
imsg send <handle> "test"
```

</Tip>

## 访问控制与路由

<Tabs>
  <Tab title="私信策略">
    `channels.imessage.dmPolicy` 控制私信：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `allowFrom` 包含 `"*"`）
    - `disabled`

    allowlist 字段：`channels.imessage.allowFrom`。

    allowlist 条目可以是 handle 或聊天目标（`chat_id:*`、`chat_guid:*`、`chat_identifier:*`）。

  </Tab>

  <Tab title="群组策略 + 提及">
    `channels.imessage.groupPolicy` 控制群组处理：

    - `allowlist`（配置后默认）
    - `open`
    - `disabled`

    群组发送者 allowlist：`channels.imessage.groupAllowFrom`。

    运行时回退：如果未设置 `groupAllowFrom`，则 iMessage 群组发送者检查会在可用时回退到 `allowFrom`。
    运行时说明：如果完全缺少 `channels.imessage`，运行时会回退为 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

    群组的提及门控：

    - iMessage 没有原生提及元数据
    - 提及检测使用正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 如果没有配置任何模式，则无法强制执行提及门控

    来自已授权发送者的控制命令可以在群组中绕过提及门控。

  </Tab>

  <Tab title="会话与确定性回复">
    - 私信使用 direct 路由；群组使用 group 路由。
    - 使用默认 `session.dmScope=main` 时，iMessage 私信会合并到智能体主会话中。
    - 群组会话彼此隔离（`agent:<agentId>:imessage:group:<chat_id>`）。
    - 回复会使用来源渠道/目标元数据路由回 iMessage。

    类群组线程行为：

    某些多参与者 iMessage 线程到达时可能带有 `is_group=false`。
    如果该 `chat_id` 已在 `channels.imessage.groups` 下显式配置，OpenClaw 会将其视为群组流量处理（群组门控 + 群组会话隔离）。

  </Tab>
</Tabs>

## ACP 会话绑定

旧版 iMessage 聊天也可以绑定到 ACP 会话。

快速操作流程：

- 在私信或已允许的群聊中运行 `/acp spawn codex --bind here`。
- 该 iMessage 会话中的后续消息会路由到新启动的 ACP 会话。
- `/new` 和 `/reset` 会原地重置同一个已绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

还支持通过顶层 `bindings[]` 条目配置持久绑定，要求 `type: "acp"` 且 `match.channel: "imessage"`。

`match.peer.id` 可使用：

- 规范化私信 handle，例如 `+15555550123` 或 `user@example.com`
- `chat_id:<id>`（推荐用于稳定的群组绑定）
- `chat_guid:<guid>`
- `chat_identifier:<identifier>`

示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: { agent: "codex", backend: "acpx", mode: "persistent" },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "imessage",
        accountId: "default",
        peer: { kind: "group", id: "chat_id:123" },
      },
      acp: { label: "codex-group" },
    },
  ],
}
```

共享的 ACP 绑定行为请参见 [ACP ???](/zh-CN/tools/acp-agents)。

## 部署模式

<AccordionGroup>
  <Accordion title="专用机器人 macOS 用户（独立 iMessage 身份）">
    使用专用 Apple ID 和 macOS 用户，以便将机器人流量与你个人的 Messages 配置文件隔离。

    典型流程：

    1. 创建并登录一个专用 macOS 用户。
    2. 在该用户中使用机器人 Apple ID 登录 Messages。
    3. 在该用户中安装 `imsg`。
    4. 创建 SSH 包装脚本，让 OpenClaw 能在该用户上下文中运行 `imsg`。
    5. 将 `channels.imessage.accounts.<id>.cliPath` 和 `.dbPath` 指向该用户配置文件。

    首次运行可能需要在该机器人用户会话中通过 GUI 批准权限（自动化 + 完全磁盘访问）。

  </Accordion>

  <Accordion title="通过 Tailscale 连接远程 Mac（示例）">
    常见拓扑：

    - Gateway 网关 运行在 Linux/VM 上
    - iMessage 和 `imsg` 运行在你的 tailnet 中一台 Mac 上
    - `cliPath` 包装脚本通过 SSH 运行 `imsg`
    - `remoteHost` 用于通过 SCP 拉取附件

    示例：

```json5
{
  channels: {
    imessage: {
      enabled: true,
      cliPath: "~/.openclaw/scripts/imsg-ssh",
      remoteHost: "bot@mac-mini.tailnet-1234.ts.net",
      includeAttachments: true,
      dbPath: "/Users/bot/Library/Messages/chat.db",
    },
  },
}
```

```bash
#!/usr/bin/env bash
exec ssh -T bot@mac-mini.tailnet-1234.ts.net imsg "$@"
```

    请使用 SSH 密钥，使 SSH 和 SCP 都能无交互运行。
    先确保主机密钥已被信任（例如运行 `ssh bot@mac-mini.tailnet-1234.ts.net`），以便填充 `known_hosts`。

  </Accordion>

  <Accordion title="多账户模式">
    iMessage 支持在 `channels.imessage.accounts` 下配置按账户区分的设置。

    每个账户都可以覆盖 `cliPath`、`dbPath`、`allowFrom`、`groupPolicy`、`mediaMaxMb`、history 设置以及附件根目录 allowlist 等字段。

  </Accordion>
</AccordionGroup>

## 媒体、分块与投递目标

<AccordionGroup>
  <Accordion title="附件与媒体">
    - 入站附件接收是可选的：`channels.imessage.includeAttachments`
    - 设置 `remoteHost` 后，可通过 SCP 获取远程附件路径
    - 附件路径必须匹配允许的根目录：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 默认根目录模式：`/Users/*/Library/Messages/Attachments`
    - SCP 使用严格主机密钥校验（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）
  </Accordion>

  <Accordion title="出站分块">
    - 文本分块上限：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落拆分）
  </Accordion>

  <Accordion title="地址格式">
    推荐使用的显式目标：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    也支持 handle 目标：

    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

```bash
imsg chats --limit 20
```

  </Accordion>
</AccordionGroup>

## 配置写入

iMessage 默认允许由渠道发起配置写入（当 `commands.config: true` 时，用于 `/config set|unset`）。

禁用方式：

```json5
{
  channels: {
    imessage: {
      configWrites: false,
    },
  },
}
```

## 故障排除

<AccordionGroup>
  <Accordion title="找不到 imsg 或不支持 RPC">
    验证二进制文件和 RPC 支持：

```bash
imsg rpc --help
openclaw channels status --probe
```

    如果探测结果显示不支持 RPC，请更新 `imsg`。

  </Accordion>

  <Accordion title="私信被忽略">
    检查：

    - `channels.imessage.dmPolicy`
    - `channels.imessage.allowFrom`
    - pairing 批准状态（`openclaw pairing list imessage`）

  </Accordion>

  <Accordion title="群组消息被忽略">
    检查：

    - `channels.imessage.groupPolicy`
    - `channels.imessage.groupAllowFrom`
    - `channels.imessage.groups` 的 allowlist 行为
    - 提及模式配置（`agents.list[].groupChat.mentionPatterns`）

  </Accordion>

  <Accordion title="远程附件失败">
    检查：

    - `channels.imessage.remoteHost`
    - `channels.imessage.remoteAttachmentRoots`
    - Gateway 网关 主机到目标端的 SSH/SCP 密钥认证
    - Gateway 网关 主机上的 `~/.ssh/known_hosts` 中是否存在主机密钥
    - 运行 Messages 的 Mac 上远程路径是否可读

  </Accordion>

  <Accordion title="错过了 macOS 权限提示">
    在同一用户/会话上下文中的交互式 GUI 终端里重新运行，并批准提示：

```bash
imsg chats --limit 1
imsg send <handle> "test"
```

    确认运行 OpenClaw/`imsg` 的进程上下文已被授予完全磁盘访问权限和自动化权限。

  </Accordion>
</AccordionGroup>

## 配置参考入口

- [????](/zh-CN/gateway/configuration-reference#imessage)
- [??](/zh-CN/gateway/configuration)
- [??](/zh-CN/channels/pairing)
- [BlueBubbles](/zh-CN/channels/bluebubbles)

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有支持的渠道
- [??](/zh-CN/channels/pairing) — 私信认证和 pairing 流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及门控
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/zh-CN/gateway/security) — 访问模型与加固
