---
read_when:
    - 设置 Mattermost 时
    - 调试 Mattermost 路由时
summary: Mattermost 机器人设置与 OpenClaw 配置
title: Mattermost
x-i18n:
    generated_at: "2026-04-08T03:45:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: f21dc7543176fda0b38b00fab60f0daae38dffcf68fa1cf7930a9f14ec57cb5a
    source_path: channels\mattermost.md
    workflow: 15
---

# Mattermost

状态：内置插件（bot token + WebSocket 事件）。支持渠道、群组和私信。
Mattermost 是一个可自行托管的团队消息平台；有关产品详情和下载，请参见官方网站
[mattermost.com](https://mattermost.com)。

## 内置插件

Mattermost 在当前 OpenClaw 版本中作为内置插件提供，因此常规打包构建无需单独安装。

如果你使用的是较旧版本，或是不包含 Mattermost 的自定义安装，请手动安装：

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/mattermost
```

本地 checkout 安装（在 git 仓库中运行时）：

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

详情参见：[??](/zh-CN/tools/plugin)

## 快速设置

1. 确保 Mattermost 插件可用。
   - 当前打包版 OpenClaw 已内置该插件。
   - 较旧版本/自定义安装可使用上面的命令手动添加。
2. 创建一个 Mattermost 机器人账户，并复制 **bot token**。
3. 复制 Mattermost **base URL**（例如 `https://chat.example.com`）。
4. 配置 OpenClaw 并启动 Gateway 网关。

最小配置：

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
    },
  },
}
```

## 原生斜杠命令

原生斜杠命令为选择启用。启用后，OpenClaw 会通过 Mattermost API 注册 `oc_*` 斜杠命令，并在 Gateway 网关 HTTP 服务器上接收回调 `POST` 请求。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // 当 Mattermost 无法直接访问 Gateway 网关 时使用（反向代理/公网 URL）。
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

说明：

- `native: "auto"` 在 Mattermost 中默认是禁用的。请设置 `native: true` 以启用。
- 如果省略 `callbackUrl`，OpenClaw 会根据 Gateway 网关 的 host/port 和 `callbackPath` 推导一个地址。
- 在多账户设置中，`commands` 可以设置在顶层，也可以设置在
  `channels.mattermost.accounts.<id>.commands` 下（账户级值会覆盖顶层字段）。
- 命令回调会使用 Mattermost 在 OpenClaw 注册 `oc_*` 命令时返回的每个命令专属 token 进行校验。
- 当注册失败、启动不完整，或回调 token 与任一已注册命令都不匹配时，斜杠回调会以失败关闭方式处理。
- 可达性要求：回调端点必须可从 Mattermost 服务器访问。
  - 除非 Mattermost 与 OpenClaw 运行在同一主机/同一网络命名空间中，否则不要将 `callbackUrl` 设置为 `localhost`。
  - 除非该 URL 已通过反向代理将 `/api/channels/mattermost/command` 转发到 OpenClaw，否则不要将 `callbackUrl` 设置为你的 Mattermost base URL。
  - 可快速检查：`curl https://<gateway-host>/api/channels/mattermost/command`；对 `GET` 请求，OpenClaw 应返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站 allowlist 要求：
  - 如果你的回调目标使用私有/tailnet/internal 地址，请在 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 中加入回调主机/域名。
  - 使用主机/域名条目，而不是完整 URL。
    - 正确：`gateway.tailnet-name.ts.net`
    - 错误：`https://gateway.tailnet-name.ts.net`

## 环境变量（默认账户）

如果你更喜欢使用环境变量，请在 Gateway 网关 主机上设置：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

环境变量仅适用于**默认**账户（`default`）。其他账户必须使用配置值。

## 聊天模式

Mattermost 会自动回复私信。频道行为由 `chatmode` 控制：

- `oncall`（默认）：仅在频道中被 @ 提及时回复。
- `onmessage`：对每条频道消息都回复。
- `onchar`：当消息以触发前缀开头时回复。

