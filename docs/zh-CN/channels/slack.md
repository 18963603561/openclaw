---
read_when:
    - 设置 Slack 或调试 Slack socket/HTTP 模式
summary: Slack 设置与运行时行为（Socket Mode + HTTP Request URLs）
title: Slack
x-i18n:
    generated_at: "2026-04-08T03:48:07Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2b8fd2cc6c638ee82069f0af2c2b6f6f49c87da709b941433a0343724a9907ea
    source_path: channels\slack.md
    workflow: 15
---

# Slack

状态：已可用于通过 Slack 应用集成实现私信和频道的生产环境使用。默认模式为 Socket Mode，也支持 HTTP Request URLs。

<CardGroup cols={3}>
  <Card title="Pairing" icon="link" href="/zh-CN/channels/pairing">
    Slack 私信默认使用 pairing 模式。
  </Card>
  <Card title="斜杠命令" icon="terminal" href="/zh-CN/tools/slash-commands">
    原生命令行为与命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh-CN/channels/troubleshooting">
    跨渠道诊断与修复手册。
  </Card>
</CardGroup>

## 快速设置

<Tabs>
  <Tab title="Socket Mode（默认）">
    <Steps>
      <Step title="创建一个新的 Slack 应用">
        在 Slack 应用设置中点击 **[Create New App](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest**，并为你的应用选择一个 workspace
        - 粘贴下面的[示例 manifest](#manifest-and-scope-checklist)，然后继续创建
        - 生成一个带有 `connections:write` 权限的 **App-Level Token**（`xapp-...`）
        - 安装应用，并复制显示出来的 **Bot Token**（`xoxb-...`）
      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "socket",
      appToken: "xapp-...",
      botToken: "xoxb-...",
    },
  },
}
```

        环境变量回退（仅默认账户）：

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

      </Step>

      <Step title="启动 Gateway 网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>

  <Tab title="HTTP Request URLs">
    <Steps>
      <Step title="创建一个新的 Slack 应用">
        在 Slack 应用设置中点击 **[Create New App](https://api.slack.com/apps/new)** 按钮：

        - 选择 **from a manifest**，并为你的应用选择一个 workspace
        - 粘贴[示例 manifest](#manifest-and-scope-checklist)，并在创建前更新其中的 URL
        - 保存用于请求校验的 **Signing Secret**
        - 安装应用，并复制显示出来的 **Bot Token**（`xoxb-...`）

      </Step>

      <Step title="配置 OpenClaw">

```json5
{
  channels: {
    slack: {
      enabled: true,
      mode: "http",
      botToken: "xoxb-...",
      signingSecret: "your-signing-secret",
      webhookPath: "/slack/events",
    },
  },
}
```

        <Note>
        对多账户 HTTP 使用唯一的 webhook 路径

        为每个账户提供不同的 `webhookPath`（默认值为 `/slack/events`），避免注册发生冲突。
        </Note>

      </Step>

      <Step title="启动 Gateway 网关">

```bash
openclaw gateway
```

      </Step>
    </Steps>

  </Tab>
</Tabs>

## Manifest 和 scope 检查清单

<Tabs>
  <Tab title="Socket Mode（默认）">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    }
  }
}
```

  </Tab>

  <Tab title="HTTP Request URLs">

```json
{
  "display_information": {
    "name": "OpenClaw",
    "description": "Slack connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw",
      "always_online": true
    },
    "app_home": {
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    },
    "slash_commands": [
      {
        "command": "/openclaw",
        "description": "Send a message to OpenClaw",
        "should_escape": false,
        "url": "https://gateway-host.example.com/slack/events"
      }
    ]
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://gateway-host.example.com/slack/events",
      "bot_events": [
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed",
        "reaction_added",
        "reaction_removed"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://gateway-host.example.com/slack/events",
      "message_menu_options_url": "https://gateway-host.example.com/slack/events"
    }
  }
}
```

  </Tab>
