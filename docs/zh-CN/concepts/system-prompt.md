---
read_when:
    - 编辑系统提示词文本、工具列表或时间/心跳部分
    - 更改工作区 bootstrap 或 Skills 注入行为
summary: OpenClaw 系统提示词包含哪些内容，以及它是如何组装的
title: 系统提示词
x-i18n:
    generated_at: "2026-04-08T04:06:20Z"
    model: gpt-5.4
    provider: openai
    source_hash: e55fc886bc8ec47584d07c9e60dfacd964dc69c7db976ea373877dc4fe09a79a
    source_path: concepts\system-prompt.md
    workflow: 15
---

# 系统提示词

OpenClaw 会为每次智能体运行构建一个自定义系统提示词。该提示词由 **OpenClaw 持有**，不会使用 pi-coding-agent 的默认提示词。

提示词由 OpenClaw 组装，并注入到每次智能体运行中。

提供商插件可以贡献具备缓存感知能力的提示词指导，而无需替换完整的 OpenClaw 自有提示词。提供商运行时可以：

- 替换一小组具名核心部分（`interaction_style`、`tool_call_style`、`execution_bias`）
- 在提示词缓存边界之上注入一个**稳定前缀**
- 在提示词缓存边界之下注入一个**动态后缀**

对于特定模型家族的调优，请使用提供商持有的贡献方式。保留旧版 `before_prompt_build` 提示词变更机制，用于兼容性场景或真正的全局提示词变更，而不是普通提供商行为。

## 结构

该提示词有意保持紧凑，并使用固定部分：

- **工具**：结构化工具的事实来源提醒，以及运行时工具使用指导。
- **安全**：简短的护栏提醒，用于避免权力寻求行为或绕过监督。
- **Skills**（可用时）：告诉模型如何按需加载 Skill 指令。
- **OpenClaw 自更新**：如何安全地使用 `config.schema.lookup` 检查配置、使用 `config.patch` 修补配置、使用 `config.apply` 替换完整配置，以及仅在用户明确请求时运行 `update.run`。仅限所有者使用的 `gateway` 工具也会拒绝重写 `tools.exec.ask` / `tools.exec.security`，包括那些会被标准化到这些受保护 exec 路径的旧版 `tools.bash.*` 别名。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **文档**：OpenClaw 文档的本地路径（仓库或 npm 包）以及何时读取它们。
- **工作区文件（已注入）**：表示下方已包含 bootstrap 文件。
- **沙箱**（启用时）：表示当前是沙箱隔离运行时、沙箱路径，以及是否可用提权 exec。
- **当前日期和时间**：用户本地时间、时区和时间格式。
- **回复标签**：受支持提供商可选的回复标签语法。
- **心跳**：心跳提示词和确认行为，当默认智能体启用了心跳时显示。
- **运行时**：主机、操作系统、node、模型、仓库根目录（检测到时）、思考级别（一行）。
- **推理**：当前可见性级别 + `/reasoning` 切换提示。

“工具”部分还包括针对长时间运行工作的运行时指导：

- 对于未来跟进（“稍后再查看”、提醒、周期性工作），请使用 cron，而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复的 `process` 轮询
- 仅将 `exec` / `process` 用于那些立即启动并会在后台持续运行的命令
- 当启用了自动完成唤醒时，只启动命令一次，并依赖它在产出输出或失败时的基于推送的唤醒路径
- 当你需要检查正在运行命令的日志、状态、输入或进行干预时，请使用 `process`
- 如果任务更大，优先使用 `sessions_spawn`；子智能体完成采用基于推送的方式，并会自动向请求者公告
- 不要为了等待完成而循环轮询 `subagents list` / `sessions_list`

当启用实验性的 `update_plan` 工具时，“工具”部分还会告诉模型：仅将其用于非平凡的多步骤工作，始终只保留一个 `in_progress` 步骤，并避免在每次更新后重复整个计划。

系统提示词中的安全护栏属于建议性内容。它们会引导模型行为，但不会强制执行策略。若需要硬性执行，请使用工具策略、exec 审批、沙箱隔离和渠道允许列表；运维人员按设计可以禁用这些机制。

在具有原生审批卡片/按钮的渠道上，运行时提示词现在会告知智能体优先依赖该原生审批 UI。只有当工具结果表明聊天审批不可用，或手动审批是唯一途径时，它才应包含手动 `/approve` 命令。

## 提示词模式

