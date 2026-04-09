---
read_when:
    - 在 OpenClaw 中设置 Matrix
    - 配置 Matrix E2EE 和验证
summary: Matrix 的支持状态、设置和配置示例
title: Matrix
x-i18n:
    generated_at: "2026-04-08T03:47:14Z"
    model: gpt-5.4
    provider: openai
    source_hash: ec926df79a41fa296d63f0ec7219d0f32e075628d76df9ea490e93e4c5030f83
    source_path: channels\matrix.md
    workflow: 15
---

# Matrix

Matrix 是 OpenClaw 的 Matrix 内置渠道插件。
它使用官方 `matrix-js-sdk`，并支持私信、房间、线程、媒体、反应、投票、位置和 E2EE。

## 内置插件

在当前的 OpenClaw 版本中，Matrix 作为内置插件提供，因此普通打包构建不需要单独安装。

如果你使用的是较旧的构建版本，或是不包含 Matrix 的自定义安装，请手动安装：

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出目录安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

有关插件行为和安装规则，参见 [插件](/tools/plugin)。

## 设置

1. 确保 Matrix 插件可用。
   - 当前打包版 OpenClaw 已经内置了它。
   - 旧版/自定义安装可以使用上面的命令手动添加它。
2. 在你的 homeserver 上创建一个 Matrix 账号。
3. 配置 `channels.matrix`，使用以下任一方式：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重启 gateway。
5. 与机器人开启一个私信，或邀请它加入一个房间。
   - 只有当 `channels.matrix.autoJoin` 允许时，新发出的 Matrix 邀请才会生效。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 向导实际会询问以下内容：

- homeserver URL
- 身份验证方式：access token 或密码
- 仅在你选择密码身份验证时才询问用户 ID
- 可选设备名称
- 是否启用 E2EE
- 是否现在配置 Matrix 房间访问
- 是否现在配置 Matrix 邀请自动加入
- 当启用邀请自动加入时，是否应设置为 `allowlist`、`always` 或 `off`

需要注意的向导行为：

- 如果所选账户已经存在 Matrix 身份验证环境变量，并且该账户在配置中尚未保存身份验证信息，向导会提供一个环境变量快捷方式，这样设置过程就可以继续将身份验证保留在环境变量中，而不是把密钥复制到配置里。
- 当你以交互方式添加另一个 Matrix 账户时，输入的账户名会被规范化为配置和环境变量中使用的账户 ID。例如，`Ops Bot` 会变成 `ops-bot`。
- 私信允许列表提示会立即接受完整的 `@user:server` 值。显示名称只有在实时目录查找得到一个精确匹配时才可用；否则向导会要求你使用完整的 Matrix ID 重试。
- 房间允许列表提示会直接接受房间 ID 和别名。它们也可以实时解析已加入房间的名称，但在设置期间无法解析的名称只会按输入原样保留，之后会在运行时允许列表解析中被忽略。优先使用 `!room:server` 或 `#alias:server`。
- 向导现在会在邀请自动加入步骤前显示明确警告，因为 `channels.matrix.autoJoin` 默认是 `off`；除非你显式设置它，否则智能体不会加入被邀请的房间或新的私信式邀请。
- 在邀请自动加入的 allowlist 模式下，只能使用稳定的邀请目标：`!roomId:server`、`#alias:server` 或 `*`。普通房间名称会被拒绝。
- 运行时的房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，而不会作为长期会话键或稳定群组身份。
- 如需在保存前解析房间名称，可使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 默认值为 `off`。

如果你保持未设置，机器人将不会加入被邀请的房间或新的私信式邀请，因此除非你先手动加入，否则它不会出现在新的群组或被邀请的私信中。

设置 `autoJoin: "allowlist"` 并搭配 `autoJoinAllowlist` 可以限制它接受哪些邀请，或者设置 `autoJoin: "always"` 让它加入所有邀请。

在 `allowlist` 模式下，`autoJoinAllowlist` 只接受 `!roomId:server`、`#alias:server` 或 `*`。
</Warning>

允许列表示例：

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

加入所有邀请：

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

基于 token 的最简设置：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

基于密码的设置（登录后会缓存 token）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

Matrix 会将缓存的凭证存储在 `~/.openclaw/credentials/matrix/` 中。
默认账户使用 `credentials.json`；命名账户使用 `credentials-<account>.json`。
当这些位置存在缓存凭证时，即使当前身份验证未直接设置在配置中，OpenClaw 也会在设置、Doctor 和渠道状态发现中将 Matrix 视为已配置。

对应的环境变量（当配置键未设置时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认账户，使用按账户作用域的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账户 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于规范化账户 ID `ops-bot`，使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 会对账户 ID 中的标点符号进行转义，以避免作用域环境变量发生冲突。
例如，`-` 会变成 `_X2D_`，因此 `ops-prod` 会映射为 `MATRIX_OPS_X2D_PROD_*`。

只有当这些身份验证环境变量已经存在，并且所选账户在配置中尚未保存 Matrix 身份验证时，交互式向导才会提供环境变量快捷方式。

## 配置示例

这是一个实用的基线配置，启用了私信配对、房间允许列表和 E2EE：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