</Tabs>

<AccordionGroup>
  <Accordion title="可选的 authorship scope（写操作）">
    如果你希望出站消息使用当前智能体身份（自定义用户名和图标），而不是默认的 Slack 应用身份，请添加 `chat:write.customize` bot scope。

    如果你使用 emoji 图标，Slack 要求采用 `:emoji_name:` 语法。

  </Accordion>
  <Accordion title="可选的 user-token scope（读操作）">
    如果你配置了 `channels.slack.userToken`，典型的读取 scope 包括：

    - `channels:history`、`groups:history`、`im:history`、`mpim:history`
    - `channels:read`、`groups:read`、`im:read`、`mpim:read`
    - `users:read`
    - `reactions:read`
    - `pins:read`
    - `emoji:read`
    - `search:read`（如果你依赖 Slack 搜索读取）

  </Accordion>
</AccordionGroup>

## Token 模型

- Socket Mode 需要 `botToken` + `appToken`。
- HTTP 模式需要 `botToken` + `signingSecret`。
- `botToken`、`appToken`、`signingSecret` 和 `userToken` 接受明文
  字符串或 SecretRef 对象。
- 配置中的 token 会覆盖环境变量回退。
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` 环境变量回退仅适用于默认账户。
- `userToken`（`xoxp-...`）仅支持通过配置提供（不支持环境变量回退），并且默认采用只读行为（`userTokenReadOnly: true`）。

状态快照行为：

- Slack 账户检查会跟踪每个凭证对应的 `*Source` 和 `*Status`
  字段（`botToken`、`appToken`、`signingSecret`、`userToken`）。
- 状态可能是 `available`、`configured_unavailable` 或 `missing`。
- `configured_unavailable` 表示该账户通过 SecretRef
  或其他非内联 secret 来源完成了配置，但当前命令/运行时路径
  无法解析其实际值。
- 在 HTTP 模式下，会包含 `signingSecretStatus`；在 Socket Mode 中，
  所需的一对状态为 `botTokenStatus` + `appTokenStatus`。

<Tip>
对于 actions/目录读取，如果已配置 user token，则可以优先使用它。对于写操作，仍然优先使用 bot token；只有在 `userTokenReadOnly: false` 且 bot token 不可用时，才允许使用 user token 进行写入。
</Tip>

## Actions 和门控

Slack actions 由 `channels.slack.actions.*` 控制。

当前 Slack 工具中可用的 action 分组：

| 分组 | 默认值 |
| ---------- | ------- |
| messages | enabled |
| reactions | enabled |
| pins | enabled |
| memberInfo | enabled |
| emojiList | enabled |

当前 Slack 消息 actions 包括 `send`、`upload-file`、`download-file`、`read`、`edit`、`delete`、`pin`、`unpin`、`list-pins`、`member-info` 和 `emoji-list`。

## 访问控制与路由

<Tabs>
  <Tab title="私信策略">
    `channels.slack.dmPolicy` 控制私信访问（旧版：`channels.slack.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.slack.allowFrom` 包含 `"*"`；旧版：`channels.slack.dm.allowFrom`）
    - `disabled`

    私信标志：

    - `dm.enabled`（默认 true）
    - `channels.slack.allowFrom`（推荐）
    - `dm.allowFrom`（旧版）
    - `dm.groupEnabled`（群私信默认 false）
    - `dm.groupChannels`（可选 MPIM allowlist）

    多账户优先级：

    - `channels.slack.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 已命名账户在自身 `allowFrom` 未设置时，会继承 `channels.slack.allowFrom`。
    - 已命名账户不会继承 `channels.slack.accounts.default.allowFrom`。

    私信中的 pairing 使用 `openclaw pairing approve slack <code>`。

  </Tab>

  <Tab title="频道策略">
    `channels.slack.groupPolicy` 控制频道处理：

    - `open`
    - `allowlist`
    - `disabled`

    频道 allowlist 位于 `channels.slack.channels` 下，并应使用稳定的频道 ID。

    运行时说明：如果完全缺少 `channels.slack`（仅环境变量设置），运行时会回退到 `groupPolicy="allowlist"` 并记录警告（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

    名称/ID 解析：

    - 频道 allowlist 条目和私信 allowlist 条目会在启动时、在 token 访问允许的情况下进行解析
    - 无法解析的频道名称条目会按配置保留，但默认会在路由时被忽略
    - 入站鉴权和频道路由默认优先按 ID 处理；直接按用户名/slug 匹配需要 `channels.slack.dangerouslyAllowNameMatching: true`

  </Tab>

  <Tab title="提及与频道用户">
    频道消息默认受提及门控限制。

    提及来源：

    - 显式应用提及（`<@botId>`）
    - 提及正则模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 隐式回复到机器人线程的行为（当 `thread.requireExplicitMention` 为 `true` 时禁用）

    按频道控制（`channels.slack.channels.<id>`；名称仅能通过启动时解析或 `dangerouslyAllowNameMatching` 使用）：

    - `requireMention`
    - `users`（allowlist）
    - `allowBots`
    - `skills`
    - `systemPrompt`
    - `tools`、`toolsBySender`
    - `toolsBySender` 键格式：`id:`、`e164:`、`username:`、`name:` 或通配符 `"*"`
      （旧版无前缀键仍只映射到 `id:`）

  </Tab>