配置示例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

说明：

- `onchar` 仍然会响应显式的 @ 提及。
- `channels.mattermost.requireMention` 仍兼容旧版配置，但推荐使用 `chatmode`。

## 线程与会话

使用 `channels.mattermost.replyToMode` 来控制频道和群组回复是保留在主频道中，还是在触发消息下启动一个线程。

- `off`（默认）：仅当入站消息本身已在线程中时，才在线程中回复。
- `first`：对于顶层频道/群组消息，在该消息下启动线程，并将对话路由到一个线程范围的会话。
- `all`：在当前 Mattermost 中，其行为与 `first` 相同。
- 私信会忽略此设置，并保持非线程模式。

配置示例：

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

说明：

- 线程范围会话会使用触发消息的 post id 作为线程根。
- 由于一旦 Mattermost 已有线程根，后续分块和媒体都会继续发送到该线程中，所以 `first` 和 `all` 当前等价。

## 访问控制（私信）

- 默认：`channels.mattermost.dmPolicy = "pairing"`（未知发送者会收到一个 pairing code）。
- 批准方式：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公开私信：`channels.mattermost.dmPolicy="open"` 加 `channels.mattermost.allowFrom=["*"]`。

## 频道（群组）

- 默认：`channels.mattermost.groupPolicy = "allowlist"`（受提及门控限制）。
- 使用 `channels.mattermost.groupAllowFrom` 设置允许的发送者（推荐使用用户 ID）。
- 按频道的提及覆盖项位于 `channels.mattermost.groups.<channelId>.requireMention`
  或 `channels.mattermost.groups["*"].requireMention`（用作默认值）。
- `@username` 匹配是可变的，只有在 `channels.mattermost.dangerouslyAllowNameMatching: true` 时才会启用。
- 开放频道：`channels.mattermost.groupPolicy="open"`（仍受提及门控限制）。
- 运行时说明：如果完全缺少 `channels.mattermost`，运行时在进行群组检查时会回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy` 也是如此）。

示例：

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## 出站投递目标

在 `openclaw message send` 或 cron/Webhooks 中使用以下目标格式：

- `channel:<id>` 表示频道
- `user:<id>` 表示私信
- `@username` 表示私信（通过 Mattermost API 解析）

裸的不透明 ID（例如 `64ifufp...`）在 Mattermost 中是**有歧义的**（可能是用户 ID，也可能是频道 ID）。

OpenClaw 会按**优先用户**的顺序解析它们：

- 如果该 ID 作为用户存在（`GET /api/v4/users/<id>` 成功），OpenClaw 会通过 `/api/v4/channels/direct` 解析直连频道并发送**私信**。
- 否则，该 ID 会被视为**频道 ID**。

如果你需要确定性行为，请始终使用显式前缀（`user:<id>` / `channel:<id>`）。

## 私信频道重试

当 OpenClaw 向 Mattermost 私信目标发送消息，并且需要先解析直连频道时，默认会对临时性的直连频道创建失败进行重试。

使用 `channels.mattermost.dmChannelRetry` 可为整个 Mattermost 插件全局调整此行为，
或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 仅为某个账户调整。

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

说明：

- 这仅适用于私信频道创建（`/api/v4/channels/direct`），而不是所有 Mattermost API 调用。
- 重试适用于速率限制、5xx 响应以及网络或超时错误等临时性失败。
- 除 `429` 之外的 4xx 客户端错误会被视为永久性错误，不会重试。

## 表情回应（消息工具）

- 使用 `message action=react`，并设置 `channel=mattermost`。
- `messageId` 是 Mattermost 的 post id。
- `emoji` 接受如 `thumbsup` 或 `:+1:` 这样的名称（冒号可选）。
- 设置 `remove=true`（布尔值）可移除一个回应。
- 添加/移除表情回应事件会作为系统事件转发到已路由的智能体会话。

示例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

配置：

- `channels.mattermost.actions.reactions`：启用/禁用表情回应动作（默认 true）。
- 按账户覆盖：`channels.mattermost.accounts.<id>.actions.reactions`。

## 交互按钮（消息工具）

发送带可点击按钮的消息。当用户点击按钮时，智能体会收到该选择并可作出响应。

通过将 `inlineButtons` 添加到渠道 capabilities 中来启用按钮：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

使用 `message action=send` 并提供 `buttons` 参数。按钮是一个二维数组（按行排列的按钮）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按钮字段：

- `text`（必填）：显示标签。
- `callback_data`（必填）：点击后回传的值（用作动作 ID）。
- `style`（可选）：`"default"`、`"primary"` 或 `"danger"`。

当用户点击按钮时：

1. 所有按钮都会被替换为一行确认信息（例如 “✓ **Yes** selected by @user”）。
2. 智能体会把该选择作为入站消息接收，并进行回复。

说明：

- 按钮回调使用 HMAC-SHA256 校验（自动完成，无需配置）。
- Mattermost 会从其 API 响应中移除 callback data（安全特性），因此按钮在点击后都会被移除 —— 无法部分移除。
- 包含连字符或下划线的动作 ID 会被自动清洗
  （Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：能力字符串数组。添加 `"inlineButtons"`，
  以在智能体系统提示词中启用按钮工具说明。
- `channels.mattermost.interactions.callbackBaseUrl`：可选的外部基础 URL，用于按钮
  回调（例如 `https://gateway.example.com`）。当 Mattermost 无法
  直接通过绑定主机访问 Gateway 网关 时，请使用此项。