`autoJoin` 适用于 Matrix 邀请的整体行为，而不仅仅是房间/群组邀请。
这也包括新的私信式邀请。在邀请发生时，OpenClaw 还不能可靠地知道被邀请的房间最终会被视为私信还是群组，因此所有邀请都会先经过相同的 `autoJoin` 决策。`dm.policy` 仍会在机器人加入并且该房间被归类为私信后生效，因此 `autoJoin` 控制的是加入行为，而 `dm.policy` 控制的是回复/访问行为。

## 流式预览

Matrix 回复流式传输需要显式启用。

当你希望 OpenClaw 发送一条实时预览回复，在模型生成文本期间原地编辑该预览，并在回复完成后最终定稿时，请将 `channels.matrix.streaming` 设为 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是默认值。OpenClaw 会等待最终回复，然后一次性发送。
- `streaming: "partial"` 会为当前 assistant 块创建一条可编辑的预览消息，并使用普通的 Matrix 文本消息在原地更新。这会保留 Matrix 传统的“先预览后通知”行为，因此标准客户端可能会在第一段流式预览文本出现时通知，而不是在最终完成的块出现时通知。
- `streaming: "quiet"` 会为当前 assistant 块创建一条可编辑的静默预览通知。仅当你同时为最终定稿的预览编辑配置了接收者推送规则时，才应使用此模式。
- `blockStreaming: true` 会启用单独的 Matrix 进度消息。启用预览流式传输时，Matrix 会保留当前块的实时草稿，并将已完成的块作为独立消息保留下来。
- 当预览流式传输开启而 `blockStreaming` 关闭时，Matrix 会原地编辑实时草稿，并在块或轮次结束时将同一事件定稿。
- 如果预览内容已无法容纳进单个 Matrix 事件，OpenClaw 会停止预览流式传输，并回退到普通的最终交付方式。
- 媒体回复仍会正常发送附件。如果旧预览无法再安全复用，OpenClaw 会在发送最终媒体回复前将其清除。
- 预览编辑会产生额外的 Matrix API 调用。如果你希望采取最保守的限流行为，请保持关闭流式传输。

`blockStreaming` 本身不会启用草稿预览。
使用 `streaming: "partial"` 或 `streaming: "quiet"` 开启预览编辑；然后仅当你还希望已完成的 assistant 块作为独立的进度消息保留下来时，再添加 `blockStreaming: true`。

如果你需要标准 Matrix 通知而不配置自定义推送规则，请使用 `streaming: "partial"` 获得“先预览”行为，或者保持 `streaming` 关闭以实现“仅最终结果”交付。当 `streaming: "off"` 时：

- `blockStreaming: true` 会将每个已完成块作为普通的可通知 Matrix 消息发送。
- `blockStreaming: false` 只会将最终完成的回复作为普通的可通知 Matrix 消息发送。

### 自托管环境中为静默最终预览配置推送规则

如果你运行自己的 Matrix 基础设施，并希望静默预览只在某个块或最终回复完成时通知，请设置 `streaming: "quiet"`，并为最终定稿的预览编辑添加按用户生效的推送规则。

这通常是接收方用户的设置，而不是 homeserver 全局配置变更：

开始前的快速映射：

- 接收方用户 = 应收到通知的人
- 机器人用户 = 发送回复的 OpenClaw Matrix 账户
- 下方的 API 调用要使用接收方用户的 access token
- 在推送规则里，将 `sender` 与机器人用户的完整 MXID 匹配

1. 配置 OpenClaw 使用静默预览：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 确保接收方账户已经能收到普通 Matrix 推送通知。静默预览规则只有在该用户已经有正常工作的 pusher/设备时才有效。

3. 获取接收方用户的 access token。
   - 使用接收消息用户的 token，而不是机器人的 token。
   - 复用现有客户端会话 token 通常最简单。
   - 如果你需要签发新的 token，可以通过标准 Matrix Client-Server API 登录：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": {
      "type": "m.id.user",
      "user": "@alice:example.org"
    },
    "password": "REDACTED"
  }'
```

4. 验证接收方账户已经有 pusher：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果这里返回没有活动 pusher/设备，请先修复普通 Matrix 通知，再添加下面的 OpenClaw 规则。

OpenClaw 会将已定稿的纯文本预览编辑标记为：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 为每个需要接收此类通知的接收方账户创建一条 override 推送规则：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

运行命令前请替换以下值：

- `https://matrix.example.org`：你的 homeserver 基础 URL
- `$USER_ACCESS_TOKEN`：接收方用户的 access token
- `openclaw-finalized-preview-botname`：对该接收用户而言，针对此机器人的唯一规则 ID
- `@bot:example.org`：你的 OpenClaw Matrix 机器人 MXID，而不是接收方用户的 MXID

多机器人设置的重要说明：

- 推送规则以 `ruleId` 为键。对相同 rule ID 再次执行 `PUT` 会更新那一条规则。
- 如果同一个接收方用户需要对多个 OpenClaw Matrix 机器人账户产生通知，请为每个机器人创建一条规则，并为每个 sender 匹配使用唯一的 rule ID。
- 一种简单模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

