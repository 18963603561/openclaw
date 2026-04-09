---
read_when:
    - 更改群组消息规则或提及方式
summary: WhatsApp 群组消息处理的行为与配置（`mentionPatterns` 在各个界面间共享）
title: 群组消息
x-i18n:
    generated_at: "2026-04-08T03:41:32Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2543be5bc4c6f188f955df580a6fef585ecbfc1be36ade5d34b1a9157e021bc5
    source_path: channels\group-messages.md
    workflow: 15
---

# 群组消息（WhatsApp web 渠道）

目标：让 Clawd 待在 WhatsApp 群组中，只在被点名时唤醒，并让该线程与个人私信会话分开。

注意：`agents.list[].groupChat.mentionPatterns` 现在也用于 Telegram/Discord/Slack/iMessage；本文档聚焦于 WhatsApp 特有行为。对于多智能体设置，请按智能体设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局回退）。

## 当前实现（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 要求一次点名（真实的 WhatsApp @ 提及，通过 `mentionedJids`、安全的正则模式，或文本中任意位置出现机器人的 E.164 号码）。`always` 会在每条消息上唤醒智能体，但它应仅在能够提供有意义价值时才回复；否则返回精确的静默 token `NO_REPLY` / `no_reply`。默认值可在配置中通过 `channels.whatsapp.groups` 设置，也可通过 `/activation` 按群组覆盖。当设置了 `channels.whatsapp.groups` 时，它也会充当群组允许列表（包含 `"*"` 可允许全部）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式的 `channels.whatsapp.allowFrom`）。默认值为 `allowlist`（在你添加发送者之前会被阻止）。
- 按群组区分会话：会话键看起来像 `agent:<agentId>:whatsapp:group:<jid>`，因此像 `/verbose on` 或 `/think high` 这样的命令（作为独立消息发送）会限定在该群组范围内；个人私信状态不会受到影响。Heartbeat 会跳过群组线程。
- 上下文注入：**仅待处理**的群组消息（默认 50 条）且_未_触发运行的消息，会在 `[Chat messages since your last reply - for context]` 下作为前缀注入，触发那一行则位于 `[Current message - respond to this]` 下。已经在会话中的消息不会被重复注入。
- 发送者呈现：每个群组批次现在都会以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道是谁在发言。
- 阅后即焚/view-once：我们会在提取文本/提及之前先解包它们，因此其中的点名仍然会触发。
- 群组系统提示：在群组会话的首轮（以及每次 `/activation` 更改模式时），我们会向系统提示中注入一段简短说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果元数据不可用，我们仍会告知智能体这是一个群聊。

## 配置示例（WhatsApp）

向 `~/.openclaw/openclaw.json` 添加一个 `groupChat` 块，这样即使 WhatsApp 在文本正文中去掉可见的 `@`，显示名称点名仍可生效：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

说明：

- 这些正则表达式不区分大小写，并使用与其他配置正则入口相同的安全正则防护规则；无效模式和不安全的嵌套重复会被忽略。
- 当有人点按联系人时，WhatsApp 仍会通过 `mentionedJids` 发送规范化提及，因此号码回退很少需要，但它仍是一个有用的安全兜底。

### 激活命令（仅 owner）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，若未设置则为机器人自己的 E.164 号码）可以更改此项。将 `/status` 作为独立消息发送到群组中，可查看当前激活模式。

## 使用方式

1. 将你的 WhatsApp 账号（运行 OpenClaw 的那个）添加到群组。
2. 发送 `@openclaw …`（或包含号码）。除非你设置 `groupPolicy: "open"`，否则只有在允许列表中的发送者才能触发它。
3. 智能体提示将包含最近的群组上下文以及末尾的 `[from: …]` 标记，因此它可以正确回应相应的人。
4. 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）只会应用于该群组的会话；请将它们作为独立消息发送，以便能够被识别。你的个人私信会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送一条 `@openclaw` 点名，并确认回复中引用了发送者姓名。
  - 发送第二次点名，并验证历史记录块已包含进去，然后在下一轮被清除。
- 检查 gateway 日志（使用 `--verbose` 运行），查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- Heartbeat 会有意跳过群组，以避免产生嘈杂的广播。
- 回声抑制使用组合后的批次字符串；如果你在没有提及的情况下两次发送相同文本，只有第一次会得到响应。
- 会话存储中的条目会显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认位于 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；如果缺少条目，只表示该群组尚未触发过运行。
- 群组中的输入状态指示遵循 `agents.defaults.typingMode`（默认：未被提及时为 `message`）。
