---
read_when:
    - 你想理解 OpenClaw 中 “上下文” 的含义
    - 你正在调试为什么模型“知道”某些事（或忘记了它）
    - 你想减少上下文开销（`/context`、`/status`、`/compact`）
summary: 上下文：模型能看到什么、它如何构建，以及如何检查它
title: 上下文
x-i18n:
    generated_at: "2026-04-08T03:59:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: a75b4cd65bf6385d46265b9ce1643310bc99d220e35ec4b4924096bed3ca4aa0
    source_path: concepts\context.md
    workflow: 15
---

# 上下文

“上下文”是指 **OpenClaw 在一次运行中发送给模型的全部内容**。它受模型的**上下文窗口**（token 限制）约束。

适合初学者的理解方式：

- **System prompt**（由 OpenClaw 构建）：规则、工具、Skills 列表、时间 / 运行时信息，以及注入的工作区文件。
- **对话历史**：你在此会话中的消息 + 助手的消息。
- **工具调用 / 结果 + 附件**：命令输出、文件读取、图片 / 音频等。

上下文与“memory”_不是同一件事_：memory 可以存储在磁盘上并在之后重新加载；上下文则是当前位于模型窗口内部的内容。

## 快速开始（检查上下文）

- `/status` → 快速查看“我的窗口用了多少？”以及会话设置。
- `/context list` → 查看注入了什么 + 粗略大小（按文件和总计）。
- `/context detail` → 更深入的拆分：按文件、按工具 schema 大小、按 skill 条目大小，以及 system prompt 大小。
- `/usage tokens` → 在普通回复后附加每次回复的用量页脚。
- `/compact` → 将较早的历史总结为一条紧凑记录，以释放窗口空间。

另请参阅：[Slash commands](/tools/slash-commands)、[Token 用量与成本](/reference/token-use)、[Compaction](/zh-CN/concepts/compaction)。

## 输出示例

具体数值会因模型、提供商、工具策略以及你的工作区内容而异。

### `/context list`

```
🧠 Context breakdown
Workspace: <workspaceDir>
Bootstrap max/file: 20,000 chars
Sandbox: mode=non-main sandboxed=false
System prompt (run): 38,412 chars (~9,603 tok) (Project Context 23,901 chars (~5,976 tok))

Injected workspace files:
- AGENTS.md: OK | raw 1,742 chars (~436 tok) | injected 1,742 chars (~436 tok)
- SOUL.md: OK | raw 912 chars (~228 tok) | injected 912 chars (~228 tok)
- TOOLS.md: TRUNCATED | raw 54,210 chars (~13,553 tok) | injected 20,962 chars (~5,241 tok)
- IDENTITY.md: OK | raw 211 chars (~53 tok) | injected 211 chars (~53 tok)
- USER.md: OK | raw 388 chars (~97 tok) | injected 388 chars (~97 tok)
- HEARTBEAT.md: MISSING | raw 0 | injected 0
- BOOTSTRAP.md: OK | raw 0 chars (~0 tok) | injected 0 chars (~0 tok)

Skills list (system prompt text): 2,184 chars (~546 tok) (12 skills)
Tools: read, edit, write, exec, process, browser, message, sessions_send, …
Tool list (system prompt text): 1,032 chars (~258 tok)
Tool schemas (JSON): 31,988 chars (~7,997 tok) (counts toward context; not shown as text)
Tools: (same as above)

Session tokens (cached): 14,250 total / ctx=32,000
```

### `/context detail`

```
🧠 Context breakdown (detailed)
…
Top skills (prompt entry size):
- frontend-design: 412 chars (~103 tok)
- oracle: 401 chars (~101 tok)
… (+10 more skills)

Top tools (schema size):
- browser: 9,812 chars (~2,453 tok)
- exec: 6,240 chars (~1,560 tok)
… (+N more tools)
```

## 哪些内容会计入上下文窗口

模型接收到的所有内容都会计入，包括：

- System prompt（全部章节）。
- 对话历史。
- 工具调用 + 工具结果。
- 附件 / 转录内容（图片 / 音频 / 文件）。
- Compaction 摘要和 pruning 产物。
- 提供商的“包装层”或隐藏头部（你看不到，但仍会计入）。

## OpenClaw 如何构建 system prompt

System prompt **由 OpenClaw 持有**，并会在每次运行时重新构建。它包括：