该规则是针对事件发送者进行匹配的：

- 使用接收方用户的 token 进行身份验证
- 将 `sender` 与 OpenClaw 机器人 MXID 匹配

6. 验证规则已存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 测试一条流式回复。在 quiet 模式下，房间应显示一个静默的草稿预览，并在块或轮次完成时，对最终的原地编辑触发一次通知。

如果之后需要删除该规则，请使用接收方用户的 token 删除同一个 rule ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

说明：

- 创建规则时使用接收方用户的 access token，而不是机器人的。
- 新建的用户自定义 `override` 规则会插入到默认抑制规则之前，因此不需要额外的顺序参数。
- 这只影响 OpenClaw 能够安全原地定稿的纯文本预览编辑。媒体回退和旧预览回退仍使用普通 Matrix 交付方式。
- 如果 `GET /_matrix/client/v3/pushers` 显示没有 pusher，则表示该用户在此账户/设备上还没有可用的 Matrix 推送交付。

#### Synapse

对于 Synapse，通常只需完成以上设置即可：

- 不需要为 OpenClaw 最终预览通知做特殊的 `homeserver.yaml` 修改。
- 如果你的 Synapse 部署已经能发送普通 Matrix 推送通知，那么上面的用户 token + `pushrules` 调用就是主要设置步骤。
- 如果你在反向代理或 workers 后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 能正确到达 Synapse。
- 如果你使用 Synapse workers，请确保 pushers 健康。推送交付由主进程或 `synapse.app.pusher` / 已配置的 pusher workers 处理。

#### Tuwunel

对于 Tuwunel，使用与上面相同的设置流程和 push-rule API 调用：

- 对最终预览标记本身，不需要任何 Tuwunel 特定配置。
- 如果该用户的普通 Matrix 通知已经正常工作，那么上面的用户 token + `pushrules` 调用就是主要设置步骤。
- 如果用户在另一台设备上活跃时通知似乎消失，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日发布的 Tuwunel 1.4.2 中新增了此选项，它可能会在一台设备活跃时，有意抑制向其他设备发送推送。

## 加密与验证

在加密（E2EE）房间中，出站图片事件使用 `thumbnail_file`，因此图片预览会与完整附件一起被加密。未加密房间仍使用普通的 `thumbnail_url`。不需要额外配置——插件会自动检测 E2EE 状态。

### 机器人对机器人房间

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息会被忽略。