OpenClaw 可以为子智能体渲染更小的系统提示词。运行时会为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：包含上述所有部分。
- `minimal`：用于子智能体；省略 **Skills**、**记忆回忆**、**OpenClaw 自更新**、**模型别名**、**用户身份**、**回复标签**、**消息传递**、**静默回复** 和 **心跳**。工具、**安全**、工作区、沙箱、当前日期和时间（已知时）、运行时和注入上下文仍然可用。
- `none`：只返回基础身份行。

当 `promptMode=minimal` 时，额外注入的提示词会标记为 **子智能体上下文**，而不是 **群聊上下文**。

## 工作区 bootstrap 注入

Bootstrap 文件会被裁剪并附加在 **项目上下文** 下，从而让模型无需显式读取即可看到身份和配置档案上下文：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`（仅在全新工作区中）
- 存在时使用 `MEMORY.md`，否则回退为小写的 `memory.md`

除非某个文件有特定门控条件，否则上述所有文件都会在每一轮中**注入到上下文窗口**。当默认智能体禁用心跳，或者 `agents.defaults.heartbeat.includeSystemPromptSection` 为 false 时，普通运行会省略 `HEARTBEAT.md`。请保持注入文件简洁，尤其是 `MEMORY.md`，它会随着时间增长，并可能导致上下文使用量意外升高以及更频繁的压缩。

> **注意：** `memory/*.md` 每日文件**不会**被自动注入。它们按需通过 `memory_search` 和 `memory_get` 工具访问，因此除非模型显式读取它们，否则不会占用上下文窗口。

大文件会以标记形式截断。每个文件的最大大小由 `agents.defaults.bootstrapMaxChars` 控制（默认：20000）。跨文件注入的 bootstrap 内容总量由 `agents.defaults.bootstrapTotalMaxChars` 限制（默认：150000）。缺失文件会注入一个简短的缺失文件标记。发生截断时，OpenClaw 可以在项目上下文中注入一个警告块；可通过 `agents.defaults.bootstrapPromptTruncationWarning` 控制（`off`、`once`、`always`；默认：`once`）。

子智能体会话只会注入 `AGENTS.md` 和 `TOOLS.md`（其他 bootstrap 文件会被过滤掉，以保持子智能体上下文较小）。

内部 hook 可以通过 `agent:bootstrap` 拦截该步骤，以变更或替换注入的 bootstrap 文件（例如用替代 persona 替换 `SOUL.md`）。

如果你想让智能体听起来不那么通用，可以先从 [SOUL.md Personality Guide](/zh-CN/concepts/soul) 开始。

如果你想检查每个注入文件贡献了多少内容（原始值与注入值、截断情况，以及工具 schema 开销），请使用 `/context list` 或 `/context detail`。参见 [Context](/zh-CN/concepts/context)。

## 时间处理

当用户时区已知时，系统提示词会包含一个专门的**当前日期和时间**部分。为了保持提示词缓存稳定，它现在只包含**时区**（不包含动态时钟或时间格式）。

当智能体需要当前时间时，请使用 `session_status`；状态卡片包含一行时间戳。该工具也可以选择设置按会话模型覆盖（`model=default` 可清除此覆盖）。

可通过以下配置：

- `agents.defaults.userTimezone`
- `agents.defaults.timeFormat`（`auto` | `12` | `24`）

完整行为细节请参见 [日期和时间](/zh-CN/date-time)。

## Skills

当存在符合条件的 Skills 时，OpenClaw 会注入一个紧凑的**可用 Skills 列表**（`formatSkillsForPrompt`），其中包含每个 Skill 的**文件路径**。提示词会指示模型使用 `read` 去加载列出位置中的 `SKILL.md`（工作区、托管或内置）。如果没有符合条件的 Skill，则会省略 Skills 部分。

资格条件包括 Skill 元数据门控、运行时环境/配置检查，以及在配置了 `agents.defaults.skills` 或 `agents.list[].skills` 时的有效智能体 Skill 允许列表。

```
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这样既能保持基础提示词较小，又能支持有针对性的 Skill 使用。

## 文档

在可用时，系统提示词会包含一个**文档**部分，指向本地 OpenClaw 文档目录（仓库工作区中的 `docs/` 或内置的 npm 包文档），并同时注明公开镜像、源代码仓库、社区 Discord，以及用于发现 Skills 的 ClawHub（[https://clawhub.ai](https://clawhub.ai)）。提示词会指示模型在涉及 OpenClaw 行为、命令、配置或架构时优先查阅本地文档，并在可能时自行运行 `openclaw status`（只有在它无法访问时才询问用户）。
