---
read_when:
    - 调整 heartbeat 频率或消息内容
    - 在计划任务中决定使用 heartbeat 还是 cron
summary: Heartbeat 轮询消息与通知规则
title: Heartbeat
x-i18n:
    generated_at: "2026-04-08T04:28:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: a8021d747637060eacb91ec5f75904368a08790c19f4fca32acda8c8c0a25e41
    source_path: gateway\heartbeat.md
    workflow: 15
---

# Heartbeat（Gateway 网关）

> **Heartbeat 还是 Cron？** 参见[自动化与任务](/zh-CN/automation)，了解应在何时使用它们。

Heartbeat 会在主会话中运行**周期性的智能体轮次**，让模型能够发现需要你关注的事项，而不会频繁打扰你。

Heartbeat 是一个计划执行的主会话轮次——它**不会**创建[后台任务](/zh-CN/automation/tasks)记录。
任务记录用于脱离主会话的工作（ACP 运行、子智能体、隔离的 cron 作业）。

故障排除：[计划任务](/zh-CN/automation/cron-jobs#troubleshooting)

## 快速开始（入门）

1. 保持 heartbeat 启用状态（默认是 `30m`，或在检测到 Anthropic OAuth/token 认证模式时为 `1h`，包括 Claude CLI 复用），或者设置你自己的频率。
2. 在智能体工作区中创建一个简短的 `HEARTBEAT.md` 检查清单或 `tasks:` 块（可选但推荐）。
3. 决定 heartbeat 消息应发送到哪里（默认是 `target: "none"`；设置 `target: "last"` 可路由到最近联系对象）。
4. 可选：启用 heartbeat reasoning 传递以提高透明度。
5. 可选：如果 heartbeat 运行只需要 `HEARTBEAT.md`，可使用轻量级 bootstrap 上下文。
6. 可选：启用隔离会话，避免每次 heartbeat 都发送完整对话历史。
7. 可选：将 heartbeat 限制在活跃时段（本地时间）。

示例配置：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        directPolicy: "allow", // default: allow direct/DM targets; set "block" to suppress
        lightContext: true, // optional: only inject HEARTBEAT.md from bootstrap files
        isolatedSession: true, // optional: fresh session each run (no conversation history)
        // activeHours: { start: "08:00", end: "24:00" },
        // includeReasoning: true, // optional: send separate `Reasoning:` message too
      },
    },
  },
}
```

## 默认值

- 间隔：`30m`（或者在检测到 Anthropic OAuth/token 认证模式时为 `1h`，包括 Claude CLI 复用）。设置 `agents.defaults.heartbeat.every` 或按智能体设置 `agents.list[].heartbeat.every`；使用 `0m` 可禁用。
- 提示词正文（可通过 `agents.defaults.heartbeat.prompt` 配置）：
  `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`
- heartbeat 提示词会**原样**作为用户消息发送。只有当默认智能体启用了 heartbeat
  且本次运行在内部被标记时，系统提示词中才会包含一个 “Heartbeat” 章节。
- 当使用 `0m` 禁用 heartbeat 时，普通运行也会从 bootstrap 上下文中省略 `HEARTBEAT.md`，
  这样模型就不会看到仅供 heartbeat 使用的指令。
- 活跃时段（`heartbeat.activeHours`）会按照配置的时区进行检查。
  在该时间窗口之外，heartbeat 会被跳过，直到窗口内的下一次 tick。

## heartbeat 提示词的用途

默认提示词故意设计得较为宽泛：

- **后台任务**：“Consider outstanding tasks” 会提示智能体检查
  待处理事项（收件箱、日历、提醒、排队工作），并提示任何紧急内容。
- **人工确认**：“Checkup sometimes on your human during day time” 会提示
  智能体偶尔发出轻量级的“你有什么需要吗？”消息，但会根据你配置的本地时区避免夜间打扰
  （参见[/concepts/timezone](/zh-CN/concepts/timezone)）。

Heartbeat 可以对已完成的[后台任务](/zh-CN/automation/tasks)作出反应，但 heartbeat 运行本身不会创建任务记录。

如果你希望 heartbeat 执行非常具体的事情（例如“检查 Gmail PubSub
统计”或“验证 Gateway 网关健康状态”），请将 `agents.defaults.heartbeat.prompt`（或
`agents.list[].heartbeat.prompt`）设置为自定义正文（原样发送）。

## 响应约定

- 如果没有任何事项需要关注，请回复 **`HEARTBEAT_OK`**。
- 在 heartbeat 运行期间，当 `HEARTBEAT_OK` 出现在回复的**开头或结尾**时，
  OpenClaw 会将其视为确认。该标记会被移除；如果剩余内容**≤ `ackMaxChars`**（默认：300），
  则整个回复会被丢弃。
- 如果 `HEARTBEAT_OK` 出现在回复的**中间**，则不会被特殊处理。
- 对于提醒消息，**不要**包含 `HEARTBEAT_OK`；只返回提醒文本。

在 heartbeat 之外，如果消息开头或结尾意外出现 `HEARTBEAT_OK`，也会被移除
并记录日志；如果消息内容只有 `HEARTBEAT_OK`，则会被丢弃。

## 配置

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // default: 30m (0m disables)
        model: "anthropic/claude-opus-4-6",
        includeReasoning: false, // default: false (deliver separate Reasoning: message when available)
        lightContext: false, // default: false; true keeps only HEARTBEAT.md from workspace bootstrap files
        isolatedSession: false, // default: false; true runs each heartbeat in a fresh session (no conversation history)
        target: "last", // default: none | options: last | none | <channel id> (core or plugin, e.g. "bluebubbles")
        to: "+15551234567", // optional channel-specific override
        accountId: "ops-bot", // optional multi-account channel id
        prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        ackMaxChars: 300, // max chars allowed after HEARTBEAT_OK
      },
    },
  },
}
```