当你明确希望启用智能体之间的 Matrix 通信时，使用 `allowBots`：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` 会在允许的房间和私信中接受来自其他已配置 Matrix 机器人账户的消息。
- `allowBots: "mentions"` 仅在这些消息在房间中明确提及当前机器人时才接受。私信仍然允许。
- `groups.<room>.allowBots` 可对单个房间覆盖账户级设置。
- OpenClaw 仍会忽略来自相同 Matrix 用户 ID 的消息，以避免自我回复循环。
- Matrix 这里没有原生的机器人标记；OpenClaw 将“机器人发送的消息”定义为“由此 OpenClaw Gateway 网关上另一个已配置 Matrix 账户发送的消息”。

在共享房间中启用机器人对机器人通信时，请使用严格的房间允许列表和提及要求。

启用加密：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

检查验证状态：

```bash
openclaw matrix verify status
```

详细状态（完整诊断）：

```bash
openclaw matrix verify status --verbose
```

在机器可读输出中包含已存储的恢复密钥：

```bash
openclaw matrix verify status --include-recovery-key --json
```

初始化跨签名和验证状态：

```bash
openclaw matrix verify bootstrap
```

多账户支持：使用 `channels.matrix.accounts` 配置各账户凭证和可选 `name`。共享模式参见 [配置参考](/gateway/configuration-reference#multi-account-all-channels)。

详细 bootstrap 诊断：

```bash
openclaw matrix verify bootstrap --verbose
```

在 bootstrap 前强制重置跨签名身份：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢复密钥验证此设备：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

详细设备验证信息：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

检查房间密钥备份健康状态：

```bash
openclaw matrix verify backup status
```

详细备份健康诊断：

```bash
openclaw matrix verify backup status --verbose
```

从服务器备份恢复房间密钥：

```bash
openclaw matrix verify backup restore
```

详细恢复诊断：

```bash
openclaw matrix verify backup restore --verbose
```

删除当前服务器备份并创建一个新的备份基线。如果存储的备份密钥无法被干净加载，此重置也可以重建密钥存储，以便后续冷启动能够加载新的备份密钥：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 命令默认都保持简洁输出（包括安静的内部 SDK 日志），只有在使用 `--verbose` 时才显示详细诊断。
编写脚本时，使用 `--json` 获取完整的机器可读输出。

在多账户设置中，除非你传入 `--account <id>`，否则 Matrix CLI 命令会使用隐式的 Matrix 默认账户。
如果你配置了多个命名账户，请先设置 `channels.matrix.defaultAccount`，否则这些隐式 CLI 操作将停止并要求你显式选择一个账户。
当你希望验证或设备操作明确作用于某个命名账户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当某个命名账户未启用加密或无法使用加密时，Matrix 警告和验证错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

### “已验证”是什么意思

只有当这个 Matrix 设备被你自己的跨签名身份验证后，OpenClaw 才会将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 会暴露三个信任信号：

- `Locally trusted`：该设备仅被当前客户端信任
- `Cross-signing verified`：SDK 报告该设备已通过跨签名验证
- `Signed by owner`：该设备已由你自己的 self-signing key 签名

只有当存在跨签名验证或 owner 签名时，`Verified by owner` 才会变为 `yes`。
仅有本地信任，不足以让 OpenClaw 将该设备视为完全已验证。

### bootstrap 会做什么

`openclaw matrix verify bootstrap` 是用于修复和设置加密 Matrix 账户的命令。
它会按顺序执行以下所有操作：

- 初始化密钥存储，并在可能时复用现有恢复密钥
- 初始化跨签名并上传缺失的公开跨签名密钥
- 尝试标记并跨签名当前设备
- 如果服务器端还不存在房间密钥备份，则创建一个新的备份

如果 homeserver 需要交互式身份验证来上传跨签名密钥，OpenClaw 会先尝试无身份验证上传，然后尝试 `m.login.dummy`，最后在配置了 `channels.matrix.password` 时尝试 `m.login.password`。

仅当你明确想要丢弃当前跨签名身份并创建新的身份时，才使用 `--force-reset-cross-signing`。

如果你明确希望丢弃当前房间密钥备份，并为未来消息创建新的备份基线，请使用 `openclaw matrix verify backup reset --yes`。
只有在你接受不可恢复的旧加密历史将继续不可用，并且当当前备份密钥无法安全加载时 OpenClaw 可能会重建密钥存储的情况下，才这样做。

### 全新的备份基线

如果你希望未来的加密消息仍可正常工作，并接受丢失无法恢复的旧历史，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果你希望明确作用于某个命名 Matrix 账户，请为每个命令添加 `--account <id>`。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设为 `"if-unverified"`。
启动时，如果该设备仍未验证，Matrix 会在另一个 Matrix 客户端中请求自我验证；如果已有一个待处理请求，则跳过重复请求；在重启后再次重试前会应用本地冷却时间。
默认情况下，失败的请求尝试会比成功创建请求后的重试更快。
如需禁用自动启动请求，请设置 `startupVerification: "off"`；如果你希望更短或更长的重试窗口，可调整 `startupVerificationCooldownHours`。

启动时也会自动执行一次保守的加密 bootstrap 过程。
该过程会优先尝试复用当前密钥存储和跨签名身份，并避免重置跨签名，除非你显式运行 bootstrap 修复流程。

如果启动时发现 bootstrap 状态损坏，并且配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已经带有 owner 签名，OpenClaw 会保留该身份，而不会自动重置它。

从之前公开的 Matrix 插件升级时：

- OpenClaw 会在可能时自动复用相同的 Matrix 账户、access token 和设备身份。
- 在运行任何可执行的 Matrix 迁移更改之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或复用一个恢复快照。
- 如果你使用多个 Matrix 账户，请在从旧的平面存储布局升级前先设置 `channels.matrix.defaultAccount`，这样 OpenClaw 才知道应将那份共享旧状态归属到哪个账户。
- 如果旧插件曾在本地存储过 Matrix 房间密钥备份解密密钥，启动过程或 `openclaw doctor --fix` 现在会自动将其导入新的恢复密钥流程。
- 如果在准备迁移后 Matrix access token 已发生变化，启动时现在会扫描同级 token-hash 存储根目录，查找待恢复的旧状态，然后才会放弃自动备份恢复。
- 如果同一账户、homeserver 和用户的 Matrix access token 在之后发生变化，OpenClaw 现在会优先复用最完整的现有 token-hash 存储根，而不是从一个空的 Matrix 状态目录开始。
- 在下一次 gateway 启动时，已备份的房间密钥会自动恢复到新的加密存储中。
- 如果旧插件存在从未备份的本地房间密钥，OpenClaw 会给出清晰警告。这些密钥无法从之前的 rust crypto store 中自动导出，因此一些旧的加密历史在手动恢复之前可能仍不可用。
- 完整的升级流程、限制、恢复命令和常见迁移消息，请参见 [Matrix 迁移](/install/migrating-matrix)。

加密的运行时状态会按账户、用户和 token-hash 组织在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下。
当这些功能被使用时，该目录会包含同步存储（`bot-storage.json`）、加密存储（`crypto/`）、恢复密钥文件（`recovery-key.json`）、IndexedDB 快照（`crypto-idb-snapshot.json`）、线程绑定（`thread-bindings.json`）和启动验证状态（`startup-verification.json`）。
当 token 变化但账户身份保持不变时，OpenClaw 会为该账户/homeserver/用户元组复用最佳现有根目录，因此此前的同步状态、加密状态、线程绑定和启动验证状态仍然可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 在 Node 中使用官方 `matrix-js-sdk` 的 Rust 加密路径。
当你希望加密状态在重启后持久存在时，该路径期望使用基于 IndexedDB 的持久化。

OpenClaw 当前在 Node 中通过以下方式提供这一能力：

- 使用 `fake-indexeddb` 作为 SDK 期望的 IndexedDB API 适配层
- 在 `initRustCrypto` 之前，从 `crypto-idb-snapshot.json` 恢复 Rust 加密 IndexedDB 内容
- 在初始化后和运行期间，将更新后的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`
- 通过一个建议性文件锁，对 `crypto-idb-snapshot.json` 的快照恢复和持久化进行串行化，以避免 gateway 运行时持久化与 CLI 维护在同一快照文件上发生竞争

