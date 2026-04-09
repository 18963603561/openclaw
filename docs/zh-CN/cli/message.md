---
read_when:
    - 添加或修改 message CLI actions
    - 变更出站渠道行为
summary: '`openclaw message` 的 CLI 参考（send + 渠道 actions）'
title: message
x-i18n:
    generated_at: "2026-04-08T03:54:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: b70f36189d028d59db25cd8b39d7c67883eaea71bea2358ee6314eec6cd2fa51
    source_path: cli\message.md
    workflow: 15
---

# `openclaw message`

用于发送消息和执行渠道 actions 的统一出站命令
（Discord/Google Chat/iMessage/Matrix/Mattermost（插件）/Microsoft Teams/Signal/Slack/Telegram/WhatsApp）。

## 用法

```
openclaw message <subcommand> [flags]
```

渠道选择：

- 如果配置了多个渠道，则必须提供 `--channel`
- 如果只配置了一个渠道，则它会成为默认值
- 取值：`discord|googlechat|imessage|matrix|mattermost|msteams|signal|slack|telegram|whatsapp`（Mattermost 需要插件）

目标格式（`--target`）：

- WhatsApp：E.164 或群组 JID
- Telegram：chat id 或 `@username`
- Discord：`channel:<id>` 或 `user:<id>`（或 `<@id>` 提及；原始数字 id 会被视为渠道）
- Google Chat：`spaces/<spaceId>` 或 `users/<userId>`
- Slack：`channel:<id>` 或 `user:<id>`（接受原始 channel id）
- Mattermost（插件）：`channel:<id>`、`user:<id>` 或 `@username`（裸 id 会被视为渠道）
- Signal：`+E.164`、`group:<id>`、`signal:+E.164`、`signal:group:<id>` 或 `username:<name>`/`u:<name>`
- iMessage：handle、`chat_id:<id>`、`chat_guid:<guid>` 或 `chat_identifier:<id>`
- Matrix：`@user:server`、`!room:server` 或 `#alias:server`
- Microsoft Teams：conversation id（`19:...@thread.tacv2`）或 `conversation:<id>` 或 `user:<aad-object-id>`

名称查找：

- 对于受支持的提供商（Discord/Slack 等），像 `Help` 或 `#help` 这样的渠道名称会通过目录缓存解析。
- 缓存未命中时，如果提供商支持，OpenClaw 会尝试实时目录查找。

## 通用 flags

- `--channel <name>`
- `--account <id>`
- `--target <dest>`（用于 send/poll/read 等的目标渠道或用户）
- `--targets <name>`（可重复；仅用于 broadcast）
- `--json`
- `--dry-run`
- `--verbose`

## SecretRef 行为

- `openclaw message` 会在执行所选 action 之前解析受支持的渠道 SecretRef。
- 在可能时，解析会限定在当前 action 目标范围内：
  - 设置了 `--channel` 时（或可从 `discord:...` 这类带前缀目标推断时），限定为渠道级
  - 设置了 `--account` 时，限定为账户级（渠道全局 + 所选账户接口）
  - 省略 `--account` 时，OpenClaw 不会强制使用 `default` 账户的 SecretRef 范围
- 与目标无关渠道上的未解析 SecretRef 不会阻塞定向 message action。
- 如果所选渠道/账户的 SecretRef 无法解析，则该 action 会以失败关闭方式结束。

## Actions

### 核心

- `send`
  - 渠道：WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix/Microsoft Teams
  - 必填：`--target`，以及 `--message` 或 `--media`
  - 可选：`--media`、`--interactive`、`--buttons`、`--components`、`--card`、`--reply-to`、`--thread-id`、`--gif-playback`、`--force-document`、`--silent`
  - 共享交互负载：`--interactive` 在支持时发送渠道原生交互式 JSON 负载
  - 仅 Telegram：`--buttons`（需要 `channels.telegram.capabilities.inlineButtons` 允许）
  - 仅 Telegram：`--force-document`（将图片和 GIF 作为文档发送，以避免 Telegram 压缩）
  - 仅 Telegram：`--thread-id`（forum 主题 id）
  - 仅 Slack：`--thread-id`（线程时间戳；`--reply-to` 使用同一字段）
  - 仅 Discord：`--components` JSON 负载
  - Adaptive Card 渠道：支持时使用 `--card` JSON 负载
  - Telegram + Discord：`--silent`
  - 仅 WhatsApp：`--gif-playback`

- `poll`
  - 渠道：WhatsApp/Telegram/Discord/Matrix/Microsoft Teams
  - 必填：`--target`、`--poll-question`、`--poll-option`（可重复）
  - 可选：`--poll-multi`
  - 仅 Discord：`--poll-duration-hours`、`--silent`、`--message`
  - 仅 Telegram：`--poll-duration-seconds`（5-600）、`--silent`、`--poll-anonymous` / `--poll-public`、`--thread-id`

- `react`
  - 渠道：Discord/Google Chat/Slack/Telegram/WhatsApp/Signal/Matrix
  - 必填：`--message-id`、`--target`
  - 可选：`--emoji`、`--remove`、`--participant`、`--from-me`、`--target-author`、`--target-author-uuid`
  - 说明：`--remove` 需要 `--emoji`（若省略 `--emoji`，则会在支持时清除自己的 reactions；参见 /tools/reactions）
  - 仅 WhatsApp：`--participant`、`--from-me`
  - Signal 群组 reaction：必须提供 `--target-author` 或 `--target-author-uuid`

- `reactions`
  - 渠道：Discord/Google Chat/Slack/Matrix
  - 必填：`--message-id`、`--target`
  - 可选：`--limit`