### 作用域与优先级

- `agents.defaults.heartbeat` 设置全局 heartbeat 行为。
- `agents.list[].heartbeat` 会在其基础上合并；如果任意智能体有 `heartbeat` 块，**只有这些智能体**会运行 heartbeat。
- `channels.defaults.heartbeat` 为所有渠道设置可见性默认值。
- `channels.<channel>.heartbeat` 会覆盖渠道默认值。
- `channels.<channel>.accounts.<id>.heartbeat`（多账户渠道）会覆盖每渠道设置。

### 按智能体配置 heartbeat

如果任意 `agents.list[]` 条目包含 `heartbeat` 块，**只有这些智能体**
会运行 heartbeat。按智能体块会在 `agents.defaults.heartbeat`
之上合并（这样你可以先设置共享默认值，再为每个智能体覆盖）。

示例：两个智能体，只有第二个智能体运行 heartbeat。

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
      },
    },
    list: [
      { id: "main", default: true },
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "whatsapp",
          to: "+15551234567",
          prompt: "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.",
        },
      },
    ],
  },
}
```

### 活跃时段示例

将 heartbeat 限制为特定时区的办公时间：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last", // explicit delivery to last contact (default is "none")
        activeHours: {
          start: "09:00",
          end: "22:00",
          timezone: "America/New_York", // optional; uses your userTimezone if set, otherwise host tz
        },
      },
    },
  },
}
```

在这个时间窗口之外（美东时间早上 9 点前或晚上 10 点后），heartbeat 会被跳过。时间窗口内的下一次计划 tick 会正常运行。

### 24/7 配置

如果你希望 heartbeat 全天运行，请使用以下任一模式：

- 完全省略 `activeHours`（不限制时间窗口；这是默认行为）。
- 设置全天窗口：`activeHours: { start: "00:00", end: "24:00" }`。

不要将 `start` 和 `end` 设为相同时间（例如 `08:00` 到 `08:00`）。
这会被视为零宽度窗口，因此 heartbeat 会始终被跳过。

### 多账户示例

使用 `accountId` 为 Telegram 等多账户渠道指定特定账户：

