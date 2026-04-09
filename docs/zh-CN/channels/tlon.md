---
read_when:
    - 你正在处理 Tlon/Urbit 渠道功能
summary: Tlon/Urbit 支持状态、能力与配置
title: Tlon
x-i18n:
    generated_at: "2026-04-08T03:47:41Z"
    model: gpt-5.4
    provider: openai
    source_hash: 289cffb3c1b2d450a5f41e0d67117dfb5c192cec956d82039caac9df9f07496d
    source_path: channels\tlon.md
    workflow: 15
---

# Tlon

Tlon 是一个构建在 Urbit 之上的去中心化消息应用。OpenClaw 可连接到你的 Urbit ship，并能够
响应私信和群聊消息。默认情况下，群组回复需要 @ 提及，并且还可以
通过 allowlists 进一步限制。

状态：内置插件。支持私信、群组提及、线程回复、富文本格式和
图片上传。暂不支持 reactions 和投票。

## 内置插件

Tlon 已作为内置插件包含在当前 OpenClaw 版本中，因此普通打包构建
无需单独安装。

如果你使用的是较旧版本，或未包含 Tlon 的自定义安装，请手动安装：

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/tlon
```

本地检出版本（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

详情请参阅：[插件](/zh-CN/tools/plugin)

## 设置

1. 确保 Tlon 插件可用。
   - 当前打包版 OpenClaw 已内置该插件。
   - 较旧版本 / 自定义安装可使用上述命令手动添加。
2. 收集你的 ship URL 和登录 code。
3. 配置 `channels.tlon`。
4. 重启 Gateway 网关。
5. 向机器人发送私信，或在群组渠道中 @ 提及它。

最小配置（单账户）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}
```

## 私有 / 局域网 ship

默认情况下，OpenClaw 会阻止私有 / 内部主机名和 IP 范围，以防止 SSRF。
如果你的 ship 运行在私有网络上（localhost、局域网 IP 或内部主机名），
你必须显式启用：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

这适用于如下 URL：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 仅当你信任本地网络时才启用此选项。该设置会禁用
对你的 ship URL 发起请求时的 SSRF 防护。

## 群组渠道

默认启用自动发现。你也可以手动固定渠道：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## 访问控制

私信 allowlist（空 = 不允许任何私信，使用 `ownerShip` 进行批准流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权（默认受限）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## 所有者与批准系统

设置一个 owner ship，以便当未授权用户尝试交互时接收批准请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

owner ship 会**在所有地方自动获得授权** —— 私信邀请会被自动接受，
渠道消息始终允许。你无需将 owner 添加到 `dmAllowlist` 或
`defaultAuthorizedShips` 中。

设置后，owner 会在以下情况下收到私信通知：

- 来自不在 allowlist 中的 ship 的私信请求
- 在未授权渠道中的提及
- 群组邀请请求

## 自动接受设置

自动接受私信邀请（适用于 `dmAllowlist` 中的 ship）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受群组邀请：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## 交付目标（CLI / cron）

将这些与 `openclaw message send` 或 cron 交付一起使用：

- 私信：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群组：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 内置技能

Tlon 插件包含一个内置技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)），
提供对 Tlon 操作的 CLI 访问：

- **联系人**：获取 / 更新资料，列出联系人
- **渠道**：列出、创建、发送消息、获取历史
- **群组**：列出、创建、管理成员
- **私信**：发送消息、对消息添加 reaction
- **Reactions**：为帖子和私信添加 / 移除表情 reaction
- **设置**：通过斜杠命令管理插件权限

安装插件后，该技能会自动可用。

## 能力

| 功能 | 状态 |
| --------------- | --------------------------------------- |
| 私信 | ✅ 支持 |
| 群组 / 渠道 | ✅ 支持（默认受提及限制） |
| 线程 | ✅ 支持（自动在线程中回复） |
| 富文本 | ✅ Markdown 会转换为 Tlon 格式 |
| 图片 | ✅ 上传到 Tlon 存储 |
| Reactions | ✅ 通过[内置技能](#bundled-skill)支持 |
| 投票 | ❌ 暂不支持 |
| 原生命令 | ✅ 支持（默认仅 owner 可用） |

## 故障排除

请先运行以下排查步骤：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见故障：

- **私信被忽略**：发送者不在 `dmAllowlist` 中，且未配置 `ownerShip` 以处理批准流程。
- **群组消息被忽略**：渠道未被发现，或发送者未获授权。
- **连接错误**：检查 ship URL 是否可访问；对于本地 ship，请启用 `allowPrivateNetwork`。
- **身份验证错误**：确认登录 code 当前有效（code 会轮换）。

## 配置参考

完整配置请参阅：[配置](/zh-CN/gateway/configuration)

提供商选项：

- `channels.tlon.enabled`：启用 / 禁用渠道启动。
- `channels.tlon.ship`：机器人的 Urbit ship 名称（例如 `~sampel-palnet`）。
- `channels.tlon.url`：ship URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：ship 登录 code。
- `channels.tlon.allowPrivateNetwork`：允许 localhost / 局域网 URL（绕过 SSRF）。
- `channels.tlon.ownerShip`：用于批准系统的 owner ship（始终已授权）。
- `channels.tlon.dmAllowlist`：允许发送私信的 ship（空 = 无）。
- `channels.tlon.autoAcceptDmInvites`：自动接受 allowlist 中 ship 的私信邀请。
- `channels.tlon.autoAcceptGroupInvites`：自动接受所有群组邀请。
- `channels.tlon.autoDiscoverChannels`：自动发现群组渠道（默认：true）。
- `channels.tlon.groupChannels`：手动固定的渠道 nest。
- `channels.tlon.defaultAuthorizedShips`：对所有渠道均已授权的 ship。
- `channels.tlon.authorization.channelRules`：按渠道的授权规则。
- `channels.tlon.showModelSignature`：在消息后附加模型名称。

## 说明

- 群组回复需要提及（例如 `~your-bot-ship`）才会响应。
- 线程回复：如果入站消息在线程中，OpenClaw 会在线程内回复。
- 富文本：Markdown 格式（加粗、斜体、代码、标题、列表）会转换为 Tlon 的原生格式。
- 图片：URL 会上传到 Tlon 存储，并嵌入为图片块。

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有受支持的渠道
- [配对](/zh-CN/channels/pairing) — 私信身份验证和配对流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及限制
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/zh-CN/gateway/security) — 访问模型与安全加固