- 在多账户设置中，也可以在
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下设置同一字段。
- 如果省略 `interactions.callbackBaseUrl`，OpenClaw 会先根据
  `gateway.customBindHost` + `gateway.port` 推导回调 URL，然后再回退到 `http://localhost:<port>`。
- 可达性规则：按钮回调 URL 必须可从 Mattermost 服务器访问。
  只有当 Mattermost 与 OpenClaw 运行在同一主机/同一网络命名空间时，`localhost` 才可用。
- 如果你的回调目标使用私有/tailnet/internal 地址，请将其主机/域名加入 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 集成（外部脚本）

外部脚本和 Webhooks 可以直接通过 Mattermost REST API 发布按钮，
而不是通过智能体的 `message` 工具。尽可能使用扩展中的 `buildButtonAttachments()`；如果发布原始 JSON，请遵循以下规则：

**负载结构：**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // 仅限字母数字 —— 见下文
            type: "button", // 必填，否则点击会被静默忽略
            name: "Approve", // 显示标签
            style: "primary", // 可选："default"、"primary"、"danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // 必须与按钮 id 一致（用于名称查找）
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // 参见下方 HMAC 小节
              },
            },
          },
        ],
      },
    ],
  },
}
```

**关键规则：**

1. Attachments 必须放在 `props.attachments` 中，而不是顶层 `attachments`（否则会被静默忽略）。
2. 每个 action 都需要 `type: "button"` —— 否则点击会被静默吞掉。
3. 每个 action 都需要 `id` 字段 —— Mattermost 会忽略没有 ID 的 action。
4. Action `id` 必须是**纯字母数字**（`[a-zA-Z0-9]`）。连字符和下划线会破坏
   Mattermost 服务端 action 路由（返回 404）。使用前请将其移除。
5. `context.action_id` 必须与按钮的 `id` 一致，这样确认消息才会显示
   按钮名称（例如 “Approve”），而不是原始 ID。
6. `context.action_id` 为必填 —— 交互处理器在缺少它时会返回 400。

**HMAC token 生成：**

Gateway 网关 使用 HMAC-SHA256 校验按钮点击。外部脚本必须生成与 Gateway 网关 校验逻辑一致的 token：

1. 从 bot token 派生 secret：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 构建 context 对象，包含除 `_token` 之外的所有字段。
3. 使用**键排序**且**无空格**的方式序列化（Gateway 网关 使用带排序键的 `JSON.stringify`，
   输出紧凑格式）。
4. 签名：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 将生成的十六进制摘要作为 `_token` 加入 context。

Python 示例：

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

常见 HMAC 陷阱：

- Python 的 `json.dumps` 默认会添加空格（`{"key": "val"}`）。请使用
  `separators=(",", ":")`，以匹配 JavaScript 的紧凑输出（`{"key":"val"}`）。
- 始终对**所有** context 字段（不包括 `_token`）进行签名。Gateway 网关 会先移除 `_token`，
  然后对剩余全部内容进行签名。只签名子集会导致静默校验失败。
- 使用 `sort_keys=True` —— Gateway 网关 会在签名前对键排序，而 Mattermost 在存储负载时
  可能会重排 context 字段。
- secret 应从 bot token 派生（确定性），而不是使用随机字节。创建按钮的进程与执行校验的 Gateway 网关
  必须使用相同的 secret。

## 目录适配器

Mattermost 插件包含一个目录适配器，它通过 Mattermost API 解析频道名和用户名。
这使得你可以在 `openclaw message send` 和 cron/Webhook 投递中使用
`#channel-name` 和 `@username` 目标。

