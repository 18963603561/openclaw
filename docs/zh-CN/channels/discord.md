---
read_when:
    - 处理 Discord 渠道功能时
summary: Discord Bot 支持状态、能力和配置
title: Discord
x-i18n:
    generated_at: "2026-04-08T03:43:42Z"
    model: gpt-5.4
    provider: openai
    source_hash: 54af2176a1b4fa1681e3f07494def0c652a2730165058848000e71a59e2a9d08
    source_path: channels\discord.md
    workflow: 15
---

# Discord（Bot API）

状态：已就绪，可通过官方 Discord gateway 用于私信和 guild 渠道。

<CardGroup cols={3}>
  <Card title="配对" icon="link" href="/zh-CN/channels/pairing">
    Discord 私信默认使用配对模式。
  </Card>
  <Card title="Slash commands" icon="terminal" href="/tools/slash-commands">
    原生命令行为和命令目录。
  </Card>
  <Card title="渠道故障排除" icon="wrench" href="/zh-CN/channels/troubleshooting">
    跨渠道诊断与修复流程。
  </Card>
</CardGroup>

## 快速设置

你需要创建一个带有 bot 的新应用，将该 bot 添加到你的服务器，并将其与 OpenClaw 配对。我们建议将你的 bot 添加到你自己的私有服务器。如果你还没有，请先[创建一个](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server)（选择 **Create My Own > For me and my friends**）。