</Tabs>

## 线程、会话与回复标签

- 私信路由为 `direct`；频道路由为 `channel`；MPIM 路由为 `group`。
- 使用默认 `session.dmScope=main` 时，Slack 私信会合并到智能体主会话。
- 频道会话：`agent:<agentId>:slack:channel:<channelId>`。
- 在线程回复适用时，可以创建带线程会话后缀的会话（`:thread:<threadTs>`）。
- `channels.slack.thread.historyScope` 默认值为 `thread`；`thread.inheritParent` 默认值为 `false`。
- `channels.slack.thread.initialHistoryLimit` 控制新线程会话启动时拉取多少条已有线程消息（默认 `20`；设为 `0` 可禁用）。
- `channels.slack.thread.requireExplicitMention`（默认 `false`）：设为 `true` 时，会禁用隐式线程提及，因此即使机器人已参与线程，也只会对线程中的显式 `@bot` 提及作出响应。若不启用此项，则在机器人已参与的线程中进行回复会绕过 `requireMention` 门控。

回复线程控制：

- `channels.slack.replyToMode`：`off|first|all|batched`（默认 `off`）
- `channels.slack.replyToModeByChatType`：按 `direct|group|channel` 分别设置
- 私聊的旧版回退：`channels.slack.dm.replyToMode`

支持手动回复标签：

- `[[reply_to_current]]`
- `[[reply_to:<id>]]`

注意：`replyToMode="off"` 会禁用 Slack 中**所有**回复线程功能，包括显式 `[[reply_to_*]]` 标签。这与 Telegram 不同，在 Telegram 中显式标签在 `"off"` 模式下仍会生效。这种差异反映了平台线程模型的不同：Slack 线程会将消息隐藏出主频道，而 Telegram 回复仍会显示在主聊天流中。

## Ack 表情回应

`ackReaction` 会在 OpenClaw 处理入站消息期间发送一个确认用 emoji。

解析顺序：

- `channels.slack.accounts.<accountId>.ackReaction`
- `channels.slack.ackReaction`
- `messages.ackReaction`
- 智能体身份 emoji 回退（`agents.list[].identity.emoji`，否则为 `"👀"`）

说明：

- Slack 要求使用 shortcode（例如 `"eyes"`）。
- 使用 `""` 可为 Slack 账户或全局禁用该表情回应。

## 文本流式传输

`channels.slack.streaming` 控制实时预览行为：