```json5
{
  agents: {
    list: [
      {
        id: "ops",
        heartbeat: {
          every: "1h",
          target: "telegram",
          to: "12345678:topic:42", // optional: route to a specific topic/thread
          accountId: "ops-bot",
        },
      },
    ],
  },
  channels: {
    telegram: {
      accounts: {
        "ops-bot": { botToken: "YOUR_TELEGRAM_BOT_TOKEN" },
      },
    },
  },
}
```

### 字段说明

- `every`：heartbeat 间隔（时长字符串；默认单位 = 分钟）。
- `model`：heartbeat 运行的可选模型覆盖（`provider/model`）。
- `includeReasoning`：启用后，当可用时也会传递单独的 `Reasoning:` 消息（与 `/reasoning on` 形式相同）。
- `lightContext`：为 true 时，heartbeat 运行使用轻量级 bootstrap 上下文，并且只保留工作区 bootstrap 文件中的 `HEARTBEAT.md`。
- `isolatedSession`：为 true 时，每次 heartbeat 都会在全新的会话中运行，不带之前的对话历史。使用与 cron `sessionTarget: "isolated"` 相同的隔离模式。可将每次 heartbeat 的 token 成本从约 100K 大幅降低到约 2-5K。与 `lightContext: true` 搭配可实现最大节省。传递路由仍然使用主会话上下文。
- `session`：heartbeat 运行的可选会话键。
  - `main`（默认）：智能体主会话。
  - 显式会话键（可从 `openclaw sessions --json` 或 [sessions CLI](/zh-CN/cli/sessions) 复制）。
  - 会话键格式：参见[会话](/zh-CN/concepts/session)和[群组](/zh-CN/channels/groups)。
- `target`：
  - `last`：发送到最近使用的外部渠道。
  - 显式渠道：任意已配置渠道或插件 id，例如 `discord`、`matrix`、`telegram` 或 `whatsapp`。
  - `none`（默认）：运行 heartbeat，但**不进行**外部发送。
- `directPolicy`：控制直接/私信发送行为：
  - `allow`（默认）：允许直接/私信 heartbeat 发送。
  - `block`：抑制直接/私信发送（`reason=dm-blocked`）。
- `to`：可选收件人覆盖（渠道特定 id，例如 WhatsApp 的 E.164 或 Telegram chat id）。对于 Telegram topic/thread，请使用 `<chatId>:topic:<messageThreadId>`。
- `accountId`：多账户渠道的可选账户 id。当 `target: "last"` 时，如果最近解析出的渠道支持账户，则会应用该账户 id；否则会忽略。如果该账户 id 与解析出的渠道中已配置账户不匹配，则会跳过发送。
- `prompt`：覆盖默认提示词正文（不合并）。
- `ackMaxChars`：`HEARTBEAT_OK` 后允许的最大字符数，超过则发送。
- `suppressToolErrorWarnings`：为 true 时，在 heartbeat 运行期间抑制工具错误警告负载。
- `activeHours`：将 heartbeat 运行限制在某个时间窗口内。对象包含 `start`（HH:MM，含边界；使用 `00:00` 表示一天开始）、`end`（HH:MM，不含边界；`24:00` 可用于一天结束）和可选的 `timezone`。
  - 省略或设为 `"user"`：如果设置了 `agents.defaults.userTimezone`，则使用它；否则回退到主机系统时区。
  - `"local"`：始终使用主机系统时区。
  - 任意 IANA 标识符（例如 `America/New_York`）：直接使用；如果无效，则回退到上面的 `"user"` 行为。
  - `start` 和 `end` 在有效时间窗口中不能相等；相等会被视为零宽度（始终在窗口之外）。
  - 在活跃窗口之外，heartbeat 会被跳过，直到窗口内的下一次 tick。

## 发送行为

- heartbeat 默认在智能体的主会话中运行（`agent:<id>:<mainKey>`），
  或当 `session.scope = "global"` 时使用 `global`。设置 `session` 可覆盖为
  特定渠道会话（Discord/WhatsApp 等）。
- `session` 只影响运行上下文；发送由 `target` 和 `to` 控制。
- 要发送到特定渠道/收件人，请设置 `target` + `to`。使用
  `target: "last"` 时，发送会使用该会话最近的外部渠道。