<Steps>
  <Step title="创建 Discord 应用和 bot">
    前往 [Discord Developer Portal](https://discord.com/developers/applications)，点击 **New Application**。为它命名，例如 “OpenClaw”。

    点击侧边栏中的 **Bot**。将 **Username** 设置为你对 OpenClaw 智能体的称呼。

  </Step>

  <Step title="启用特权 intents">
    仍然在 **Bot** 页面，向下滚动到 **Privileged Gateway Intents** 并启用：

    - **Message Content Intent**（必需）
    - **Server Members Intent**（推荐；角色 allowlist 和名称到 ID 匹配时必需）
    - **Presence Intent**（可选；仅在需要 presence 更新时才需要）

  </Step>

  <Step title="复制你的 bot token">
    回到 **Bot** 页面顶部并点击 **Reset Token**。

    <Note>
    尽管名字如此，这会生成你的第一个 token —— 并不是在“重置”任何东西。
    </Note>

    复制该 token 并将其保存到某处。这就是你的 **Bot Token**，你很快就会用到它。

  </Step>

  <Step title="生成邀请 URL 并将 bot 添加到你的服务器">
    点击侧边栏中的 **OAuth2**。你将生成一个具有正确权限的邀请 URL，用于将 bot 添加到你的服务器。

    向下滚动到 **OAuth2 URL Generator** 并启用：

    - `bot`
    - `applications.commands`

    下方会出现一个 **Bot Permissions** 部分。启用：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    复制底部生成的 URL，将其粘贴到浏览器中，选择你的服务器，然后点击 **Continue** 进行连接。现在你应该能在 Discord 服务器中看到你的 bot。

  </Step>

  <Step title="启用 Developer Mode 并收集你的 ID">
    回到 Discord 应用中，你需要启用 Developer Mode，才能复制内部 ID。

    1. 点击 **User Settings**（头像旁边的齿轮图标）→ **Advanced** → 打开 **Developer Mode**
    2. 在侧边栏中右键点击你的**服务器图标** → **Copy Server ID**
    3. 右键点击你自己的**头像** → **Copy User ID**

    将你的 **Server ID** 和 **User ID** 与 Bot Token 一起保存 —— 下一步你需要将这三个信息都提供给 OpenClaw。

  </Step>

  <Step title="允许服务器成员发送私信">
    为了让配对正常工作，Discord 需要允许你的 bot 向你发送私信。右键点击你的**服务器图标** → **Privacy Settings** → 打开 **Direct Messages**。

    这样服务器成员（包括 bot）就可以向你发送私信。如果你想通过 OpenClaw 使用 Discord 私信，请保持此项启用。如果你只打算使用 guild 渠道，那么在完成配对后可以关闭私信。

  </Step>

  <Step title="安全地设置你的 bot token（不要在聊天中发送它）">
    你的 Discord bot token 是一个机密信息（类似密码）。在向智能体发消息之前，请先在运行 OpenClaw 的机器上进行设置。

```bash
export DISCORD_BOT_TOKEN="YOUR_BOT_TOKEN"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json
openclaw gateway
```

    如果 OpenClaw 已经作为后台服务运行，请通过 OpenClaw Mac 应用重启它，或者停止并重新启动 `openclaw gateway run` 进程。

  </Step>

  <Step title="配置 OpenClaw 并完成配对">

    <Tabs>
      <Tab title="询问你的智能体">
        在任意现有渠道（例如 Telegram）中与你的 OpenClaw 智能体聊天并告诉它。如果 Discord 是你的第一个渠道，请改用 CLI / config 标签页。

        > “我已经在配置中设置了 Discord bot token。请使用 User ID `<user_id>` 和 Server ID `<server_id>` 完成 Discord 设置。”
      </Tab>
      <Tab title="CLI / config">
        如果你更喜欢基于文件的配置，请设置：

```json5
{
  channels: {
    discord: {
      enabled: true,
      token: {
        source: "env",
        provider: "default",
        id: "DISCORD_BOT_TOKEN",
      },
    },
  },
}
```

        默认账户的环境变量回退：

```bash
DISCORD_BOT_TOKEN=...
```

        支持明文 `token` 值。`channels.discord.token` 也支持跨 env/file/exec provider 的 SecretRef 值。参见 [Secrets Management](/gateway/secrets)。

      </Tab>
    </Tabs>

  </Step>

  <Step title="批准首次私信配对">
    等待 Gateway 网关运行，然后在 Discord 中私信你的 bot。它会回复一个配对码。

    <Tabs>
      <Tab title="询问你的智能体">
        将配对码发送给你现有渠道中的智能体：

        > “批准这个 Discord 配对码：`<CODE>`”
      </Tab>
      <Tab title="CLI">

```bash
openclaw pairing list discord
openclaw pairing approve discord <CODE>
```

      </Tab>
    </Tabs>

    配对码会在 1 小时后过期。

    现在你应该可以通过 Discord 私信与你的智能体聊天了。

  </Step>
</Steps>

<Note>
Token 解析会考虑账户。配置中的 token 值优先于环境变量回退。`DISCORD_BOT_TOKEN` 仅用于默认账户。
对于高级出站调用（message 工具/渠道动作），显式的逐次调用 `token` 仅用于该次调用。这适用于发送以及读取/探测类动作（例如 read/search/fetch/thread/pins/permissions）。账户策略/重试设置仍来自活动运行时快照中选定的账户。
</Note>

## 推荐：设置 guild 工作区

当私信正常工作后，你可以将 Discord 服务器设置为完整工作区，其中每个渠道都会获得自己的智能体会话和独立上下文。对于只有你和 bot 的私有服务器，这是推荐做法。

<Steps>
  <Step title="将你的服务器加入 guild allowlist">
    这会让你的智能体能够在服务器中的任意渠道里响应，而不仅仅是私信。

    <Tabs>
      <Tab title="询问你的智能体">
        > “将我的 Discord Server ID `<server_id>` 添加到 guild allowlist”
      </Tab>
      <Tab title="Config">

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: true,
          users: ["YOUR_USER_ID"],
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="允许无需 @mention 即可回复">
    默认情况下，你的智能体只会在被 @mention 时在 guild 渠道中回复。对于私有服务器，你可能希望它对每条消息都进行回复。

    <Tabs>
      <Tab title="询问你的智能体">
        > “允许我的智能体在这个服务器中无需被 @mention 也能回复”
      </Tab>
      <Tab title="Config">
        在 guild 配置中将 `requireMention` 设置为 `false`：

```json5
{
  channels: {
    discord: {
      guilds: {
        YOUR_SERVER_ID: {
          requireMention: false,
        },
      },
    },
  },
}
```

      </Tab>
    </Tabs>

  </Step>

  <Step title="规划 guild 渠道中的记忆使用">
    默认情况下，长期记忆（`MEMORY.md`）只会在私信会话中加载。guild 渠道不会自动加载 `MEMORY.md`。

    <Tabs>
      <Tab title="询问你的智能体">
        > “当我在 Discord 渠道中提问时，如果你需要来自 `MEMORY.md` 的长期上下文，请使用 `memory_search` 或 `memory_get`。”
      </Tab>
      <Tab title="手动">
        如果你需要在每个渠道中共享上下文，请将稳定指令放入 `AGENTS.md` 或 `USER.md`（它们会在每个会话中注入）。将长期笔记保存在 `MEMORY.md` 中，并按需通过 memory 工具访问。
      </Tab>
    </Tabs>

  </Step>
</Steps>

现在，在你的 Discord 服务器中创建一些渠道并开始聊天吧。你的智能体可以看到渠道名称，而每个渠道都会获得自己的隔离会话 —— 因此你可以设置 `#coding`、`#home`、`#research`，或任何适合你工作流的内容。

## 运行时模型

- Gateway 网关拥有 Discord 连接。
- 回复路由是确定性的：Discord 入站消息会回复到 Discord。
- 默认情况下（`session.dmScope=main`），私聊共享智能体主会话（`agent:main:main`）。
- Guild 渠道使用隔离的会话键（`agent:<agentId>:discord:channel:<channelId>`）。
- 群组私信默认被忽略（`channels.discord.dm.groupEnabled=false`）。
- 原生 slash commands 在隔离的命令会话中运行（`agent:<agentId>:discord:slash:<userId>`），同时仍携带 `CommandTargetSessionKey` 指向已路由的会话。

## Forum 渠道

Discord forum 和 media 渠道仅接受线程帖子。OpenClaw 支持两种创建方式：

- 向 forum 父级（`channel:<forumId>`）发送消息以自动创建线程。线程标题使用消息中第一行非空内容。
- 使用 `openclaw message thread create` 直接创建线程。对于 forum 渠道，不要传递 `--message-id`。

示例：发送到 forum 父级以创建线程

```bash
openclaw message send --channel discord --target channel:<forumId> \
  --message "Topic title\nBody of the post"
```

示例：显式创建 forum 线程

```bash
openclaw message thread create --channel discord --target channel:<forumId> \
  --thread-name "Topic title" --message "Body of the post"
```

Forum 父级不接受 Discord components。如果你需要 components，请发送到线程本身（`channel:<threadId>`）。

## 交互式组件

OpenClaw 支持为智能体消息使用 Discord components v2 容器。使用带有 `components` 负载的 message 工具。交互结果会作为普通入站消息路由回智能体，并遵循现有的 Discord `replyToMode` 设置。

支持的区块：

- `text`、`section`、`separator`、`actions`、`media-gallery`、`file`
- 操作行最多允许 5 个按钮，或一个单独的选择菜单
- 选择类型：`string`、`user`、`role`、`mentionable`、`channel`

默认情况下，components 为一次性使用。设置 `components.reusable=true` 可让按钮、选择器和表单在过期前可多次使用。

如果要限制谁可以点击按钮，请在该按钮上设置 `allowedUsers`（Discord 用户 ID、标签或 `*`）。配置后，不匹配的用户会收到一条临时拒绝消息。

`/model` 和 `/models` slash commands 会打开一个交互式模型选择器，其中包含提供商和模型下拉框以及一个提交步骤。选择器回复为临时消息，且只有调用它的用户可以使用。

文件附件：

- `file` 区块必须指向一个附件引用（`attachment://<filename>`）
- 通过 `media`/`path`/`filePath` 提供附件（单个文件）；多个文件请使用 `media-gallery`
- 当上传名称应与附件引用匹配时，使用 `filename` 覆盖上传名称

模态表单：

- 添加 `components.modal`，最多可包含 5 个字段
- 字段类型：`text`、`checkbox`、`radio`、`select`、`role-select`、`user-select`
- OpenClaw 会自动添加一个触发按钮

示例：

```json5
{
  channel: "discord",
  action: "send",
  to: "channel:123456789012345678",
  message: "Optional fallback text",
  components: {
    reusable: true,
    text: "Choose a path",
    blocks: [
      {
        type: "actions",
        buttons: [
          {
            label: "Approve",
            style: "success",
            allowedUsers: ["123456789012345678"],
          },
          { label: "Decline", style: "danger" },
        ],
      },
      {
        type: "actions",
        select: {
          type: "string",
          placeholder: "Pick an option",
          options: [
            { label: "Option A", value: "a" },
            { label: "Option B", value: "b" },
          ],
        },
      },
    ],
    modal: {
      title: "Details",
      triggerLabel: "Open form",
      fields: [
        { type: "text", label: "Requester" },
        {
          type: "select",
          label: "Priority",
          options: [
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ],
        },
      ],
    },
  },
}
```

## 访问控制与路由

<Tabs>
  <Tab title="私信策略">
    `channels.discord.dmPolicy` 控制私信访问（旧版：`channels.discord.dm.policy`）：

    - `pairing`（默认）
    - `allowlist`
    - `open`（要求 `channels.discord.allowFrom` 包含 `"*"`；旧版：`channels.discord.dm.allowFrom`）
    - `disabled`

    如果私信策略不是 open，未知用户会被阻止（或者在 `pairing` 模式下被提示进行配对）。

    多账户优先级：

    - `channels.discord.accounts.default.allowFrom` 仅适用于 `default` 账户。
    - 命名账户在其自身 `allowFrom` 未设置时继承 `channels.discord.allowFrom`。
    - 命名账户不会继承 `channels.discord.accounts.default.allowFrom`。

    用于投递的私信目标格式：

    - `user:<id>`
    - `<@id>` mention

    纯数字 ID 存在歧义，除非提供显式的 user/channel 目标类型，否则会被拒绝。

  </Tab>

  <Tab title="Guild 策略">
    Guild 处理由 `channels.discord.groupPolicy` 控制：

    - `open`
    - `allowlist`
    - `disabled`

    当存在 `channels.discord` 时，安全基线是 `allowlist`。

    `allowlist` 行为：

    - guild 必须匹配 `channels.discord.guilds`（优先使用 `id`，也接受 slug）
    - 可选的发送者 allowlist：`users`（推荐使用稳定 ID）和 `roles`（仅角色 ID）；如果配置了任一项，则发送者匹配 `users` 或 `roles` 即可被允许
    - 默认禁用直接名称/标签匹配；只有在紧急兼容模式下才启用 `channels.discord.dangerouslyAllowNameMatching: true`
    - `users` 支持名称/标签，但 ID 更安全；当使用名称/标签条目时，`openclaw security audit` 会发出警告
    - 如果某个 guild 配置了 `channels`，则未列出的渠道会被拒绝
    - 如果某个 guild 没有 `channels` 区块，则该 allowlist guild 中的所有渠道都被允许

    示例：

```json5
{
  channels: {
    discord: {
      groupPolicy: "allowlist",
      guilds: {
        "123456789012345678": {
          requireMention: true,
          ignoreOtherMentions: true,
          users: ["987654321098765432"],
          roles: ["123456789012345678"],
          channels: {
            general: { allow: true },
            help: { allow: true, requireMention: true },
          },
        },
      },
    },
  },
}
```

    如果你只设置了 `DISCORD_BOT_TOKEN` 而没有创建 `channels.discord` 区块，则运行时回退为 `groupPolicy="allowlist"`（日志中会有警告），即使 `channels.defaults.groupPolicy` 为 `open` 也是如此。

  </Tab>

  <Tab title="提及和群组私信">
    Guild 消息默认受 mention 门控。

    mention 检测包括：

    - 显式 bot mention
    - 已配置的 mention 模式（`agents.list[].groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）
    - 在受支持情况下，隐式 reply-to-bot 行为

    `requireMention` 按 guild/渠道进行配置（`channels.discord.guilds...`）。
    `ignoreOtherMentions` 可选地丢弃那些提及了其他用户/角色但没有提及 bot 的消息（不包括 @everyone/@here）。

    群组私信：

    - 默认：忽略（`dm.groupEnabled=false`）
    - 可选 allowlist：通过 `dm.groupChannels`（渠道 ID 或 slug）

  </Tab>
</Tabs>

### 基于角色的智能体路由

使用 `bindings[].match.roles` 按角色 ID 将 Discord guild 成员路由到不同的智能体。基于角色的绑定仅接受角色 ID，并在对等方或父对等方绑定之后、仅 guild 绑定之前进行评估。如果绑定还设置了其他匹配字段（例如 `peer` + `guildId` + `roles`），则所有已配置字段都必须匹配。

```json5
{
  bindings: [
    {
      agentId: "opus",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
        roles: ["111111111111111111"],
      },
    },
    {
      agentId: "sonnet",
      match: {
        channel: "discord",
        guildId: "123456789012345678",
      },
    },
  ],
}
```

## Developer Portal 设置

<AccordionGroup>
  <Accordion title="创建应用和 bot">

    1. Discord Developer Portal -> **Applications** -> **New Application**
    2. **Bot** -> **Add Bot**
    3. 复制 bot token

  </Accordion>

  <Accordion title="特权 intents">
    在 **Bot -> Privileged Gateway Intents** 中，启用：

    - Message Content Intent
    - Server Members Intent（推荐）

    Presence intent 是可选的，仅在你想接收 presence 更新时才需要。设置 bot presence（`setPresence`）不要求为成员启用 presence 更新。

  </Accordion>

  <Accordion title="OAuth scopes 和基础权限">
    OAuth URL 生成器：

    - scopes：`bot`、`applications.commands`

    典型的基础权限：

    - View Channels
    - Send Messages
    - Read Message History
    - Embed Links
    - Attach Files
    - Add Reactions（可选）

    除非明确需要，否则避免使用 `Administrator`。

  </Accordion>

  <Accordion title="复制 ID">
    启用 Discord Developer Mode，然后复制：

    - server ID
    - channel ID
    - user ID

    在 OpenClaw 配置中优先使用数字 ID，以便获得可靠的审计和探测。

  </Accordion>
</AccordionGroup>

## 原生命令和命令认证

- `commands.native` 默认值为 `"auto"`，并且对 Discord 启用。
- 按渠道覆盖：`channels.discord.commands.native`。
- `commands.native=false` 会显式清除先前已注册的 Discord 原生命令。
- 原生命令认证使用与普通消息处理相同的 Discord allowlist/策略。
- 对未授权用户而言，命令仍可能在 Discord UI 中可见；但执行时仍会强制执行 OpenClaw 认证，并返回“未授权”。

命令目录和行为请参见 [Slash commands](/tools/slash-commands)。

默认 slash command 设置：

- `ephemeral: true`

## 功能详情

<AccordionGroup>
  <Accordion title="回复标签和原生回复">
    Discord 支持在智能体输出中使用回复标签：

    - `[[reply_to_current]]`
    - `[[reply_to:<id>]]`

    由 `channels.discord.replyToMode` 控制：

    - `off`（默认）
    - `first`
    - `all`
    - `batched`

    注意：`off` 会禁用隐式回复线程。显式 `[[reply_to_*]]` 标签仍然有效。
    `first` 总是会将隐式原生回复引用附加到本轮的第一条出站 Discord 消息上。
    `batched` 仅在入站轮次是多个消息去抖后合并的批次时，才附加 Discord 的隐式原生回复引用。这在你希望原生回复主要用于突发且语义可能不明确的聊天，而不是每个单条消息轮次时非常有用。

    消息 ID 会在上下文/历史中暴露，因此智能体可以定位特定消息。

  </Accordion>

  <Accordion title="实时流式预览">
    OpenClaw 可以通过发送临时消息并在文本到达时持续编辑它，来流式展示回复草稿。

    - `channels.discord.streaming` 控制预览流式传输（`off` | `partial` | `block` | `progress`，默认：`off`）。
    - 默认保持为 `off`，因为 Discord 预览编辑很容易触发速率限制，尤其是在多个 bot 或 Gateway 网关共享同一账户或 guild 流量时。
    - `progress` 为了跨渠道一致性而被接受，在 Discord 上会映射为 `partial`。
    - `channels.discord.streamMode` 是旧版别名，会被自动迁移。
    - `partial` 会在 token 到达时编辑单条预览消息。
    - `block` 会输出草稿大小的分块（使用 `draftChunk` 调整大小和断点）。

    示例：

```json5
{
  channels: {
    discord: {
      streaming: "partial",
    },
  },
}
```

    `block` 模式的默认分块设置（会被限制在 `channels.discord.textChunkLimit` 范围内）：

```json5
{
  channels: {
    discord: {
      streaming: "block",
      draftChunk: {
        minChars: 200,
        maxChars: 800,
        breakPreference: "paragraph",
      },
    },
  },
}
```

    预览流式传输仅支持文本；媒体回复会回退为普通投递。

    注意：预览流式传输与分块流式传输是分开的。当明确为 Discord 启用了分块流式传输时，OpenClaw 会跳过预览流，以避免双重流式输出。

  </Accordion>

  <Accordion title="历史、上下文和线程行为">
    Guild 历史上下文：

    - `channels.discord.historyLimit` 默认值为 `20`
    - 回退：`messages.groupChat.historyLimit`
    - `0` 表示禁用

    私信历史控制：

    - `channels.discord.dmHistoryLimit`
    - `channels.discord.dms["<user_id>"].historyLimit`

    线程行为：

    - Discord 线程被路由为渠道会话
    - 父线程元数据可用于父会话关联
    - 线程配置会继承父渠道配置，除非存在线程专用条目

    渠道 topic 会作为**不受信任**的上下文注入（而不是系统提示）。
    回复和引用消息上下文当前会保持接收到时的状态。
    Discord allowlist 主要用于控制谁可以触发智能体，而不是完整的补充上下文脱敏边界。

  </Accordion>

  <Accordion title="子智能体的线程绑定会话">
    Discord 可以将线程绑定到一个会话目标，这样该线程中的后续消息会持续路由到同一个会话（包括子智能体会话）。

    命令：

    - `/focus <target>` 将当前/新线程绑定到子智能体/会话目标
    - `/unfocus` 移除当前线程绑定
    - `/agents` 显示活动运行和绑定状态
    - `/session idle <duration|off>` 查看/更新已聚焦绑定的空闲自动取消聚焦设置
    - `/session max-age <duration|off>` 查看/更新已聚焦绑定的硬性最大存活时间

    配置：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        idleHours: 24,
        maxAgeHours: 0,
        spawnSubagentSessions: false, // opt-in
      },
    },
  },
}
```

    说明：

    - `session.threadBindings.*` 设置全局默认值。
    - `channels.discord.threadBindings.*` 会覆盖 Discord 行为。
    - 若要为 `sessions_spawn({ thread: true })` 自动创建/绑定线程，必须将 `spawnSubagentSessions` 设为 true。
    - 若要为 ACP 自动创建/绑定线程（`/acp spawn ... --thread ...` 或 `sessions_spawn({ runtime: "acp", thread: true })`），必须将 `spawnAcpSessions` 设为 true。
    - 如果某个账户禁用了线程绑定，则 `/focus` 和相关线程绑定操作不可用。

    参见 [Sub-agents](/tools/subagents)、[ACP Agents](/tools/acp-agents) 和 [Configuration Reference](/gateway/configuration-reference)。

  </Accordion>

  <Accordion title="持久化 ACP 渠道绑定">
    对于稳定的“始终在线” ACP 工作区，可配置顶层的类型化 ACP 绑定，将其定向到 Discord 对话。

    配置路径：

    - `bindings[]`，其中 `type: "acp"` 且 `match.channel: "discord"`

    示例：

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": {
              requireMention: false,
            },
          },
        },
      },
    },
  },
}
```

    说明：

    - `/acp spawn codex --bind here` 会就地绑定当前 Discord 渠道或线程，并让未来消息持续路由到同一个 ACP 会话。
    - 这仍然可能意味着“启动一个全新的 Codex ACP 会话”，但它本身不会创建新的 Discord 线程。现有渠道仍是聊天界面。
    - Codex 仍可能在自己独立的 `cwd` 或磁盘上的 backend 工作区中运行。该工作区属于运行时状态，不是 Discord 线程。
    - 线程消息可以继承父渠道 ACP 绑定。
    - 在已绑定的渠道或线程中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话。
    - 临时线程绑定仍然有效，并且在其生效期间可以覆盖目标解析。
    - 只有当 OpenClaw 需要通过 `--thread auto|here` 创建/绑定子线程时，才需要 `spawnAcpSessions`。在当前渠道中执行 `/acp spawn ... --bind here` 时不需要。

    有关绑定行为详情，参见 [ACP Agents](/tools/acp-agents)。

  </Accordion>

  <Accordion title="反应通知">
    按 guild 配置的反应通知模式：

    - `off`
    - `own`（默认）
    - `all`
    - `allowlist`（使用 `guilds.<id>.users`）

    反应事件会被转换为系统事件并附加到已路由的 Discord 会话。

  </Accordion>

  <Accordion title="确认反应">
    `ackReaction` 会在 OpenClaw 处理入站消息时发送一个确认 emoji。

    解析顺序：

    - `channels.discord.accounts.<accountId>.ackReaction`
    - `channels.discord.ackReaction`
    - `messages.ackReaction`
    - 智能体身份 emoji 回退（`agents.list[].identity.emoji`，否则为 `"👀"`）

    说明：

    - Discord 接受 unicode emoji 或自定义 emoji 名称。
    - 使用 `""` 可为某个渠道或账户禁用该反应。

  </Accordion>

  <Accordion title="配置写入">
    由渠道发起的配置写入默认启用。

    这会影响 `/config set|unset` 流程（在启用命令功能时）。

    禁用方式：

```json5
{
  channels: {
    discord: {
      configWrites: false,
    },
  },
}
```

  </Accordion>

  <Accordion title="Gateway 网关代理">
    使用 `channels.discord.proxy` 通过 HTTP(S) 代理转发 Discord gateway WebSocket 流量和启动时 REST 查询（application ID + allowlist 解析）。

```json5
{
  channels: {
    discord: {
      proxy: "http://proxy.example:8080",
    },
  },
}
```

    按账户覆盖：

```json5
{
  channels: {
    discord: {
      accounts: {
        primary: {
          proxy: "http://proxy.example:8080",
        },
      },
    },
  },
}
```

  </Accordion>

  <Accordion title="PluralKit 支持">
    启用 PluralKit 解析，将代理消息映射到 system member 身份：

```json5
{
  channels: {
    discord: {
      pluralkit: {
        enabled: true,
        token: "pk_live_...", // optional; needed for private systems
      },
    },
  },
}
```

    说明：

    - allowlist 可以使用 `pk:<memberId>`
    - 仅当 `channels.discord.dangerouslyAllowNameMatching: true` 时，member 显示名才会按名称/slug 匹配
    - 查找使用原始消息 ID，并受时间窗口限制
    - 如果查找失败，代理消息会被视为 bot 消息并丢弃，除非 `allowBots=true`

  </Accordion>

  <Accordion title="Presence 配置">
    当你设置状态或活动字段，或启用自动 presence 时，会应用 presence 更新。

    仅状态示例：

```json5
{
  channels: {
    discord: {
      status: "idle",
    },
  },
}
```

    活动示例（custom status 是默认活动类型）：

```json5
{
  channels: {
    discord: {
      activity: "Focus time",
      activityType: 4,
    },
  },
}
```

    Streaming 示例：

```json5
{
  channels: {
    discord: {
      activity: "Live coding",
      activityType: 1,
      activityUrl: "https://twitch.tv/openclaw",
    },
  },
}
```

    活动类型映射：

    - 0：Playing
    - 1：Streaming（需要 `activityUrl`）
    - 2：Listening
    - 3：Watching
    - 4：Custom（将活动文本作为状态文本；emoji 可选）
    - 5：Competing

    自动 presence 示例（运行时健康信号）：

```json5
{
  channels: {
    discord: {
      autoPresence: {
        enabled: true,
        intervalMs: 30000,
        minUpdateIntervalMs: 15000,
        exhaustedText: "token exhausted",
      },
    },
  },
}
```

    自动 presence 会将运行时可用性映射到 Discord 状态：healthy => online，degraded 或 unknown => idle，exhausted 或 unavailable => dnd。可选文本覆盖：

    - `autoPresence.healthyText`
    - `autoPresence.degradedText`
    - `autoPresence.exhaustedText`（支持 `{reason}` 占位符）

  </Accordion>

  <Accordion title="Discord 中的审批">
    Discord 支持在私信中使用基于按钮的审批处理，也可以选择在来源渠道中发布审批提示。

    配置路径：

    - `channels.discord.execApprovals.enabled`
    - `channels.discord.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
    - `channels.discord.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
    - `agentFilter`、`sessionFilter`、`cleanupAfterResolve`

    当 `enabled` 未设置或为 `"auto"`，且至少可以解析出一个 approver（无论来自 `execApprovals.approvers` 还是 `commands.ownerAllowFrom`）时，Discord 会自动启用原生 exec 审批。Discord 不会从渠道 `allowFrom`、旧版 `dm.allowFrom` 或私信 `defaultTo` 推断 exec approver。若要显式禁用 Discord 作为原生审批客户端，请设置 `enabled: false`。

    当 `target` 为 `channel` 或 `both` 时，审批提示会在渠道中可见。只有已解析的 approver 才能使用按钮；其他用户会收到一条临时拒绝消息。审批提示包含命令文本，因此只有在可信渠道中才应启用渠道投递。如果无法从会话键中推导出渠道 ID，OpenClaw 会回退为私信投递。

    Discord 也会渲染其他聊天渠道共用的审批按钮。原生 Discord 适配器主要增加 approver 私信路由和渠道扇出。
    当这些按钮存在时，它们就是主要的审批 UX；只有在工具结果显示聊天审批不可用，或者手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

    此处理器的 Gateway 网关认证使用与其他 Gateway 客户端相同的共享凭证解析约定：

    - env-first 本地认证（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，然后是 `gateway.auth.*`）
    - 在本地模式下，仅当 `gateway.auth.*` 未设置时，`gateway.remote.*` 才可作为回退；已配置但未解析的本地 SecretRef 会以关闭失败处理
    - 在适用时，通过 `gateway.remote.*` 支持远程模式
    - URL 覆盖是安全的：CLI 覆盖不会复用隐式凭证，环境变量覆盖仅使用环境变量凭证

    审批解析行为：

    - 以 `plugin:` 为前缀的 ID 通过 `plugin.approval.resolve` 解析。
    - 其他 ID 通过 `exec.approval.resolve` 解析。
    - Discord 在这里不会额外执行从 exec 到 plugin 的回退跳转；ID 前缀决定调用哪种 gateway 方法。

    默认情况下，Exec 审批在 30 分钟后过期。如果审批因未知审批 ID 而失败，请检查 approver 解析、功能启用状态，以及已投递的 approval id 类型是否与待处理请求匹配。

    相关文档：[Exec approvals](/tools/exec-approvals)

  </Accordion>
</AccordionGroup>

## 工具和动作门控

Discord 消息动作包括消息、渠道管理、审核、presence 和元数据动作。

核心示例：

- 消息：`sendMessage`、`readMessages`、`editMessage`、`deleteMessage`、`threadReply`
- 反应：`react`、`reactions`、`emojiList`
- 审核：`timeout`、`kick`、`ban`
- presence：`setPresence`

动作门控位于 `channels.discord.actions.*` 下。

默认门控行为：

| 动作组 | 默认值 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| reactions、messages、threads、pins、polls、search、memberInfo、roleInfo、channelInfo、channels、voiceStatus、events、stickers、emojiUploads、stickerUploads、permissions | 已启用 |
| roles | 已禁用 |
| moderation | 已禁用 |
| presence | 已禁用 |

## Components v2 UI

OpenClaw 对 exec 审批和跨上下文标记使用 Discord components v2。Discord 消息动作也可以接受 `components` 以构建自定义 UI（高级用法；需要通过 discord 工具构造组件负载），而旧版 `embeds` 仍然可用，但不推荐。

- `channels.discord.ui.components.accentColor` 设置 Discord 组件容器使用的强调色（hex）。
- 可按账户使用 `channels.discord.accounts.<id>.ui.components.accentColor` 设置。
- 当存在 components v2 时，`embeds` 会被忽略。

示例：

```json5
{
  channels: {
    discord: {
      ui: {
        components: {
          accentColor: "#5865F2",
        },
      },
    },
  },
}
```

## 语音频道

OpenClaw 可以加入 Discord 语音频道，进行实时、连续的对话。这与语音消息附件是分开的。

要求：

- 启用原生命令（`commands.native` 或 `channels.discord.commands.native`）。
- 配置 `channels.discord.voice`。
- Bot 在目标语音频道中需要 Connect + Speak 权限。

使用 Discord 专用原生命令 `/vc join|leave|status` 控制会话。该命令使用账户默认智能体，并遵循与其他 Discord 命令相同的 allowlist 和 group 策略规则。

自动加入示例：

```json5
{
  channels: {
    discord: {
      voice: {
        enabled: true,
        autoJoin: [
          {
            guildId: "123456789012345678",
            channelId: "234567890123456789",
          },
        ],
        daveEncryption: true,
        decryptionFailureTolerance: 24,
        tts: {
          provider: "openai",
          openai: { voice: "alloy" },
        },
      },
    },
  },
}
```

说明：

- `voice.tts` 仅覆盖语音播放，不影响 `messages.tts`。
- 语音转录轮次会从 Discord `allowFrom`（或 `dm.allowFrom`）派生 owner 状态；非 owner 说话者无法访问仅 owner 可用的工具（例如 `gateway` 和 `cron`）。
- 语音默认启用；设置 `channels.discord.voice.enabled=false` 可禁用。
- `voice.daveEncryption` 和 `voice.decryptionFailureTolerance` 会直接传递给 `@discordjs/voice` 的加入选项。
- 如果未设置，`@discordjs/voice` 的默认值为 `daveEncryption=true` 和 `decryptionFailureTolerance=24`。
- OpenClaw 还会监测接收端解密失败，并在短时间内重复失败后通过离开/重新加入语音频道来自动恢复。
- 如果接收日志持续显示 `DecryptionFailed(UnencryptedWhenPassthroughDisabled)`，这可能是上游 `@discordjs/voice` 的接收 bug，详见 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419)。

## 语音消息

Discord 语音消息会显示波形预览，并要求使用 OGG/Opus 音频和元数据。OpenClaw 会自动生成波形，但需要在 Gateway 网关主机上提供 `ffmpeg` 和 `ffprobe` 来检查和转换音频文件。

要求和限制：

- 提供**本地文件路径**（不接受 URL）。
- 省略文本内容（Discord 不允许在同一负载中同时发送文本和语音消息）。
- 接受任意音频格式；OpenClaw 会在需要时转换为 OGG/Opus。

示例：

```bash
message(action="send", channel="discord", target="channel:123", path="/path/to/audio.mp3", asVoice=true)
```

## 故障排除

<AccordionGroup>
  <Accordion title="使用了不允许的 intents，或 bot 看不到 guild 消息">

    - 启用 Message Content Intent
    - 当你依赖用户/成员解析时，启用 Server Members Intent
    - 更改 intents 后重启 Gateway 网关

  </Accordion>

  <Accordion title="Guild 消息被意外阻止">

    - 检查 `groupPolicy`
    - 检查 `channels.discord.guilds` 下的 guild allowlist
    - 如果存在 guild `channels` 映射，则仅允许列出的渠道
    - 检查 `requireMention` 行为和 mention 模式

    常用检查：

```bash
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

  </Accordion>

  <Accordion title="Require mention 为 false，但仍然被阻止">
    常见原因：

    - `groupPolicy="allowlist"`，但没有匹配的 guild/渠道 allowlist
    - `requireMention` 配置在错误位置（必须位于 `channels.discord.guilds` 或渠道条目下）
    - 发送者被 guild/渠道 `users` allowlist 阻止

  </Accordion>

  <Accordion title="长时间运行的处理器超时或重复回复">

    典型日志：

    - `Listener DiscordMessageListener timed out after 30000ms for event MESSAGE_CREATE`
    - `Slow listener detected ...`
    - `discord inbound worker timed out after ...`

    监听器预算开关：

    - 单账户：`channels.discord.eventQueue.listenerTimeout`
    - 多账户：`channels.discord.accounts.<accountId>.eventQueue.listenerTimeout`

    Worker 运行超时开关：

    - 单账户：`channels.discord.inboundWorker.runTimeoutMs`
    - 多账户：`channels.discord.accounts.<accountId>.inboundWorker.runTimeoutMs`
    - 默认值：`1800000`（30 分钟）；设置为 `0` 可禁用

    推荐基线：

