---
read_when:
    - 在任意渠道中处理表情回应
    - 了解不同平台之间 emoji 表情回应的差异
summary: 所有受支持渠道中的 Reaction 工具语义
title: 表情回应
x-i18n:
    generated_at: "2026-04-09T00:59:09Z"
    model: gpt-5.4
    provider: openai
    source_hash: 9af2951eee32e73adb982dbdf39b32e4065993454e9cce2ad23b27565cab4f84
    source_path: tools\reactions.md
    workflow: 15
---

# 表情回应

智能体可以使用带有 `react` 操作的 `message`
工具，在消息上添加和移除 emoji 表情回应。表情回应行为因渠道而异。

## 工作原理

```json
{
  "action": "react",
  "messageId": "msg-123",
  "emoji": "thumbsup"
}
```

- 添加表情回应时，`emoji` 为必填。
- 将 `emoji` 设为空字符串（`""`）可移除机器人的表情回应。
- 将 `remove: true` 设为 true 可移除指定 emoji（要求 `emoji` 非空）。

## 渠道行为

<AccordionGroup>
  <Accordion title="Discord 和 Slack">
    - 空 `emoji` 会移除机器人在该消息上的所有表情回应。
    - `remove: true` 只会移除指定的 emoji。
  </Accordion>

  <Accordion title="Google Chat">
    - 空 `emoji` 会移除应用在该消息上的表情回应。
    - `remove: true` 只会移除指定的 emoji。
  </Accordion>

  <Accordion title="Telegram">
    - 空 `emoji` 会移除机器人的表情回应。
    - `remove: true` 也会移除表情回应，但工具校验仍要求提供非空 `emoji`。
  </Accordion>

  <Accordion title="WhatsApp">
    - 空 `emoji` 会移除机器人的表情回应。
    - `remove: true` 会在内部映射为空 emoji（但工具调用中仍要求提供 `emoji`）。
  </Accordion>

  <Accordion title="Zalo Personal (zalouser)">
    - 要求 `emoji` 非空。
    - `remove: true` 会移除该特定 emoji 表情回应。
  </Accordion>

  <Accordion title="Feishu/Lark">
    - 使用 `feishu_reaction` 工具，操作为 `add`、`remove` 和 `list`。
    - 添加/移除要求提供 `emoji_type`；移除还要求提供 `reaction_id`。
  </Accordion>

  <Accordion title="Signal">
    - 入站表情回应通知由 `channels.signal.reactionNotifications` 控制：`"off"` 会禁用它们，`"own"`（默认）会在用户对机器人消息作出表情回应时发出事件，`"all"` 会为所有表情回应发出事件。
  </Accordion>
</AccordionGroup>

## 表情回应级别

每个渠道的 `reactionLevel` 配置用于控制智能体使用表情回应的广泛程度。典型值包括 `off`、`ack`、`minimal` 或 `extensive`。

- [Telegram reactionLevel](/zh-CN/channels/telegram#reaction-notifications) — `channels.telegram.reactionLevel`
- [WhatsApp reactionLevel](/zh-CN/channels/whatsapp#reactions) — `channels.whatsapp.reactionLevel`

在各个独立渠道上设置 `reactionLevel`，即可调整智能体在每个平台上对消息作出表情回应的活跃程度。

## 相关内容

- [?????](/zh-CN/tools/agent-send) — 包含 `react` 的 `message` 工具
- [??](/zh-CN/channels) — 渠道特定配置