- heartbeat 默认允许直接/私信目标发送。设置 `directPolicy: "block"` 可抑制直接目标发送，同时仍然执行 heartbeat 轮次。
- 如果主队列繁忙，则 heartbeat 会被跳过并稍后重试。
- 如果 `target` 没有解析到外部目的地，运行仍会发生，但不会
  发送出站消息。
- 如果 `showOk`、`showAlerts` 和 `useIndicator` 全部被禁用，则运行会在一开始就以 `reason=alerts-disabled` 被跳过。
- 如果只禁用了提醒发送，OpenClaw 仍然可以运行 heartbeat、更新时间已到任务的时间戳、恢复会话空闲时间戳，并抑制向外发送的提醒负载。
- 仅由 heartbeat 产生的回复**不会**保持会话活跃；最后的 `updatedAt`
  会被恢复，因此空闲过期行为仍然正常。
- 脱离主会话的[后台任务](/zh-CN/automation/tasks)可以将系统事件加入队列，并在主会话需要尽快注意到某事时唤醒 heartbeat。该唤醒不会使 heartbeat 运行变成后台任务。

## 可见性控制

默认情况下，`HEARTBEAT_OK` 确认会被抑制，而提醒内容会被
发送。你可以按渠道或按账户进行调整：

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false # Hide HEARTBEAT_OK (default)
      showAlerts: true # Show alert messages (default)
      useIndicator: true # Emit indicator events (default)
  telegram:
    heartbeat:
      showOk: true # Show OK acknowledgments on Telegram
  whatsapp:
    accounts:
      work:
        heartbeat:
          showAlerts: false # Suppress alert delivery for this account
```

优先级：每账户 → 每渠道 → 渠道默认值 → 内置默认值。

### 每个标志的作用

- `showOk`：当模型返回仅包含 OK 的回复时，发送 `HEARTBEAT_OK` 确认。
- `showAlerts`：当模型返回非 OK 回复时，发送提醒内容。
- `useIndicator`：为 UI 状态界面发出指示器事件。

如果**这三个值**都为 false，OpenClaw 会完全跳过 heartbeat 运行（不会调用模型）。

### 每渠道与每账户示例

```yaml
channels:
  defaults:
    heartbeat:
      showOk: false
      showAlerts: true
      useIndicator: true
  slack:
    heartbeat:
      showOk: true # all Slack accounts
    accounts:
      ops:
        heartbeat:
          showAlerts: false # suppress alerts for the ops account only
  telegram:
    heartbeat:
      showOk: true
```

### 常见模式

| 目标 | 配置 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| 默认行为（静默 OK，发送提醒） | _(无需配置)_ |
| 完全静默（无消息、无指示器） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: false }` |
| 仅指示器（无消息） | `channels.defaults.heartbeat: { showOk: false, showAlerts: false, useIndicator: true }` |
| 仅在某一个渠道显示 OK | `channels.telegram.heartbeat: { showOk: true }` |

## `HEARTBEAT.md`（可选）

如果工作区中存在 `HEARTBEAT.md` 文件，默认提示词会告诉
智能体读取它。你可以把它看作你的“heartbeat 检查清单”：内容简短、稳定，
并且适合每 30 分钟都被加入一次。

在普通运行中，只有当默认智能体启用了 heartbeat 指引时，
才会注入 `HEARTBEAT.md`。如果将 heartbeat 频率设为 `0m` 禁用，或
设置 `includeSystemPromptSection: false`，它就会从普通 bootstrap
上下文中省略。

如果 `HEARTBEAT.md` 存在，但实际上为空（只有空行和 markdown
标题，如 `# Heading`），OpenClaw 会跳过 heartbeat 运行以节省 API 调用。
该跳过会被报告为 `reason=empty-heartbeat-file`。
如果文件缺失，heartbeat 仍会运行，并由模型决定要做什么。

请保持它足够简短（简要检查清单或提醒），以避免提示词膨胀。

示例 `HEARTBEAT.md`：

```md
# Heartbeat checklist

- Quick scan: anything urgent in inboxes?
- If it’s daytime, do a lightweight check-in if nothing else is pending.
- If a task is blocked, write down _what is missing_ and ask Peter next time.
```