- `off`：禁用实时预览流式传输。
- `partial`（默认）：用最新的部分输出替换预览文本。
- `block`：追加分块的预览更新。
- `progress`：在生成期间显示进度状态文本，随后发送最终文本。

当 `streaming` 为 `partial` 时，`channels.slack.nativeStreaming` 控制 Slack 原生文本流式传输（默认值：`true`）。

- 必须有可用的回复线程，原生文本流式传输才会显示。线程选择仍遵循 `replyToMode`。若无线程，则使用普通草稿预览。
- 媒体和非文本负载会回退到普通投递方式。
- 如果流式传输在回复中途失败，OpenClaw 会对剩余负载回退到普通投递方式。

使用草稿预览而不是 Slack 原生文本流式传输：

```json5
{
  channels: {
    slack: {
      streaming: "partial",
      nativeStreaming: false,
    },
  },
}
```

旧版键：

- `channels.slack.streamMode`（`replace | status_final | append`）会自动迁移到 `channels.slack.streaming`。
- 布尔值 `channels.slack.streaming` 会自动迁移到 `channels.slack.nativeStreaming`。

## Typing 表情回应回退

`typingReaction` 会在 OpenClaw 处理回复期间，向入站 Slack 消息添加一个临时表情回应，并在运行结束后将其移除。这在非线程回复场景中最有用，因为线程回复默认会使用 “is typing...” 状态指示器。

解析顺序：

- `channels.slack.accounts.<accountId>.typingReaction`
- `channels.slack.typingReaction`

说明：

- Slack 要求使用 shortcode（例如 `"hourglass_flowing_sand"`）。
- 该表情回应采用尽力而为方式处理，并会在回复或失败路径完成后自动尝试清理。

## 媒体、分块与投递

<AccordionGroup>
  <Accordion title="入站附件">
    Slack 文件附件会从 Slack 托管的私有 URL 下载（基于 token 鉴权的请求流程），当获取成功且未超出大小限制时，会写入媒体存储。

    运行时入站大小上限默认为 `20MB`，除非通过 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion title="出站文本与文件">
    - 文本分块使用 `channels.slack.textChunkLimit`（默认 4000）
    - `channels.slack.chunkMode="newline"` 会启用优先按段落拆分
    - 文件发送使用 Slack 上传 API，并可包含线程回复（`thread_ts`）
    - 出站媒体上限在配置了 `channels.slack.mediaMaxMb` 时遵循该值；否则渠道发送使用媒体流水线中的 MIME 类型默认值
  </Accordion>

  <Accordion title="投递目标">
    推荐使用的显式目标：

    - 私信使用 `user:<id>`
    - 频道使用 `channel:<id>`

    向用户目标发送时，Slack 私信会通过 Slack conversation API 打开。

  </Accordion>
</AccordionGroup>

## 命令与斜杠行为

- Slack 的原生命令自动模式默认**关闭**（`commands.native: "auto"` 不会启用 Slack 原生命令）。
- 使用 `channels.slack.commands.native: true`（或全局 `commands.native: true`）启用原生 Slack 命令处理器。
- 启用原生命令后，需要在 Slack 中注册匹配的斜杠命令（`/<command>` 名称），但有一个例外：
  - 状态命令应注册为 `/agentstatus`（Slack 保留了 `/status`）
- 如果未启用原生命令，你仍可通过 `channels.slack.slashCommand` 运行一个已配置的单一斜杠命令。
- 原生命令参数菜单现在会根据情况自适应渲染策略：
  - 最多 5 个选项：按钮块
  - 6 到 100 个选项：静态选择菜单
  - 超过 100 个选项：当交互式选项处理器可用时，使用带异步选项过滤的外部选择
  - 如果编码后的选项值超出 Slack 限制，则该流程会回退为按钮
- 对于较长的选项负载，斜杠命令参数菜单会在派发所选值前使用确认对话框。

默认斜杠命令设置：