```json5
{
  channels: {
    discord: {
      accounts: {
        default: {
          eventQueue: {
            listenerTimeout: 120000,
          },
          inboundWorker: {
            runTimeoutMs: 1800000,
          },
        },
      },
    },
  },
}
```

    对于较慢的监听器初始化，请使用 `eventQueue.listenerTimeout`；只有在你想为排队中的智能体轮次设置单独的安全阀时，才使用 `inboundWorker.runTimeoutMs`。

  </Accordion>

  <Accordion title="权限审计不匹配">
    `channels status --probe` 的权限检查仅适用于数字渠道 ID。

    如果你使用 slug 键，运行时匹配仍可能正常工作，但探测无法完整验证权限。

  </Accordion>

  <Accordion title="私信和配对问题">

    - 私信已禁用：`channels.discord.dm.enabled=false`
    - 私信策略已禁用：`channels.discord.dmPolicy="disabled"`（旧版：`channels.discord.dm.policy`）
    - 在 `pairing` 模式下等待配对批准

  </Accordion>

  <Accordion title="Bot 到 bot 的循环">
    默认情况下，由 bot 编写的消息会被忽略。

    如果你设置了 `channels.discord.allowBots=true`，请使用严格的 mention 和 allowlist 规则以避免循环行为。
    更推荐使用 `channels.discord.allowBots="mentions"`，仅接受提及 bot 的 bot 消息。

  </Accordion>

  <Accordion title="语音 STT 因 DecryptionFailed(...) 丢失">

    - 保持 OpenClaw 为最新版本（`openclaw update`），以确保包含 Discord 语音接收恢复逻辑
    - 确认 `channels.discord.voice.daveEncryption=true`（默认值）
    - 从 `channels.discord.voice.decryptionFailureTolerance=24`（上游默认值）开始，仅在需要时调整
    - 观察日志中是否出现：
      - `discord voice: DAVE decrypt failures detected`
      - `discord voice: repeated decrypt failures; attempting rejoin`
    - 如果自动重新加入后仍持续失败，请收集日志并与 [discord.js #11419](https://github.com/discordjs/discord.js/issues/11419) 进行比对

  </Accordion>
</AccordionGroup>

## 配置参考指引

主要参考：

- [Configuration reference - Discord](/gateway/configuration-reference#discord)

高信号的 Discord 字段：

- 启动/认证：`enabled`、`token`、`accounts.*`、`allowBots`
- 策略：`groupPolicy`、`dm.*`、`guilds.*`、`guilds.*.channels.*`
- 命令：`commands.native`、`commands.useAccessGroups`、`configWrites`、`slashCommand.*`
- 事件队列：`eventQueue.listenerTimeout`（监听器预算）、`eventQueue.maxQueueSize`、`eventQueue.maxConcurrency`
- 入站 worker：`inboundWorker.runTimeoutMs`
- 回复/历史：`replyToMode`、`historyLimit`、`dmHistoryLimit`、`dms.*.historyLimit`
- 投递：`textChunkLimit`、`chunkMode`、`maxLinesPerMessage`
- 流式传输：`streaming`（旧版别名：`streamMode`）、`draftChunk`、`blockStreaming`、`blockStreamingCoalesce`
- 媒体/重试：`mediaMaxMb`、`retry`
  - `mediaMaxMb` 限制 Discord 出站上传大小（默认：`100MB`）
- 动作：`actions.*`
- presence：`activity`、`status`、`activityType`、`activityUrl`
- UI：`ui.components.accentColor`
- 功能：`threadBindings`、顶层 `bindings[]`（`type: "acp"`）、`pluralkit`、`execApprovals`、`intents`、`agentComponents`、`heartbeat`、`responsePrefix`

## 安全和运维

- 将 bot token 视为机密（在受监管环境中优先使用 `DISCORD_BOT_TOKEN`）。
- 授予最小权限的 Discord 权限。
- 如果命令部署/状态已过时，请重启 Gateway 网关，并使用 `openclaw channels status --probe` 重新检查。

## 相关内容

- [配对](/zh-CN/channels/pairing)
- [群组](/zh-CN/channels/groups)
- [渠道路由](/zh-CN/channels/channel-routing)
- [安全](/gateway/security)
- [多智能体路由](/concepts/multi-agent)
- [故障排除](/zh-CN/channels/troubleshooting)
- [Slash commands](/tools/slash-commands)