无需额外配置 —— 该适配器会使用账户配置中的 bot token。

## 多账户

Mattermost 支持在 `channels.mattermost.accounts` 下配置多个账户：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## 故障排除

- 频道中没有回复：确认机器人已加入该频道，并 @ 提及它（oncall），或使用触发前缀（onchar），或者设置 `chatmode: "onmessage"`。
- 认证错误：检查 bot token、base URL 以及账户是否已启用。
- 多账户问题：环境变量仅适用于 `default` 账户。
- 原生斜杠命令返回 `Unauthorized: invalid command token.`：OpenClaw
  没有接受该回调 token。常见原因包括：
  - 斜杠命令注册在启动时失败，或只部分完成
  - 回调打到了错误的 Gateway 网关/账户
  - Mattermost 仍保留着指向旧回调目标的旧命令
  - Gateway 网关 重启后没有重新激活斜杠命令
- 如果原生斜杠命令停止工作，请检查日志中是否有
  `mattermost: failed to register slash commands` 或
  `mattermost: native slash commands enabled but no commands could be registered`。
- 如果省略了 `callbackUrl` 且日志警告回调被解析为
  `http://127.0.0.1:18789/...`，那么该 URL 很可能只有在
  Mattermost 与 OpenClaw 运行在同一主机/同一网络命名空间时才可访问。请显式设置一个外部可访问的 `commands.callbackUrl`。
- 按钮显示为白框：智能体发送的按钮数据可能格式错误。请检查每个按钮是否同时包含 `text` 和 `callback_data` 字段。
- 按钮能渲染但点击无效：请确认 Mattermost 服务器配置中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，并且 `ServiceSettings` 中的 `EnablePostActionIntegration` 为 `true`。
- 点击按钮返回 404：按钮 `id` 很可能包含连字符或下划线。Mattermost 的 action 路由器无法处理非字母数字 ID。请仅使用 `[a-zA-Z0-9]`。
- Gateway 网关 日志出现 `invalid _token`：HMAC 不匹配。请检查你是否对所有 context 字段进行了签名（而不是只签名部分字段）、是否使用了排序键，以及是否使用了紧凑 JSON（无空格）。参见上文 HMAC 小节。
- Gateway 网关 日志出现 `missing _token in context`：按钮的 context 中没有 `_token` 字段。构建 integration 负载时请确保包含它。
- 确认信息显示原始 ID 而不是按钮名称：`context.action_id` 与按钮的 `id` 不匹配。请将二者都设置为同一个已清洗的值。
- 智能体不知道按钮功能：请在 Mattermost 渠道配置中添加 `capabilities: ["inlineButtons"]`。

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有支持的渠道
- [??](/zh-CN/channels/pairing) — 私信认证和 pairing 流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及门控
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/zh-CN/gateway/security) — 访问模型与加固