这是兼容性/存储层面的实现，而不是自定义加密实现。
快照文件属于敏感运行时状态，并使用严格的文件权限存储。
在 OpenClaw 的安全模型下，gateway 宿主机和本地 OpenClaw 状态目录已经位于受信任的操作员边界内，因此这主要是一个运行时持久性问题，而不是单独的远程信任边界。

计划中的改进：

- 为持久化的 Matrix 密钥材料添加 SecretRef 支持，以便恢复密钥及相关的存储加密密钥可以来自 OpenClaw secrets 提供商，而不仅仅是本地文件

## 配置文件管理

使用以下命令更新所选账户的 Matrix 自身资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当你希望明确作用于某个命名账户时，添加 `--account <id>`。

Matrix 可直接接受 `mxc://` 形式的头像 URL。当你传入 `http://` 或 `https://` 头像 URL 时，OpenClaw 会先将其上传到 Matrix，然后将解析后的 `mxc://` URL 回写到 `channels.matrix.avatarUrl`（或所选账户的覆盖项）中。

## 自动验证通知

Matrix 现在会将验证生命周期通知直接以 `m.notice` 消息的形式发布到严格私信验证房间中。
包括：

- 验证请求通知
- 验证就绪通知（包含明确的“通过表情符号验证”指引）
- 验证开始和完成通知
- SAS 详情（表情符号和十进制值，如可用）

来自另一个 Matrix 客户端的入站验证请求会被 OpenClaw 跟踪并自动接受。
对于自我验证流程，当表情符号验证可用时，OpenClaw 也会自动启动 SAS 流程，并确认自身这一侧。
对于来自其他 Matrix 用户/设备的验证请求，OpenClaw 会自动接受请求，然后等待 SAS 流程按正常方式继续。
你仍然需要在你的 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“它们匹配”，验证才算完成。

OpenClaw 不会盲目自动接受自己发起的重复流程。如果已经存在一个待处理的自我验证请求，启动时会跳过创建新的请求。

验证协议/系统通知不会被转发到智能体聊天流水线，因此不会产生 `NO_REPLY`。

### 设备清理

旧的 OpenClaw 管理的 Matrix 设备可能会在账户中不断累积，使加密房间的信任关系更难理解。
可使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令移除过时的 OpenClaw 管理设备：

```bash
openclaw matrix devices prune-stale
```

### 直接房间修复

如果私信状态不同步，OpenClaw 可能会出现过时的 `m.direct` 映射，指向旧的单人房间，而不是当前活跃的私信。可使用以下命令检查某个对端当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复流程会将 Matrix 特定逻辑保留在插件内部：

- 优先选择已映射在 `m.direct` 中的严格 1:1 私信
- 否则回退到当前已加入、与该用户对应的任意严格 1:1 私信
- 如果不存在健康的私信，则创建一个新的直接房间，并重写 `m.direct` 指向它

修复流程不会自动删除旧房间。它只会选择健康的私信并更新映射，从而让新的 Matrix 发送、验证通知和其他直接消息流程再次指向正确的房间。

## 线程

Matrix 同时支持用于自动回复和 message 工具发送的原生 Matrix 线程。

- `dm.sessionScope: "per-user"`（默认）会使 Matrix 私信路由按发送者作用域工作，因此多个私信房间在解析到同一对端时可以共享一个会话。
- `dm.sessionScope: "per-room"` 会将每个 Matrix 私信房间隔离到各自的会话键中，同时仍使用正常的私信身份验证和允许列表检查。
- 显式的 Matrix 会话绑定仍然优先于 `dm.sessionScope`，因此已绑定的房间和线程会继续使用它们选定的目标会话。
- `threadReplies: "off"` 会让回复保持在顶层，并让入站线程消息继续落到父级会话。
- `threadReplies: "inbound"` 仅当入站消息本身已经位于某个线程中时，才在线程内回复。
- `threadReplies: "always"` 会让房间回复保持在由触发消息为根的线程中，并从第一条触发消息开始，将该会话通过匹配的线程作用域会话进行路由。
- `dm.threadReplies` 仅对私信覆盖顶层设置。例如，你可以让房间线程保持隔离，而私信保持平铺。
- 入站线程消息会将线程根消息作为额外智能体上下文包含进来。
- 现在，当目标是同一房间，或同一私信用户目标时，message 工具发送会自动继承当前 Matrix 线程，除非显式提供了 `threadId`。
- 只有当当前会话元数据证明是同一 Matrix 账户上的同一私信对端时，才会启用相同会话的私信用户目标复用；否则 OpenClaw 会回退到常规的按用户作用域路由。
- 当 OpenClaw 发现同一个共享 Matrix 私信会话上，一个 Matrix 私信房间与另一个私信房间发生冲突时，如果启用了线程绑定并给出了 `dm.sessionScope` 提示，它会在该房间中发布一次性的 `m.notice`，提示可使用 `/focus` 作为逃生口。
- Matrix 支持运行时线程绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 以及线程绑定的 `/acp spawn` 现在都可在 Matrix 房间和私信中使用。
- 当 `threadBindings.spawnSubagentSessions=true` 时，顶层 Matrix 房间/私信中的 `/focus` 会创建一个新的 Matrix 线程，并将其绑定到目标会话。
- 如果你在一个现有 Matrix 线程内部运行 `/focus` 或 `/acp spawn --thread here`，则会改为绑定当前线程本身。