### `tasks:` 块

`HEARTBEAT.md` 还支持一个小型结构化 `tasks:` 块，用于在 heartbeat 内部
执行基于间隔的检查。

示例：

```md
tasks:

- name: inbox-triage
  interval: 30m
  prompt: "Check for urgent unread emails and flag anything time sensitive."
- name: calendar-scan
  interval: 2h
  prompt: "Check for upcoming meetings that need prep or follow-up."

# Additional instructions

- Keep alerts short.
- If nothing needs attention after all due tasks, reply HEARTBEAT_OK.
```

行为：

- OpenClaw 会解析 `tasks:` 块，并根据每个任务自己的 `interval` 进行检查。
- 只有**到期**任务才会被包含进本次 tick 的 heartbeat 提示词中。
- 如果没有任务到期，heartbeat 会被完全跳过（`reason=no-tasks-due`），以避免浪费一次模型调用。
- `HEARTBEAT.md` 中的非任务内容会被保留，并作为附加上下文追加在到期任务列表之后。
- 任务的上次运行时间戳会存储在会话状态（`heartbeatTaskState`）中，因此普通重启后间隔仍可延续。
- 只有当 heartbeat 运行走完正常回复路径后，任务时间戳才会前进。被跳过的 `empty-heartbeat-file` / `no-tasks-due` 运行不会将任务标记为已完成。

当你希望用一个 heartbeat 文件容纳多个周期性检查，但又不想在每次 tick 中为所有检查都付费时，任务模式会很有用。

### 智能体可以更新 `HEARTBEAT.md` 吗？

可以——如果你要求它这么做。

`HEARTBEAT.md` 只是智能体工作区中的一个普通文件，因此你可以在
普通聊天中告诉智能体，例如：

- “更新 `HEARTBEAT.md`，加入每日检查日历的内容。”
- “重写 `HEARTBEAT.md`，让它更短，并专注于收件箱跟进。”

如果你希望它主动这样做，也可以在
heartbeat 提示词中加入一行明确说明，例如：“如果检查清单已经过时，请更新 HEARTBEAT.md
为更好的版本。”

安全说明：不要把密钥（API key、电话号码、私有 token）放进
`HEARTBEAT.md`——它会成为提示词上下文的一部分。

## 手动唤醒（按需）

你可以通过以下命令将系统事件加入队列，并立即触发 heartbeat：

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
```

如果有多个智能体配置了 `heartbeat`，手动唤醒会立即运行这些
智能体的 heartbeat。

使用 `--mode next-heartbeat` 可等待下一次计划 tick。

## reasoning 传递（可选）

默认情况下，heartbeat 只传递最终的“answer”负载。

如果你希望提高透明度，请启用：

- `agents.defaults.heartbeat.includeReasoning: true`

启用后，heartbeat 还会额外传递一条以
`Reasoning:` 为前缀的消息（与 `/reasoning on` 形式相同）。这在智能体
管理多个会话/codex 时尤其有用，你可以看到它为什么决定提醒
你——但这也可能泄露比你希望更多的内部细节。在群聊中最好保持关闭。

## 成本意识

Heartbeat 会运行完整的智能体轮次。间隔越短，消耗的 token 越多。要降低成本：

- 使用 `isolatedSession: true`，避免发送完整对话历史（每次运行约从 100K token 降到约 2-5K）。
- 使用 `lightContext: true`，将 bootstrap 文件限制为只有 `HEARTBEAT.md`。
- 设置更便宜的 `model`（例如 `ollama/llama3.2:1b`）。
- 保持 `HEARTBEAT.md` 简短。
- 如果你只想更新内部状态，使用 `target: "none"`。

## 相关内容

- [自动化与任务](/zh-CN/automation) — 所有自动化机制总览
- [后台任务](/zh-CN/automation/tasks) — 脱离主会话的工作如何被跟踪
- [时区](/zh-CN/concepts/timezone) — 时区如何影响 heartbeat 调度
- [故障排除](/zh-CN/automation/cron-jobs#troubleshooting) — 调试自动化问题