- `enabled: false`
- `name: "openclaw"`
- `sessionPrefix: "slack:slash"`
- `ephemeral: true`

斜杠会话使用隔离键：

- `agent:<agentId>:slack:slash:<userId>`

并且仍会针对目标会话执行命令路由（`CommandTargetSessionKey`）。

## 交互式回复

Slack 可以渲染由智能体生成的交互式回复控件，但该功能默认禁用。

全局启用方式：

```json5
{
  channels: {
    slack: {
      capabilities: {
        interactiveReplies: true,
      },
    },
  },
}
```

或仅为某个 Slack 账户启用：

```json5
{
  channels: {
    slack: {
      accounts: {
        ops: {
          capabilities: {
            interactiveReplies: true,
          },
        },
      },
    },
  },
}
```

启用后，智能体可以输出 Slack 专用的回复指令：

- `[[slack_buttons: Approve:approve, Reject:reject]]`
- `[[slack_select: Choose a target | Canary:canary, Production:production]]`

这些指令会编译为 Slack Block Kit，并将点击或选择通过现有 Slack 交互事件路径路由回来。

说明：

- 这是 Slack 专用 UI。其他渠道不会将 Slack Block Kit 指令转换成自己的按钮系统。
- 交互回调值是由 OpenClaw 生成的不透明 token，而不是智能体原始写出的值。
- 如果生成的交互块会超出 Slack Block Kit 限制，OpenClaw 会回退为原始文本回复，而不是发送无效的 blocks 负载。

## Slack 中的 Exec 审批

Slack 可以作为原生审批客户端，使用交互式按钮和交互，而不是回退到 Web UI 或终端。

- Exec 审批通过 `channels.slack.execApprovals.*` 控制原生私信/频道路由。
- 如果审批请求本身已落在 Slack 中，且 approval id 类型为 `plugin:`，插件审批仍可通过同一套 Slack 原生按钮界面进行处理。
- 审批人鉴权仍会严格执行：只有被识别为 approver 的用户才能通过 Slack 批准或拒绝请求。