## ACP 会话绑定

Matrix 房间、私信和现有 Matrix 线程都可以转为持久化的 ACP 工作区，而无需改变聊天界面。

快捷操作流程：

- 在你希望持续使用的 Matrix 私信、房间或现有线程中运行 `/acp spawn codex --bind here`。
- 在顶层 Matrix 私信或房间中，当前私信/房间会保持为聊天界面，后续消息会路由到所创建的 ACP 会话。
- 在现有 Matrix 线程内部，`--bind here` 会将当前线程原地绑定。
- `/new` 和 `/reset` 会原地重置同一个已绑定 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

说明：

- `--bind here` 不会创建子 Matrix 线程。
- 仅当使用 `/acp spawn --thread auto|here` 时，才需要 `threadBindings.spawnAcpSessions`，因为这时 OpenClaw 需要创建或绑定一个子 Matrix 线程。

### 线程绑定配置

Matrix 继承自 `session.threadBindings` 的全局默认值，同时也支持按渠道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 线程绑定的 spawn 标志是选择性启用的：

- 设置 `threadBindings.spawnSubagentSessions: true`，允许顶层 `/focus` 创建并绑定新的 Matrix 线程。
- 设置 `threadBindings.spawnAcpSessions: true`，允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 线程。

## 反应

Matrix 支持出站反应操作、入站反应通知和入站确认反应。

- 出站反应工具由 `channels["matrix"].actions.reactions` 控制。
- `react` 会向特定 Matrix 事件添加一个反应。
- `reactions` 会列出特定 Matrix 事件当前的反应摘要。
- `emoji=""` 会移除机器人账户在该事件上的所有反应。
- `remove: true` 只会移除机器人账户在该事件上的指定表情反应。

确认反应的解析顺序使用标准 OpenClaw 规则：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 智能体身份 emoji 回退

确认反应作用域按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反应通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认：`own`

当前行为：

- `reactionNotifications: "own"` 会在新增的 `m.reaction` 事件指向机器人发送的 Matrix 消息时，将其转发。
- `reactionNotifications: "off"` 会禁用反应系统事件。
- 反应移除目前仍不会被合成为系统事件，因为 Matrix 将其表现为 redaction，而不是独立的 `m.reaction` 移除事件。

## 历史上下文

- `channels.matrix.historyLimit` 控制当 Matrix 房间消息触发智能体时，会有多少条最近房间消息作为 `InboundHistory` 包含进来。
- 它会回退到 `messages.groupChat.historyLimit`。如果两者都未设置，则生效默认值为 `0`，因此不会缓冲因提及门控而被跳过的房间消息。设为 `0` 可禁用。
- Matrix 房间历史仅限房间本身。私信仍使用正常会话历史。
- Matrix 房间历史是仅待处理的：OpenClaw 会缓冲尚未触发回复的房间消息，然后在出现提及或其他触发器时对该窗口做一次快照。
- 当前触发消息不会包含在 `InboundHistory` 中；它会保留在该轮的主入站正文里。
- 对同一 Matrix 事件的重试会复用原始历史快照，而不会漂移到更新的房间消息。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于管理补充房间上下文，例如获取到的回复文本、线程根消息和待处理历史。

- `contextVisibility: "all"` 是默认值。补充上下文保持为接收时原样。
- `contextVisibility: "allowlist"` 会将补充上下文过滤为仅包含通过当前房间/用户允许列表检查的发送者。
- `contextVisibility: "allowlist_quote"` 的行为与 `allowlist` 一样，但仍保留一个显式引用回复。

此设置影响的是补充上下文的可见性，而不是入站消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

## 私信和房间策略示例

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

提及门控和允许列表行为参见 [群组](/zh-CN/channels/groups)。

Matrix 私信配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果某个尚未批准的 Matrix 用户在获批前持续向你发消息，OpenClaw 会复用同一个待处理配对码，并可能在短暂冷却后再次发送提醒回复，而不是签发新的代码。

共享的私信配对流程和存储布局参见 [配对](/zh-CN/channels/pairing)。

## Exec 审批

