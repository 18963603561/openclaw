---
read_when:
    - 你想连接一个 Feishu/Lark 机器人
    - 你正在配置 Feishu 渠道
summary: Feishu 机器人概览、功能与配置
title: Feishu
x-i18n:
    generated_at: "2026-04-08T03:42:21Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4e39b6dfe3a3aa4ebbdb992975e570e4f1b5e79f3b400a555fc373a0d1889952
    source_path: channels\feishu.md
    workflow: 15
---

# Feishu 机器人

Feishu（Lark）是企业用于消息传递与协作的团队聊天平台。此插件通过平台的 WebSocket 事件订阅将 OpenClaw 连接到 Feishu/Lark 机器人，因此无需暴露公开的 webhook URL 即可接收消息。

---

## 内置插件

Feishu 已随当前 OpenClaw 版本内置提供，因此无需单独安装插件。

如果你使用的是较旧的构建版本，或未包含内置 Feishu 的自定义安装，请手动安装：

```bash
openclaw plugins install @openclaw/feishu
```

---

## 快速开始

添加 Feishu 渠道有两种方式：

### 方法 1：新手引导（推荐）

如果你刚刚安装 OpenClaw，请运行新手引导：

```bash
openclaw onboard
```

向导将引导你完成以下操作：

1. 创建 Feishu 应用并收集凭证
2. 在 OpenClaw 中配置应用凭证
3. 启动 Gateway 网关

✅ **配置完成后**，检查 Gateway 网关状态：

- `openclaw gateway status`
- `openclaw logs --follow`

### 方法 2：CLI 设置

如果你已经完成初始安装，请通过 CLI 添加该渠道：

```bash
openclaw channels add
```

选择 **Feishu**，然后输入 App ID 和 App Secret。

✅ **配置完成后**，管理 Gateway 网关：

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## 第 1 步：创建 Feishu 应用

### 1. 打开 Feishu 开放平台