- `read`
  - 渠道：Discord/Slack/Matrix
  - 必填：`--target`
  - 可选：`--limit`、`--before`、`--after`
  - 仅 Discord：`--around`

- `edit`
  - 渠道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--message`、`--target`

- `delete`
  - 渠道：Discord/Slack/Telegram/Matrix
  - 必填：`--message-id`、`--target`

- `pin` / `unpin`
  - 渠道：Discord/Slack/Matrix
  - 必填：`--message-id`、`--target`

- `pins`（列出）
  - 渠道：Discord/Slack/Matrix
  - 必填：`--target`

- `permissions`
  - 渠道：Discord/Matrix
  - 必填：`--target`
  - 仅 Matrix：当启用 Matrix 加密且允许 verification actions 时可用

- `search`
  - 渠道：Discord
  - 必填：`--guild-id`、`--query`
  - 可选：`--channel-id`、`--channel-ids`（可重复）、`--author-id`、`--author-ids`（可重复）、`--limit`

### 线程

- `thread create`
  - 渠道：Discord
  - 必填：`--thread-name`、`--target`（channel id）
  - 可选：`--message-id`、`--message`、`--auto-archive-min`

- `thread list`
  - 渠道：Discord
  - 必填：`--guild-id`
  - 可选：`--channel-id`、`--include-archived`、`--before`、`--limit`

- `thread reply`
  - 渠道：Discord
  - 必填：`--target`（thread id）、`--message`
  - 可选：`--media`、`--reply-to`

### Emoji

- `emoji list`
  - Discord：`--guild-id`
  - Slack：无额外 flags

- `emoji upload`
  - 渠道：Discord
  - 必填：`--guild-id`、`--emoji-name`、`--media`
  - 可选：`--role-ids`（可重复）

### 贴纸

- `sticker send`
  - 渠道：Discord
  - 必填：`--target`、`--sticker-id`（可重复）
  - 可选：`--message`

- `sticker upload`
  - 渠道：Discord
  - 必填：`--guild-id`、`--sticker-name`、`--sticker-desc`、`--sticker-tags`、`--media`

### 角色 / 渠道 / 成员 / 语音

- `role info`（Discord）：`--guild-id`
- `role add` / `role remove`（Discord）：`--guild-id`、`--user-id`、`--role-id`
- `channel info`（Discord）：`--target`
- `channel list`（Discord）：`--guild-id`
- `member info`（Discord/Slack）：`--user-id`（Discord 还需 `--guild-id`）
- `voice status`（Discord）：`--guild-id`、`--user-id`

### 事件

- `event list`（Discord）：`--guild-id`
- `event create`（Discord）：`--guild-id`、`--event-name`、`--start-time`
  - 可选：`--end-time`、`--desc`、`--channel-id`、`--location`、`--event-type`

### 审核（Discord）

- `timeout`：`--guild-id`、`--user-id`（可选 `--duration-min` 或 `--until`；两者都省略则清除 timeout）
- `kick`：`--guild-id`、`--user-id`（加 `--reason`）
- `ban`：`--guild-id`、`--user-id`（加 `--delete-days`、`--reason`）
  - `timeout` 也支持 `--reason`

### 广播

- `broadcast`
  - 渠道：任意已配置渠道；使用 `--channel all` 可面向所有提供商
  - 必填：`--targets <target...>`
  - 可选：`--message`、`--media`、`--dry-run`

## 示例

发送一条 Discord 回复：

```
openclaw message send --channel discord \
  --target channel:123 --message "hi" --reply-to 456
```

发送带 components 的 Discord 消息：

```
openclaw message send --channel discord \
  --target channel:123 --message "Choose:" \
  --components '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve","style":"success"},{"label":"Decline","style":"danger"}]}]}'
```

完整 schema 请参见 [Discord components](/zh-CN/channels/discord#interactive-components)。

发送共享交互负载：

```bash
openclaw message send --channel googlechat --target spaces/AAA... \
  --message "Choose:" \
  --interactive '{"text":"Choose a path","blocks":[{"type":"actions","buttons":[{"label":"Approve"},{"label":"Decline"}]}]}'
```

创建一个 Discord 投票：

```
openclaw message poll --channel discord \
  --target channel:123 \
  --poll-question "Snack?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-multi --poll-duration-hours 48
```

创建一个 Telegram 投票（2 分钟后自动关闭）：

```
openclaw message poll --channel telegram \
  --target @mychat \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi \
  --poll-duration-seconds 120 --silent
```

发送一条 Teams 主动消息：

```
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 --message "hi"
```

创建一个 Teams 投票：

```
openclaw message poll --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" \
  --poll-option Pizza --poll-option Sushi
```

在 Slack 中添加 reaction：

```
openclaw message react --channel slack \
  --target C123 --message-id 456 --emoji "✅"
```

在 Signal 群组中添加 reaction：

```
openclaw message react --channel signal \
  --target signal:group:abc123 --message-id 1737630212345 \
  --emoji "✅" --target-author-uuid 123e4567-e89b-12d3-a456-426614174000
```

发送 Telegram 内联按钮：

```
openclaw message send --channel telegram --target @mychat --message "Choose:" \
  --buttons '[ [{"text":"Yes","callback_data":"cmd:yes"}], [{"text":"No","callback_data":"cmd:no"}] ]'
```

发送一个 Teams Adaptive Card：

```bash
openclaw message send --channel msteams \
  --target conversation:19:abc@thread.tacv2 \
  --card '{"type":"AdaptiveCard","version":"1.5","body":[{"type":"TextBlock","text":"Status update"}]}'
```

将 Telegram 图片作为文档发送，以避免压缩：

```bash
openclaw message send --channel telegram --target @mychat \
  --media ./diagram.png --force-document
```