Matrix 可作为某个 Matrix 账户的原生审批客户端。原生私信/渠道路由控制项仍位于 exec 审批配置下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers`（可选；回退到 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

审批者必须是 Matrix 用户 ID，例如 `@owner:example.org`。当 `enabled` 未设置或为 `"auto"`，且至少能解析出一个审批者时，Matrix 会自动启用原生审批。Exec 审批优先使用 `execApprovals.approvers`，并可回退到 `channels.matrix.dm.allowFrom`。插件审批通过 `channels.matrix.dm.allowFrom` 进行授权。将 `enabled: false` 设为显式禁用 Matrix 作为原生审批客户端。否则，审批请求会回退到其他已配置的审批路径或审批回退策略。

Matrix 原生路由现在同时支持两类审批：

- `channels.matrix.execApprovals.*` 控制 Matrix 审批提示的原生私信/渠道扇出模式。
- Exec 审批使用来自 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 的 exec 审批者集合。
- 插件审批使用来自 `channels.matrix.dm.allowFrom` 的 Matrix 私信允许列表。
- Matrix 反应快捷方式和消息更新同时适用于 exec 和插件审批。

交付规则：

- `target: "dm"` 将审批提示发送到审批者私信
- `target: "channel"` 将提示发回原始 Matrix 房间或私信
- `target: "both"` 同时发送到审批者私信和原始 Matrix 房间或私信

Matrix 审批提示会在主要审批消息上预置反应快捷方式：

- `✅` = 允许一次
- `❌` = 拒绝
- `♾️` = 在有效 exec 策略允许时始终允许

审批者可以对该消息做出反应，或使用回退 slash 命令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的审批者可以批准或拒绝。对于 exec 审批，渠道交付会包含命令文本，因此仅应在受信任房间中启用 `channel` 或 `both`。

Matrix 审批提示复用了共享的核心审批规划器。Matrix 特有的原生界面负责处理房间/私信路由、反应，以及 exec 和插件审批的消息发送/更新/删除行为。

按账户覆盖：

- `channels.matrix.accounts.<account>.execApprovals`

相关文档：[Exec 审批](/tools/exec-approvals)

## 多账户示例

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

顶层 `channels.matrix` 的值会作为命名账户的默认值，除非某个账户自行覆盖。
你可以通过 `groups.<room>.account`（或旧版 `rooms.<room>.account`）将继承的房间条目限定到某个 Matrix 账户。
没有 `account` 的条目会在所有 Matrix 账户之间共享，而带有 `account: "default"` 的条目在默认账户直接配置在顶层 `channels.matrix.*` 时也仍然有效。
部分共享身份验证默认值本身不会创建一个单独的隐式默认账户。只有当该顶层默认值拥有新的身份验证信息（`homeserver` 加 `accessToken`，或 `homeserver` 加 `userId` 和 `password`）时，OpenClaw 才会合成顶层 `default` 账户；命名账户在之后缓存凭证满足身份验证条件时，仍可通过 `homeserver` 加 `userId` 被发现。
如果 Matrix 已经恰好有一个命名账户，或者 `defaultAccount` 指向现有的某个命名账户键，那么单账户到多账户的修复/设置升级会保留该账户，而不是创建新的 `accounts.default` 条目。只有 Matrix 身份验证/bootstrap 键会移动到这个提升后的账户；共享交付策略键仍保留在顶层。
当你希望 OpenClaw 在隐式路由、探测和 CLI 操作中优先使用某个命名 Matrix 账户时，请设置 `defaultAccount`。
如果你配置了多个命名账户，请设置 `defaultAccount`，或为依赖隐式账户选择的 CLI 命令传入 `--account <id>`。
当你希望覆盖某条命令的隐式选择时，请为 `openclaw matrix verify ...` 和 `openclaw matrix devices ...` 传入 `--account <id>`。

## 私有/LAN homeserver

出于 SSRF 防护目的，默认情况下 OpenClaw 会阻止连接私有/内部 Matrix homeserver，除非你按账户显式选择启用。

如果你的 homeserver 运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 账户启用
`network.dangerouslyAllowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

CLI 设置示例：

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

此选择启用仅允许受信任的私有/内部目标。公共明文 homeserver，例如
`http://matrix.example.org:8008`，仍然会被阻止。尽可能优先使用 `https://`。

## 代理 Matrix 流量

如果你的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 `channels.matrix.proxy`：

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

命名账户可通过 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认值。
OpenClaw 会将同一代理设置用于运行时 Matrix 流量和账户状态探测。

## 目标解析

在任何 OpenClaw 要求你提供房间或用户目标的地方，Matrix 都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查找会查询该 homeserver 上的 Matrix 用户目录。
- 房间查找会直接接受显式房间 ID 和别名，然后回退到搜索该账户已加入房间的名称。
- 已加入房间的名称查找属于尽力而为。如果房间名称无法解析为 ID 或别名，则会在运行时允许列表解析中被忽略。

## 配置参考