- 工具列表 + 简短说明。
- Skills 列表（仅元数据；见下文）。
- 工作区位置。
- 时间（UTC + 如果已配置，则包含转换后的用户时间）。
- 运行时元数据（主机 / 操作系统 / 模型 / thinking）。
- 在 **Project Context** 下注入的工作区 bootstrap 文件。

完整拆分请参阅：[System Prompt](/concepts/system-prompt)。

## 注入的工作区文件（Project Context）

默认情况下，OpenClaw 会注入一组固定的工作区文件（如果存在）：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅首次运行）

大型文件会按文件使用 `agents.defaults.bootstrapMaxChars`（默认 `20000` 字符）进行截断。OpenClaw 还会通过 `agents.defaults.bootstrapTotalMaxChars`（默认 `150000` 字符）对所有文件的 bootstrap 注入总量施加上限。`/context` 会显示**原始大小与注入大小**，以及是否发生了截断。

发生截断时，运行时可在 Project Context 下方的提示词中注入一段警告块。可通过 `agents.defaults.bootstrapPromptTruncationWarning` 进行配置（`off`、`once`、`always`；默认 `once`）。

## Skills：注入的内容与按需加载的内容

System prompt 会包含一个紧凑的 **Skills 列表**（名称 + 描述 + 位置）。这部分有真实开销。

默认情况下，skill 指令_不会_被包含。模型应仅在需要时，通过 `read` 去读取该 skill 的 `SKILL.md`。

## 工具：有两类成本

工具会通过两种方式影响上下文：

1. System prompt 中的**工具列表文本**（也就是你看到的 “Tooling”）。
2. **工具 schemas**（JSON）。这些会发送给模型，以便它能够调用工具。即使你看不到它们的纯文本形式，它们仍会计入上下文。

`/context detail` 会拆分出最大的工具 schema，以便你查看主要开销来源。

## 命令、指令与“内联快捷方式”

Slash 命令由 Gateway 网关处理。它们有几种不同的行为：

- **独立命令**：一条只包含 `/...` 的消息会作为命令执行。
- **指令**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/model`、`/queue` 会在模型看到消息之前被剥离。
  - 仅包含指令的消息会持久化会话设置。
  - 普通消息中的内联指令会作为逐消息提示。
- **内联快捷方式**（仅限 allowlisted 发送者）：普通消息中的某些 `/...` 令牌可以立即执行（例如：“hey /status”），并会在模型看到剩余文本前被剥离。

详情请参阅：[Slash commands](/tools/slash-commands)。

## 会话、compaction 与 pruning（哪些会持久存在）

哪些内容会在多条消息之间持久存在，取决于机制：

- **普通历史** 会保存在会话记录中，直到按策略被 compacted / pruned。
- **Compaction** 会把摘要持久化到记录中，并保留最近的消息。
- **Pruning** 会从某次运行的_内存中_提示词里移除旧工具结果，但不会重写记录。

文档参见：[会话](/concepts/session)、[Compaction](/zh-CN/concepts/compaction)、[会话裁剪](/concepts/session-pruning)。

默认情况下，OpenClaw 使用内置的 `legacy` 上下文引擎来进行组装和
compaction。如果你安装了一个提供 `kind: "context-engine"` 的插件，并通过
`plugins.slots.contextEngine` 选中它，OpenClaw 就会把上下文组装、
`/compact` 以及相关子智能体上下文生命周期 hooks 委托给该
引擎。`ownsCompaction: false` 不会自动回退到 legacy
引擎；当前激活的引擎仍必须正确实现 `compact()`。完整的
可插拔接口、生命周期 hooks 和配置请参阅
[Context Engine](/zh-CN/concepts/context-engine)。

## `/context` 实际上报告的是什么

在可用时，`/context` 会优先使用最近一次**运行时构建的** system prompt 报告：

- `System prompt (run)` = 从最近一次嵌入式（具备工具能力）运行中捕获，并持久化在会话存储中。
- `System prompt (estimate)` = 当不存在运行报告时（或通过不会生成该报告的 CLI 后端运行时），按需即时计算。

无论哪种方式，它都会报告大小和主要贡献项；它**不会**输出完整的 system prompt 或工具 schemas。

## 相关内容

- [Context Engine](/zh-CN/concepts/context-engine) — 通过插件进行自定义上下文注入
- [Compaction](/zh-CN/concepts/compaction) — 总结长对话
- [System Prompt](/concepts/system-prompt) — system prompt 如何构建
- [智能体循环](/zh-CN/concepts/agent-loop) — 完整的智能体执行周期
