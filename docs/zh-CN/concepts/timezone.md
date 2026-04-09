---
read_when:
    - 你需要了解时间戳如何为模型进行标准化
    - 为系统 prompt 配置用户时区
summary: 智能体、消息 envelope 和 prompt 的时区处理
title: 时区
x-i18n:
    generated_at: "2026-04-08T04:05:52Z"
    model: gpt-5.4
    provider: openai
    source_hash: 31a195fa43e3fc17b788d8e70d74ef55da998fc7997c4f0538d4331b1260baac
    source_path: concepts\timezone.md
    workflow: 15
---

# 时区

OpenClaw 会对时间戳进行标准化，使模型看到的是**单一参考时间**。

## 消息 envelope（默认使用本地时间）

入站消息会被包装成如下 envelope：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

envelope 中的时间戳**默认使用主机本地时间**，精确到分钟。

你可以通过以下配置覆盖：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  }
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主机时区）。
- 使用显式的 IANA 时区（例如 `"Europe/Vienna"`）可获得固定偏移。
- `envelopeTimestamp: "off"` 会从 envelope 标头中移除绝对时间戳。
- `envelopeElapsed: "off"` 会移除已过去时间后缀（即 `+2m` 这种形式）。

### 示例

**本地时间（默认）：**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**固定时区：**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**已过去时间：**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## 工具负载（原始提供商数据 + 标准化字段）

工具调用（`channels.discord.readMessages`、`channels.slack.readMessages` 等）会返回**原始提供商时间戳**。
我们还会附加标准化字段以保持一致性：

- `timestampMs`（UTC epoch 毫秒）
- `timestampUtc`（ISO 8601 UTC 字符串）

原始提供商字段会被保留。

## 用于系统 prompt 的用户时区

设置 `agents.defaults.userTimezone`，用于告知模型用户的本地时区。如果未设置，OpenClaw 会在运行时解析**主机时区**（不会写入配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系统 prompt 包含：

- 带有本地时间和时区的 `Current Date & Time` 部分
- `Time format: 12-hour` 或 `24-hour`

你可以通过 `agents.defaults.timeFormat`（`auto` | `12` | `24`）控制 prompt 格式。

完整行为和示例请参见 [?????](/zh-CN/date-time)。

## 相关内容

- [Heartbeat](/zh-CN/gateway/heartbeat) —— 活跃时段使用时区进行调度
- [????](/zh-CN/automation/cron-jobs) —— cron 表达式使用时区进行调度
- [?????](/zh-CN/date-time) —— 完整的日期/时间行为与示例
