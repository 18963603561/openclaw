---
read_when:
    - 处理 Zalo 功能或 webhook 时
summary: Zalo 机器人支持状态、能力与配置
title: Zalo
x-i18n:
    generated_at: "2026-04-08T03:49:13Z"
    model: gpt-5.4
    provider: openai
    source_hash: ab94642ba28e79605b67586af8f71c18bc10e0af60343a7df508e6823b6f4119
    source_path: channels\zalo.md
    workflow: 15
---

# Zalo（Bot API）

状态：实验性。支持私信。下方的[能力](#capabilities)部分反映了当前 Marketplace 机器人的行为。

## 内置插件

Zalo 在当前 OpenClaw 版本中作为内置插件提供，因此常规打包
构建不需要单独安装。

如果你使用的是较旧版本，或是不包含 Zalo 的自定义安装，请手动安装：

- 通过 CLI 安装：`openclaw plugins install @openclaw/zalo`
- 或从源码 checkout 安装：`openclaw plugins install ./path/to/local/zalo-plugin`
- 详情参见：[Plugins](/tools/plugin)

## 快速设置（新手）

1. 确保 Zalo 插件可用。
   - 当前打包版 OpenClaw 已内置该插件。
   - 较旧版本/自定义安装可使用上面的命令手动添加。
2. 设置 token：
   - 环境变量：`ZALO_BOT_TOKEN=...`
   - 或配置：`channels.zalo.accounts.default.botToken: "..."`。
3. 重启 Gateway 网关（或完成设置）。
4. 私信访问默认使用 pairing；首次联系时请批准 pairing code。

最小配置：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

## 它是什么

Zalo 是一款面向越南的消息应用；它的 Bot API 让 Gateway 网关 能够运行一个用于 1:1 对话的机器人。
如果你希望以确定性的方式将回复路由回 Zalo，它非常适合用于支持或通知场景。

本页反映的是 OpenClaw 针对 **Zalo Bot Creator / Marketplace 机器人** 的当前行为。
**Zalo Official Account（OA）机器人** 是 Zalo 的另一种产品形态，其行为可能不同。

- 由 Gateway 网关 持有的 Zalo Bot API 渠道。
- 确定性路由：回复会返回到 Zalo；模型不会自行选择渠道。
- 私信共享智能体的主会话。
- 下方的[能力](#capabilities)部分展示了当前 Marketplace 机器人支持情况。

## 设置（快速路径）

### 1）创建 bot token（Zalo Bot Platform）

1. 前往 [https://bot.zaloplatforms.com](https://bot.zaloplatforms.com) 并登录。
2. 创建一个新机器人并配置其设置。
3. 复制完整的 bot token（通常为 `numeric_id:secret`）。对于 Marketplace 机器人，可用的运行时 token 可能会在创建后出现在机器人的欢迎消息中。

### 2）配置 token（环境变量或配置）

示例：

```json5
{
  channels: {
    zalo: {
      enabled: true,
      accounts: {
        default: {
          botToken: "12345689:abc-xyz",
          dmPolicy: "pairing",
        },
      },
    },
  },
}
```

如果你之后迁移到支持群组的 Zalo 机器人产品形态，可以显式添加群组相关配置，如 `groupPolicy` 和 `groupAllowFrom`。对于当前 Marketplace 机器人的行为，请参见[能力](#capabilities)。

环境变量方式：`ZALO_BOT_TOKEN=...`（仅适用于默认账户）。

多账户支持：使用 `channels.zalo.accounts` 配置每个账户各自的 token 和可选的 `name`。

3. 重启 Gateway 网关。当 token 被解析成功时（环境变量或配置），Zalo 即会启动。
4. 私信访问默认使用 pairing。首次联系机器人时请批准该 code。

## 工作原理（行为）

- 入站消息会被规范化为共享的渠道信封格式，并附带媒体占位符。
- 回复始终会路由回同一个 Zalo 聊天。
- 默认使用 long-polling；也可通过 `channels.zalo.webhookUrl` 使用 webhook 模式。

## 限制

- 出站文本会按 2000 个字符分块（Zalo API 限制）。
- 媒体下载/上传受 `channels.zalo.mediaMaxMb` 限制（默认 5）。
- 默认禁用流式传输，因为 2000 字符限制使流式传输的收益较低。

## 访问控制（私信）

### 私信访问

- 默认：`channels.zalo.dmPolicy = "pairing"`。未知发送者会收到一个 pairing code；在获得批准前，其消息会被忽略（code 在 1 小时后过期）。
- 批准方式：
  - `openclaw pairing list zalo`
  - `openclaw pairing approve zalo <CODE>`
- pairing 是默认的 token 交换方式。详情参见：[Pairing](/zh-CN/channels/pairing)
- `channels.zalo.allowFrom` 接受数字用户 ID（不支持用户名查询）。

## 访问控制（群组）

对于 **Zalo Bot Creator / Marketplace 机器人**，群组支持在实际使用中不可用，因为机器人根本无法被添加到群组中。

这意味着下面这些群组相关配置键虽然存在于 schema 中，但对 Marketplace 机器人并不可用：

- `channels.zalo.groupPolicy` 控制群组入站处理：`open | allowlist | disabled`。
- `channels.zalo.groupAllowFrom` 限制在群组中哪些发送者 ID 可以触发机器人。
- 如果未设置 `groupAllowFrom`，Zalo 会在发送者检查时回退到 `allowFrom`。
- 运行时说明：如果完全缺少 `channels.zalo`，运行时仍会为安全起见回退到 `groupPolicy="allowlist"`。

群组策略的取值（当你的机器人产品形态支持群组访问时）如下：

- `groupPolicy: "disabled"` — 阻止所有群组消息。
- `groupPolicy: "open"` — 允许任意群组成员（受提及门控限制）。
- `groupPolicy: "allowlist"` — 默认失败关闭；仅接受被允许的发送者。

如果你使用的是另一种 Zalo 机器人产品形态，并且已验证群组行为可正常工作，请单独记录该行为，不要假定它与 Marketplace 机器人的流程一致。

## Long-polling 与 webhook

- 默认：long-polling（不需要公网 URL）。
- webhook 模式：设置 `channels.zalo.webhookUrl` 和 `channels.zalo.webhookSecret`。
  - webhook secret 必须为 8 到 256 个字符。
  - webhook URL 必须使用 HTTPS。
  - Zalo 会发送带有 `X-Bot-Api-Secret-Token` 请求头的事件用于校验。
  - Gateway 网关 HTTP 会在 `channels.zalo.webhookPath` 处理 webhook 请求（默认为 webhook URL 的路径）。
  - 请求必须使用 `Content-Type: application/json`（或 `+json` 媒体类型）。
  - 重复事件（`event_name + message_id`）会在一个短暂的重放窗口内被忽略。
  - 突发流量会按路径/来源进行速率限制，并可能返回 HTTP 429。

**注意：** 根据 Zalo API 文档，getUpdates（polling）和 webhook 对同一个机器人是互斥的。

## 支持的消息类型

快速支持概览请参见[能力](#capabilities)。下面的说明对一些需要额外上下文的行为做了补充。

- **文本消息**：完整支持，按 2000 字符分块。
- **文本中的普通 URL**：与普通文本输入行为一致。
- **链接预览 / 富链接卡片**：请参见[能力](#capabilities)中的 Marketplace 机器人状态；它们不会稳定触发回复。
- **图片消息**：请参见[能力](#capabilities)中的 Marketplace 机器人状态；入站图片处理不稳定（会显示 typing indicator，但没有最终回复）。
- **贴纸**：请参见[能力](#capabilities)中的 Marketplace 机器人状态。
- **语音消息 / 音频文件 / 视频 / 通用文件附件**：请参见[能力](#capabilities)中的 Marketplace 机器人状态。
- **不支持的类型**：会被记录日志（例如，来自受保护用户的消息）。

## 能力

此表汇总了 OpenClaw 中当前 **Zalo Bot Creator / Marketplace 机器人** 的行为。

| 功能 | 状态 |
| --------------------------- | --------------------------------------- |
| 私信 | ✅ 支持 |
| 群组 | ❌ Marketplace 机器人不可用 |
| 媒体（入站图片） | ⚠️ 有限支持 / 请在你的环境中验证 |
| 媒体（出站图片） | ⚠️ 未针对 Marketplace 机器人重新测试 |
| 文本中的普通 URL | ✅ 支持 |
| 链接预览 | ⚠️ 对 Marketplace 机器人不稳定 |
| 表情回应 | ❌ 不支持 |
| 贴纸 | ⚠️ Marketplace 机器人无智能体回复 |
| 语音消息 / 音频 / 视频 | ⚠️ Marketplace 机器人无智能体回复 |
| 文件附件 | ⚠️ Marketplace 机器人无智能体回复 |
| 线程 | ❌ 不支持 |
| 投票 | ❌ 不支持 |
| 原生命令 | ❌ 不支持 |
| 流式传输 | ⚠️ 已禁用（2000 字符限制） |

## 投递目标（CLI/cron）

- 使用 chat id 作为目标。
- 示例：`openclaw message send --channel zalo --target 123456789 --message "hi"`。

## 故障排除

**机器人没有响应：**

- 检查 token 是否有效：`openclaw channels status --probe`
- 确认发送者已获批准（pairing 或 allowFrom）
- 检查 Gateway 网关 日志：`openclaw logs --follow`

**webhook 未接收到事件：**

- 确保 webhook URL 使用 HTTPS
- 确认 secret token 长度为 8 到 256 个字符
- 确认 Gateway 网关 HTTP 端点在配置路径上可访问
- 检查 getUpdates polling 是否仍在运行（两者互斥）

## 配置参考（Zalo）

完整配置参见：[配置](/gateway/configuration)

扁平的顶层键（如 `channels.zalo.botToken`、`channels.zalo.dmPolicy` 等）是旧版单账户简写。对于新配置，优先使用 `channels.zalo.accounts.<id>.*`。由于这两种形式都存在于 schema 中，因此此处仍一并记录。

提供商选项：

- `channels.zalo.enabled`：启用/禁用渠道启动。
- `channels.zalo.botToken`：来自 Zalo Bot Platform 的 bot token。
- `channels.zalo.tokenFile`：从常规文件路径读取 token。拒绝符号链接。
- `channels.zalo.dmPolicy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.zalo.allowFrom`：私信 allowlist（用户 ID）。`open` 要求包含 `"*"`。向导会要求输入数字 ID。
- `channels.zalo.groupPolicy`：`open | allowlist | disabled`（默认：allowlist）。配置中存在；当前 Marketplace 机器人的行为请参见[能力](#capabilities)和[访问控制（群组）](#access-control-groups)。
- `channels.zalo.groupAllowFrom`：群组发送者 allowlist（用户 ID）。未设置时回退到 `allowFrom`。
- `channels.zalo.mediaMaxMb`：入站/出站媒体上限（MB，默认 5）。
- `channels.zalo.webhookUrl`：启用 webhook 模式（必须使用 HTTPS）。
- `channels.zalo.webhookSecret`：webhook secret（8 到 256 个字符）。
- `channels.zalo.webhookPath`：Gateway 网关 HTTP 服务器上的 webhook 路径。
- `channels.zalo.proxy`：API 请求的代理 URL。

多账户选项：

- `channels.zalo.accounts.<id>.botToken`：按账户设置 token。
- `channels.zalo.accounts.<id>.tokenFile`：按账户设置常规 token 文件。拒绝符号链接。
- `channels.zalo.accounts.<id>.name`：显示名称。
- `channels.zalo.accounts.<id>.enabled`：启用/禁用账户。
- `channels.zalo.accounts.<id>.dmPolicy`：按账户设置私信策略。
- `channels.zalo.accounts.<id>.allowFrom`：按账户设置 allowlist。
- `channels.zalo.accounts.<id>.groupPolicy`：按账户设置群组策略。配置中存在；当前 Marketplace 机器人的行为请参见[能力](#capabilities)和[访问控制（群组）](#access-control-groups)。
- `channels.zalo.accounts.<id>.groupAllowFrom`：按账户设置群组发送者 allowlist。
- `channels.zalo.accounts.<id>.webhookUrl`：按账户设置 webhook URL。
- `channels.zalo.accounts.<id>.webhookSecret`：按账户设置 webhook secret。
- `channels.zalo.accounts.<id>.webhookPath`：按账户设置 webhook 路径。
- `channels.zalo.accounts.<id>.proxy`：按账户设置代理 URL。

## 相关内容

- [渠道概览](/zh-CN/channels) — 所有支持的渠道
- [Pairing](/zh-CN/channels/pairing) — 私信认证和 pairing 流程
- [群组](/zh-CN/channels/groups) — 群聊行为和提及门控
- [渠道路由](/zh-CN/channels/channel-routing) — 消息的会话路由
- [安全](/gateway/security) — 访问模型与加固