访问 [Feishu Open Platform](https://open.feishu.cn/app) 并登录。

Lark（国际版）租户应使用 [https://open.larksuite.com/app](https://open.larksuite.com/app)，并在 Feishu 配置中设置 `domain: "lark"`。

### 2. 创建应用

1. 点击 **Create enterprise app**
2. 填写应用名称和描述
3. 选择应用图标

![Create enterprise app](/images/feishu-step2-create-app.png)

### 3. 复制凭证

在 **Credentials & Basic Info** 中，复制：

- **App ID**（格式：`cli_xxx`）
- **App Secret**

❗ **重要：** 请妥善保管 App Secret，不要泄露。

![Get credentials](/images/feishu-step3-credentials.png)

### 4. 配置权限

在 **Permissions** 中，点击 **Batch import** 并粘贴：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![Configure permissions](/images/feishu-step4-permissions.png)

### 5. 启用机器人能力

在 **App Capability** > **Bot** 中：

1. 启用机器人能力
2. 设置机器人名称

![Enable bot capability](/images/feishu-step5-bot-capability.png)

### 6. 配置事件订阅

⚠️ **重要：** 在设置事件订阅之前，请确保：

1. 你已经为 Feishu 运行过 `openclaw channels add`
2. Gateway 网关正在运行（`openclaw gateway status`）

在 **Event Subscription** 中：

1. 选择 **Use long connection to receive events**（WebSocket）
2. 添加事件：`im.message.receive_v1`
3. （可选）对于 Drive 评论工作流，还要添加：`drive.notice.comment_add_v1`

⚠️ 如果 Gateway 网关未运行，长连接配置可能无法保存。

![Configure event subscription](/images/feishu-step6-event-subscription.png)

### 7. 发布应用

1. 在 **Version Management & Release** 中创建版本
2. 提交审核并发布
3. 等待管理员批准（企业应用通常会自动批准）

---

## 第 2 步：配置 OpenClaw

### 使用向导配置（推荐）

```bash
openclaw channels add
```

选择 **Feishu** 并粘贴你的 App ID 和 App Secret。

### 通过配置文件进行配置

编辑 `~/.openclaw/openclaw.json`：

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "My AI assistant",
        },
      },
    },
  },
}
```

如果你使用 `connectionMode: "webhook"`，请同时设置 `verificationToken` 和 `encryptKey`。Feishu webhook 服务器默认绑定到 `127.0.0.1`；只有在你明确需要不同绑定地址时，才设置 `webhookHost`。

#### Verification Token 和 Encrypt Key（webhook 模式）

使用 webhook 模式时，请在配置中同时设置 `channels.feishu.verificationToken` 和 `channels.feishu.encryptKey`。获取这些值的方法如下：

1. 在 Feishu 开放平台中打开你的应用
2. 前往 **Development** → **Events & Callbacks**（开发配置 → 事件与回调）
3. 打开 **Encryption** 选项卡（加密策略）
4. 复制 **Verification Token** 和 **Encrypt Key**

下图展示了 **Verification Token** 的位置。**Encrypt Key** 位于同一 **Encryption** 区域中。

![Verification Token location](/images/feishu-verification-token.png)

### 通过环境变量进行配置

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Lark（国际版）域名

如果你的租户位于 Lark（国际版），请将域名设置为 `lark`（或完整域名字串）。你可以在 `channels.feishu.domain` 处设置，也可以按账户设置（`channels.feishu.accounts.<id>.domain`）。

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### 配额优化标志

你可以使用两个可选标志来减少 Feishu API 的使用量：

- `typingIndicator`（默认 `true`）：设为 `false` 时，跳过“正在输入”反应调用。
- `resolveSenderNames`（默认 `true`）：设为 `false` 时，跳过发送者资料查询调用。

你可以在顶层或按账户设置它们：

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## 第 3 步：启动并测试

### 1. 启动 Gateway 网关

```bash
openclaw gateway
```

### 2. 发送测试消息

在 Feishu 中找到你的机器人并发送一条消息。

### 3. 批准配对

默认情况下，机器人会回复一个配对码。请批准它：

```bash
openclaw pairing approve feishu <CODE>
```

批准后，你就可以正常聊天了。

---

## 概览

- **Feishu 机器人渠道**：由 Gateway 网关管理的 Feishu 机器人
- **确定性路由**：回复始终返回到 Feishu
- **会话隔离**：私信共享主会话；群组相互隔离
- **WebSocket 连接**：通过 Feishu SDK 建立长连接，无需公开 URL

---

## 访问控制

### 私信

- **默认值**：`dmPolicy: "pairing"`（未知用户会收到一个配对码）
- **批准配对**：

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **允许名单模式**：设置 `channels.feishu.allowFrom`，填入允许的 Open ID

### 群聊

**1. 群策略**（`channels.feishu.groupPolicy`）：

- `"open"` = 允许群里的所有人
- `"allowlist"` = 仅允许 `groupAllowFrom`
- `"disabled"` = 禁用群消息

默认值：`allowlist`

**2. @ 提及要求**（`channels.feishu.requireMention`，可通过 `channels.feishu.groups.<chat_id>.requireMention` 覆盖）：

- 显式 `true` = 必须 @ 提及
- 显式 `false` = 无需提及也会响应
- 未设置且 `groupPolicy: "open"` = 默认为 `false`
- 未设置且 `groupPolicy` 不是 `"open"` = 默认为 `true`

---

## 群组配置示例

### 允许所有群组，无需 @ 提及（开放群组的默认行为）

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### 允许所有群组，但仍要求 @ 提及

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### 仅允许特定群组

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### 限制哪些发送者可以在群组中发消息（发送者允许名单）

除了允许群组本身之外，该群组中的**所有消息**都会受到发送者 open_id 的限制：只有 `groups.<chat_id>.allowFrom` 中列出的用户，其消息才会被处理；其他成员的消息会被忽略（这是完整的发送者级别限制，而不仅仅针对 `/reset` 或 `/new` 之类的控制命令）。

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // Feishu user IDs (open_id) look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## 获取群组 / 用户 ID

### 群组 ID（`chat_id`）

群组 ID 形如 `oc_xxx`。

**方法 1（推荐）**

1. 启动 Gateway 网关，并在群里 @ 提及机器人
2. 运行 `openclaw logs --follow`，查找 `chat_id`

**方法 2**

使用 Feishu API 调试器列出群聊。

### 用户 ID（`open_id`）

用户 ID 形如 `ou_xxx`。

**方法 1（推荐）**

1. 启动 Gateway 网关，并向机器人发送私信
2. 运行 `openclaw logs --follow`，查找 `open_id`

**方法 2**

检查配对请求中的用户 Open ID：

```bash
openclaw pairing list feishu
```

---

## 常用命令

| 命令 | 说明 |
| --------- | ----------------- |
| `/status` | 显示机器人状态 |
| `/reset`  | 重置会话 |
| `/model`  | 显示 / 切换模型 |

> 注意：Feishu 暂不支持原生命令菜单，因此命令必须以文本形式发送。

## Gateway 网关管理命令

| 命令 | 说明 |
| -------------------------- | ----------------------------- |
| `openclaw gateway status`  | 显示 Gateway 网关状态 |
| `openclaw gateway install` | 安装 / 启动 Gateway 网关服务 |
| `openclaw gateway stop`    | 停止 Gateway 网关服务 |
| `openclaw gateway restart` | 重启 Gateway 网关服务 |
| `openclaw logs --follow`   | 持续查看 Gateway 网关日志 |

---

## 故障排除

### 机器人在群聊中没有响应

1. 确保机器人已被添加到群组
2. 确保你已 @ 提及机器人（默认行为）
3. 检查 `groupPolicy` 未设置为 `"disabled"`
4. 检查日志：`openclaw logs --follow`

### 机器人收不到消息

1. 确保应用已发布并获批
2. 确保事件订阅包含 `im.message.receive_v1`
3. 确保已启用**长连接**
4. 确保应用权限完整
5. 确保 Gateway 网关正在运行：`openclaw gateway status`
6. 检查日志：`openclaw logs --follow`

### App Secret 泄露

1. 在 Feishu 开放平台中重置 App Secret
2. 更新配置中的 App Secret
3. 重启 Gateway 网关

### 消息发送失败

1. 确保应用具备 `im:message:send_as_bot` 权限
2. 确保应用已发布
3. 查看日志中的详细错误

---

## 高级配置

### 多账户

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制当出站 API 未显式指定 `accountId` 时，使用哪个 Feishu 账户。

### 消息限制

- `textChunkLimit`：出站文本分块大小（默认：2000 个字符）
- `mediaMaxMb`：媒体上传 / 下载限制（默认：30 MB）

### 流式传输

Feishu 支持通过交互卡片进行流式回复。启用后，机器人会在生成文本时持续更新卡片。

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

将 `streaming: false` 设为 `false` 后，系统会等待完整回复生成后再发送。

### ACP 会话

Feishu 对以下场景支持 ACP：

- 私信
- 群主题会话

Feishu ACP 采用文本命令驱动。不提供原生斜杠命令菜单，因此请直接在对话中使用 `/acp ...` 消息。

#### 持久化 ACP 绑定

使用顶层类型化 ACP 绑定，将 Feishu 私信或主题会话固定绑定到持久化 ACP 会话。

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
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### 从聊天中按线程绑定的 ACP 生成

在 Feishu 私信或主题会话中，你可以就地生成并绑定一个 ACP 会话：

```text
/acp spawn codex --thread here
```

说明：

- `--thread here` 适用于私信和 Feishu 主题。
- 后续发往已绑定私信 / 主题的消息会直接路由到该 ACP 会话。
- v1 不支持面向普通非主题群聊。

### 多智能体路由

使用 `bindings` 将 Feishu 私信或群组路由到不同智能体。

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

路由字段：

- `match.channel`：`"feishu"`
- `match.peer.kind`：`"direct"` 或 `"group"`
- `match.peer.id`：用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

查找技巧请参阅 [获取群组 / 用户 ID](#get-groupuser-ids)。

---

## 配置参考

完整配置请参阅：[??](/zh-CN/gateway/configuration)

关键选项：

| 设置项 | 说明 | 默认值 |
| ------------------------------------------------- | --------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | 启用 / 禁用渠道 | `true` |
| `channels.feishu.domain`                          | API 域名（`feishu` 或 `lark`） | `feishu` |
| `channels.feishu.connectionMode`                  | 事件传输模式 | `websocket` |
| `channels.feishu.defaultAccount`                  | 出站路由的默认账户 ID | `default` |
| `channels.feishu.verificationToken`               | webhook 模式必需 | - |
| `channels.feishu.encryptKey`                      | webhook 模式必需 | - |
| `channels.feishu.webhookPath`                     | webhook 路由路径 | `/feishu/events` |
| `channels.feishu.webhookHost`                     | webhook 绑定主机 | `127.0.0.1` |
| `channels.feishu.webhookPort`                     | webhook 绑定端口 | `3000` |
| `channels.feishu.accounts.<id>.appId`             | App ID | - |
| `channels.feishu.accounts.<id>.appSecret`         | App Secret | - |
| `channels.feishu.accounts.<id>.domain`            | 按账户覆盖 API 域名 | `feishu` |
| `channels.feishu.dmPolicy`                        | 私信策略 | `pairing` |
| `channels.feishu.allowFrom`                       | 私信允许名单（`open_id` 列表） | - |
| `channels.feishu.groupPolicy`                     | 群组策略 | `allowlist` |
| `channels.feishu.groupAllowFrom`                  | 群组允许名单 | - |
| `channels.feishu.requireMention`                  | 默认要求 @ 提及 | conditional |
| `channels.feishu.groups.<chat_id>.requireMention` | 按群组覆盖 @ 提及要求 | inherited |
| `channels.feishu.groups.<chat_id>.enabled`        | 启用群组 | `true` |
| `channels.feishu.textChunkLimit`                  | 消息分块大小 | `2000` |
| `channels.feishu.mediaMaxMb`                      | 媒体大小限制 | `30` |
| `channels.feishu.streaming`                       | 启用流式卡片输出 | `true` |
| `channels.feishu.blockStreaming`                  | 启用分块流式传输 | `true` |

---

## dmPolicy 参考

| 值 | 行为 |
| ------------- | --------------------------------------------------------------- |
| `"pairing"`   | **默认值。** 未知用户会收到配对码；必须批准 |
| `"allowlist"` | 只有 `allowFrom` 中的用户可以聊天 |
| `"open"`      | 允许所有用户（要求 `allowFrom` 中包含 `"*"`） |
| `"disabled"`  | 禁用私信 |

---

## 支持的消息类型

### 接收

- ✅ 文本
- ✅ 富文本（post）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频 / 媒体
- ✅ 贴纸

### 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ 视频 / 媒体
- ✅ 交互卡片
- ⚠️ 富文本（post 风格格式和卡片，不支持任意 Feishu 原生编辑功能）

### 线程与回复

- ✅ 内联回复
- ✅ Feishu 暴露 `reply_in_thread` 时支持主题线程回复
- ✅ 回复线程 / 主题消息时，媒体回复会保持线程感知

## Drive 评论

当有人在 Feishu Drive 文档（Docs、Sheets 等）上添加评论时，Feishu 可以触发智能体。智能体会收到评论文本、文档上下文以及评论线程，因此可以在线程内回复或编辑文档。

要求：

- 在你的 Feishu 应用事件订阅设置中订阅 `drive.notice.comment_add_v1`
  （与现有的 `im.message.receive_v1` 一起）
- Drive 工具默认启用；如需禁用，请设置 `channels.feishu.tools.drive: false`

`feishu_drive` 工具公开以下评论操作：

| 操作 | 说明 |
| ---------------------- | ----------------------------------- |
| `list_comments`        | 列出文档上的评论 |
| `list_comment_replies` | 列出评论线程中的回复 |
| `add_comment`          | 添加新的顶级评论 |
| `reply_comment`        | 回复现有评论线程 |

当智能体处理 Drive 评论事件时，它会收到：

- 评论文本和发送者
- 文档元数据（标题、类型、URL）
- 用于在线程内回复的评论线程上下文

完成文档编辑后，系统会引导智能体使用 `feishu_drive.reply_comment` 通知评论者，然后输出精确的静默令牌 `NO_REPLY` / `no_reply`，以避免重复发送。

## 运行时操作面

Feishu 当前公开以下运行时操作：

- `send`
- `read`
- `edit`
- `thread-reply`
- `pin`
- `list-pins`
- `unpin`
- `member-info`
- `channel-info`
- `channel-list`
- 配置中启用 reactions 时可用 `react` 和 `reactions`
- `feishu_drive` 评论操作：`list_comments`、`list_comment_replies`、`add_comment`、`reply_comment`

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有受支持的渠道
- [配对](/zh-CN/channels/pairing) — 私信身份验证与配对流程
- [群组](/zh-CN/channels/groups) — 群聊行为与提及限制
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/zh-CN/gateway/security) — 访问模型与安全加固
