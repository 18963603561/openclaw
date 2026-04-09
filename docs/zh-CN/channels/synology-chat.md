---
read_when:
    - 使用 OpenClaw 设置 Synology Chat
    - 调试 Synology Chat webhook 路由
summary: Synology Chat webhook 设置与 OpenClaw 配置
title: Synology Chat
x-i18n:
    generated_at: "2026-04-08T03:46:57Z"
    model: gpt-5.4
    provider: openai
    source_hash: ddb25fc6b53f896f15f43b4936d69ea071a29a91838a5b662819377271e89d81
    source_path: channels\synology-chat.md
    workflow: 15
---

# Synology Chat

状态：内置插件私信渠道，使用 Synology Chat webhook。
该插件接收来自 Synology Chat 出站 webhook 的入站消息，并通过 Synology Chat 入站 webhook 发送回复。

## 内置插件

Synology Chat 已作为内置插件包含在当前 OpenClaw 版本中，因此普通打包构建无需单独安装。

如果你使用的是较旧版本，或未包含 Synology Chat 的自定义安装，请手动安装：

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

详情请参阅：[插件](/zh-CN/tools/plugin)

## 快速设置

1. 确保 Synology Chat 插件可用。
   - 当前打包版 OpenClaw 已内置该插件。
   - 较旧版本 / 自定义安装可使用上述命令从源码检出手动添加。
   - `openclaw onboard` 现在会像 `openclaw channels add` 一样，在同一个渠道设置列表中显示 Synology Chat。
   - 非交互式设置：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. 在 Synology Chat 集成中：
   - 创建一个入站 webhook 并复制其 URL。
   - 创建一个带有你的 secret token 的出站 webhook。
3. 将出站 webhook URL 指向你的 OpenClaw Gateway 网关：
   - 默认是 `https://gateway-host/webhook/synology`。
   - 或你的自定义 `channels.synology-chat.webhookPath`。
4. 在 OpenClaw 中完成设置。
   - 引导式：`openclaw onboard`
   - 直接方式：`openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. 重启 Gateway 网关，并向 Synology Chat 机器人发送私信。

Webhook 身份验证详情：

- OpenClaw 会依次从 `body.token`、然后 `?token=...`、再然后请求头中接收出站 webhook token。
- 接受的请求头形式：
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- 空 token 或缺失 token 会以失败关闭方式处理。

最小配置：

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## 环境变量

对于默认账户，你可以使用环境变量：

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS`（逗号分隔）
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

配置值会覆盖环境变量。

## 私信策略与访问控制

- 推荐默认使用 `dmPolicy: "allowlist"`。
- `allowedUserIds` 接受列表（或逗号分隔的字符串）形式的 Synology 用户 ID。
- 在 `allowlist` 模式下，空的 `allowedUserIds` 列表会被视为配置错误，并且 webhook 路由不会启动（如需允许所有人，请使用 `dmPolicy: "open"`）。
- `dmPolicy: "open"` 允许任意发送者。
- `dmPolicy: "disabled"` 会阻止私信。
- 默认情况下，回复接收者绑定会保持在稳定的数字 `user_id` 上。`channels.synology-chat.dangerouslyAllowNameMatching: true` 是紧急兼容模式，用于重新启用基于可变用户名 / 昵称查找的回复投递。
- 配对批准可使用：
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## 出站投递

请使用数字形式的 Synology Chat 用户 ID 作为目标。

示例：

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

支持通过基于 URL 的文件投递发送媒体。

## 多账户

`channels.synology-chat.accounts` 支持多个 Synology Chat 账户。
每个账户都可以覆盖 token、入站 URL、webhook 路径、私信策略和限制。
私信会话会按账户和用户隔离，因此两个不同 Synology 账户上的相同数字 `user_id`
不会共享对话记录状态。
请为每个已启用账户提供不同的 `webhookPath`。OpenClaw 现在会拒绝重复的完全相同路径，
并在多账户设置中拒绝启动那些仅继承共享 webhook 路径的命名账户。
如果你确实需要为某个命名账户保留旧版继承行为，请在该账户上或 `channels.synology-chat`
下设置 `dangerouslyAllowInheritedWebhookPath: true`，
但重复的完全相同路径仍会以失败关闭方式被拒绝。更推荐为每个账户显式设置路径。

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## 安全说明

- 请妥善保管 `token`，如有泄露请轮换。
- 除非你明确可信任带有自签名证书的本地 NAS，否则请保持 `allowInsecureSsl: false`。
- 入站 webhook 请求会按 token 验证，并按发送者进行限流。
- 无效 token 检查使用常量时间 secret 比较，并以失败关闭方式处理。
- 生产环境推荐使用 `dmPolicy: "allowlist"`。
- 除非你明确需要旧版基于用户名的回复投递，否则请保持 `dangerouslyAllowNameMatching` 关闭。
- 除非你明确接受多账户设置中的共享路径路由风险，否则请保持 `dangerouslyAllowInheritedWebhookPath` 关闭。

## 故障排除

- `Missing required fields (token, user_id, text)`：
  - 出站 webhook 负载缺少必填字段之一
  - 如果 Synology 通过请求头发送 token，请确保 Gateway 网关 / 代理保留了这些请求头
- `Invalid token`：
  - 出站 webhook secret 与 `channels.synology-chat.token` 不匹配
  - 请求打到了错误的账户 / webhook 路径
  - 反向代理在请求到达 OpenClaw 前剥离了 token 请求头
- `Rate limit exceeded`：
  - 来自同一来源的过多无效 token 尝试会临时将该来源锁定
  - 已通过身份验证的发送者也有单独的按用户消息速率限制
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.`：
  - 已启用 `dmPolicy="allowlist"`，但未配置任何用户
- `User not authorized`：
  - 发送者的数字 `user_id` 不在 `allowedUserIds` 中

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有受支持的渠道
- [配对](/zh-CN/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及限制
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/zh-CN/gateway/security) — 访问模型与安全加固