这使用与其他渠道相同的共享审批按钮界面。当你在 Slack 应用设置中启用了 `interactivity` 时，审批提示会直接以 Block Kit 按钮形式渲染在会话中。
当这些按钮存在时，它们就是主要的审批 UX；只有当工具结果表明聊天审批不可用，或手动审批是唯一方式时，OpenClaw 才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`、`sessionFilter`

当 `enabled` 未设置或为 `"auto"`，且至少解析出一个 approver 时，Slack 会自动启用原生 exec 审批。设置 `enabled: false` 可显式禁用 Slack 作为原生审批客户端。
设置 `enabled: true` 则会在 approver 可解析时强制启用原生审批。

无显式 Slack exec 审批配置时的默认行为：

```json5
{
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

只有当你想覆盖 approver、添加过滤器，或启用发送到来源聊天时，才需要显式 Slack 原生配置：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共享的 `approvals.exec` 转发是独立功能。只有当 exec 审批提示还必须路由到其他聊天或显式带外目标时才使用它。共享的 `approvals.plugin` 转发同样是独立的；当这些请求本身已落在 Slack 中时，Slack 原生按钮仍可处理插件审批。

同一聊天中的 `/approve` 也适用于已支持命令的 Slack 频道和私信。完整的审批转发模型请参见 [Exec ??](/zh-CN/tools/exec-approvals)。

## 事件与运行行为

- 消息编辑/删除/线程广播会映射为系统事件。
- 表情回应的添加/移除事件会映射为系统事件。
- 成员加入/离开、频道创建/重命名，以及 pin 添加/移除事件会映射为系统事件。
- `channel_id_changed` 可以在启用 `configWrites` 时迁移频道配置键。
- 频道 topic/purpose 元数据被视为不可信上下文，并可注入到路由上下文中。
- 线程发起消息和初始线程历史上下文种子会在适用时按配置的发送者 allowlist 进行过滤。
- Block actions 和 modal 交互会发出结构化的 `Slack interaction: ...` 系统事件，并带有丰富的负载字段：
  - block actions：选中值、标签、picker 值以及 `workflow_*` 元数据
  - modal `view_submission` 和 `view_closed` 事件，附带路由后的渠道元数据和表单输入

## 配置参考入口

主要参考：

- [????](/zh-CN/gateway/configuration-reference#slack)

  高价值的 Slack 字段：
  - 模式/认证：`mode`、`botToken`、`appToken`、`signingSecret`、`webhookPath`、`accounts.*`
  - 私信访问：`dm.enabled`、`dmPolicy`、`allowFrom`（旧版：`dm.policy`、`dm.allowFrom`）、`dm.groupEnabled`、`dm.groupChannels`
  - 兼容性开关：`dangerouslyAllowNameMatching`（紧急开关；除非确有需要，否则保持关闭）
  - 频道访问：`groupPolicy`、`channels.*`、`channels.*.users`、`channels.*.requireMention`
  - 线程/历史：`replyToMode`、`replyToModeByChatType`、`thread.*`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
  - 投递：`textChunkLimit`、`chunkMode`、`mediaMaxMb`、`streaming`、`nativeStreaming`
  - 运维/功能：`configWrites`、`commands.native`、`slashCommand.*`、`actions.*`、`userToken`、`userTokenReadOnly`

## 故障排除

<AccordionGroup>
  <Accordion title="频道中没有回复">
    按顺序检查：

    - `groupPolicy`
    - 频道 allowlist（`channels.slack.channels`）
    - `requireMention`
    - 按频道设置的 `users` allowlist

    有用的命令：

```bash
openclaw channels status --probe
openclaw logs --follow
openclaw doctor
```

  </Accordion>

  <Accordion title="私信消息被忽略">
    检查：

    - `channels.slack.dm.enabled`
    - `channels.slack.dmPolicy`（或旧版 `channels.slack.dm.policy`）
    - pairing 批准状态 / allowlist 条目

```bash
openclaw pairing list slack
```

  </Accordion>

  <Accordion title="Socket mode 无法连接">
    请验证 bot token、app token，以及 Slack 应用设置中的 Socket Mode 是否已启用。

    如果 `openclaw channels status --probe --json` 显示 `botTokenStatus` 或
    `appTokenStatus: "configured_unavailable"`，说明该 Slack 账户
    已完成配置，但当前运行时无法解析由 SecretRef 支撑的
    实际值。

  </Accordion>

  <Accordion title="HTTP mode 未接收到事件">
    请验证：

    - signing secret
    - webhook 路径
    - Slack Request URLs（Events + Interactivity + Slash Commands）
    - 每个 HTTP 账户使用唯一的 `webhookPath`

    如果账户快照中出现 `signingSecretStatus: "configured_unavailable"`，
    表示该 HTTP 账户已完成配置，但当前运行时无法
    解析由 SecretRef 支撑的 signing secret。

  </Accordion>

  <Accordion title="原生命令/斜杠命令未触发">
    请确认你的意图是：

    - 使用原生命令模式（`channels.slack.commands.native: true`），并在 Slack 中注册匹配的斜杠命令
    - 或使用单一斜杠命令模式（`channels.slack.slashCommand.enabled: true`）

    同时检查 `commands.useAccessGroups` 以及频道/用户 allowlist。

  </Accordion>
</AccordionGroup>

## 相关内容

- [??](/zh-CN/channels/pairing)
- [群组](/zh-CN/channels/groups)
- [安全](/zh-CN/gateway/security)
- [渠道路由](/zh-CN/channels/channel-routing)
- [故障排除](/zh-CN/channels/troubleshooting)
- [配置](/zh-CN/gateway/configuration)
- [斜杠命令](/zh-CN/tools/slash-commands)