- `enabled`：启用或禁用该渠道。
- `name`：账户的可选标签。
- `defaultAccount`：配置多个 Matrix 账户时的首选账户 ID。
- `homeserver`：homeserver URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许该 Matrix 账户连接到私有/内部 homeserver。当 homeserver 解析到 `localhost`、LAN/Tailscale IP 或诸如 `matrix-synapse` 这样的内部主机时，请启用此项。
- `proxy`：用于 Matrix 流量的可选 HTTP(S) 代理 URL。命名账户可以使用自己的 `proxy` 覆盖顶层默认值。
- `userId`：完整 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于 token 的身份验证 access token。`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 同时支持明文值和 SecretRef 值，并可跨环境变量/文件/exec 提供商使用。参见 [Secrets Management](/gateway/secrets)。
- `password`：基于密码登录的密码。支持明文值和 SecretRef 值。
- `deviceId`：显式 Matrix 设备 ID。
- `deviceName`：密码登录时的设备显示名称。
- `avatarUrl`：用于资料同步和 `set-profile` 更新的已存储自身头像 URL。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用 E2EE。
- `allowlistOnly`：对私信和房间强制仅允许列表行为。
- `allowBots`：允许来自其他已配置 OpenClaw Matrix 账户的消息（`true` 或 `"mentions"`）。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：补充房间上下文的可见性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`：房间流量允许的用户 ID 列表。
- `groupAllowFrom` 条目应为完整 Matrix 用户 ID。无法解析的名称在运行时会被忽略。
- `historyLimit`：作为群组历史上下文包含的最大房间消息数。会回退到 `messages.groupChat.historyLimit`；如果两者都未设置，生效默认值为 `0`。设为 `0` 可禁用。
- `replyToMode`：`off`、`first`、`all` 或 `batched`。
- `markdown`：用于出站 Matrix 文本的可选 Markdown 渲染配置。
- `streaming`：`off`（默认）、`partial`、`quiet`、`true` 或 `false`。`partial` 和 `true` 会用普通 Matrix 文本消息启用“先预览后更新”的草稿更新。`quiet` 则用于自托管推送规则场景下的非通知预览。
- `blockStreaming`：`true` 会在草稿预览流式传输启用时，为已完成的 assistant 块生成单独的进度消息。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：按渠道覆盖线程绑定的会话路由和生命周期。
- `startupVerification`：启动时自动自我验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：自动启动验证请求再次重试前的冷却时间。
- `textChunkLimit`：出站消息分块大小。
- `chunkMode`：`length` 或 `newline`。
- `responsePrefix`：出站回复的可选消息前缀。
- `ackReaction`：该渠道/账户的可选确认反应覆盖。
- `ackReactionScope`：可选确认反应作用域覆盖（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：入站反应通知模式（`own`、`off`）。
- `mediaMaxMb`：Matrix 媒体处理的媒体大小上限（MB）。适用于出站发送和入站媒体处理。
- `autoJoin`：邀请自动加入策略（`always`、`allowlist`、`off`）。默认值：`off`。这适用于 Matrix 邀请整体，包括私信式邀请，而不仅仅是房间/群组邀请。OpenClaw 会在邀请时做出此决定，此时还无法可靠地将被加入的房间归类为私信或群组。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时允许加入的房间/别名。别名条目会在处理邀请时解析为房间 ID；OpenClaw 不会信任被邀请房间声明的别名状态。
- `dm`：私信策略块（`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`）。
- `dm.policy`：控制 OpenClaw 加入房间并将其归类为私信之后的私信访问。它不会改变邀请是否自动加入。
- `dm.allowFrom` 条目应为完整 Matrix 用户 ID，除非你已经通过实时目录查找解析过它们。
- `dm.sessionScope`：`per-user`（默认）或 `per-room`。如果你希望每个 Matrix 私信房间即使对端相同也保持独立上下文，请使用 `per-room`。
- `dm.threadReplies`：仅私信的线程策略覆盖（`off`、`inbound`、`always`）。它会同时覆盖回复位置和私信中的会话隔离方式所使用的顶层 `threadReplies` 设置。
- `execApprovals`：Matrix 原生 exec 审批交付（`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`）。
- `execApprovals.approvers`：允许批准 exec 请求的 Matrix 用户 ID。当 `dm.allowFrom` 已经标识审批者时，此项可选。
- `execApprovals.target`：`dm | channel | both`（默认：`dm`）。
- `accounts`：命名的按账户覆盖项。顶层 `channels.matrix` 值会作为这些条目的默认值。
- `groups`：按房间的策略映射。优先使用房间 ID 或别名；无法解析的房间名称在运行时会被忽略。解析后，会话/群组身份使用稳定的房间 ID，而人类可读标签仍来自房间名称。
- `groups.<room>.account`：在多账户设置中，将某个继承房间条目限制到特定 Matrix 账户。
- `groups.<room>.allowBots`：针对已配置机器人发送者的房间级覆盖（`true` 或 `"mentions"`）。
- `groups.<room>.users`：按房间的发送者允许列表。
- `groups.<room>.tools`：按房间的工具允许/拒绝覆盖。
- `groups.<room>.autoReply`：房间级提及门控覆盖。`true` 会禁用该房间的提及要求；`false` 会重新强制开启。
- `groups.<room>.skills`：可选的房间级 Skills 过滤器。
- `groups.<room>.systemPrompt`：可选的房间级系统提示片段。
- `rooms`：`groups` 的旧别名。
- `actions`：按操作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有受支持的渠道
- [配对](/zh-CN/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及门控
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全性](/gateway/security) — 访问模型与加固
