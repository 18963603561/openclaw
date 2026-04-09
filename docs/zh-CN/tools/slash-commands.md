---
read_when:
    - 使用或配置聊天命令
    - 调试命令路由或权限
summary: Slash commands：文本命令与原生命令、配置及支持的命令
title: Slash Commands
x-i18n:
    generated_at: "2026-04-09T01:01:29Z"
    model: gpt-5.4
    provider: openai
    source_hash: 417e35b9ddd87f25f6c019111b55b741046ea11039dde89210948185ced5696d
    source_path: tools\slash-commands.md
    workflow: 15
---

# Slash Commands

命令由 Gateway 网关处理。大多数命令必须作为**独立**消息发送，并且以 `/` 开头。
仅限主机的 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 是它的别名）。

这里有两个相关系统：

- **命令**：独立的 `/...` 消息。
- **指令**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 指令会在模型看到消息前被剥离。
  - 在普通聊天消息中（不是纯指令消息），它们会被当作“内联提示”，并且**不会**持久化会话设置。
  - 在纯指令消息中（消息只包含指令），它们会持久化到会话，并回复确认信息。
  - 指令仅对**已授权发送者**生效。如果设置了 `commands.allowFrom`，它就是唯一使用的允许列表；否则，授权来自渠道允许列表 / 配对以及 `commands.useAccessGroups`。
    未授权发送者看到的指令会被当作普通文本处理。

还有少量**内联快捷方式**（仅限允许列表 / 已授权发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即运行，在模型看到消息之前被剥离，剩余文本继续走正常流程。

## 配置

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认 `true`）启用在聊天消息中解析 `/...`。
  - 在没有原生命令的界面上（WhatsApp / WebChat / Signal / iMessage / Google Chat / Microsoft Teams），即使你将其设为 `false`，文本命令仍然可用。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - 自动：在 Discord / Telegram 上开启；在 Slack 上关闭（直到你添加 slash commands）；对不支持原生命令的提供商会被忽略。
  - 可设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 来按提供商覆盖（布尔值或 `"auto"`）。
  - `false` 会在启动时清除此前已在 Discord / Telegram 上注册的命令。Slack 命令由 Slack 应用管理，不会自动删除。
- `commands.nativeSkills`（默认 `"auto"`）在支持时原生注册 **Skill** 命令。
  - 自动：在 Discord / Telegram 上开启；在 Slack 上关闭（Slack 需要为每个 Skill 单独创建一个 slash command）。
  - 可设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 来按提供商覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 来运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 在切换到后台模式前等待多久（`0` 表示立即放到后台）。
- `commands.config`（默认 `false`）启用 `/config`（读取 / 写入 `openclaw.json`）。
- `commands.mcp`（默认 `false`）启用 `/mcp`（读取 / 写入 `mcp.servers` 下由 OpenClaw 管理的 MCP 配置）。
- `commands.plugins`（默认 `false`）启用 `/plugins`（插件发现 / 状态，以及安装 + 启用 / 禁用控制）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom`（可选）为命令授权设置按提供商划分的允许列表。配置后，它会成为命令和指令的唯一授权来源（渠道允许列表 / 配对及 `commands.useAccessGroups` 会被忽略）。使用 `"*"` 表示全局默认值；按提供商设置的键会覆盖它。
- `commands.useAccessGroups`（默认 `true`）在未设置 `commands.allowFrom` 时，对命令强制执行允许列表 / 策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/tools [compact|verbose]`（显示当前智能体此刻可用的工具；`verbose` 会添加说明）
- `/skill <name> [input]`（按名称运行一个 Skill）
- `/status`（显示当前状态；可用时包含当前模型提供商的 provider 使用量 / 配额）
- `/tasks`（列出当前会话的后台任务；显示活动任务和最近任务详情，并带有智能体本地回退计数）
- `/allowlist`（列出 / 添加 / 删除允许列表条目）
- `/approve <id> <decision>`（处理 exec 审批提示；可用决策请使用待处理审批消息中的内容）
- `/context [list|detail|json]`（解释“上下文”；`detail` 会显示按文件 + 按工具 + 按 Skill + 系统提示大小的明细）
- `/btw <question>`（针对当前会话提出一个临时侧边问题，而不改变未来会话上下文；参见 [/tools/btw](/zh-CN/tools/btw)）
- `/export-session [path]`（别名：`/export`）（将当前会话导出为带完整系统提示的 HTML）
- `/whoami`（显示你的发送者 id；别名：`/id`）
- `/session idle <duration|off>`（管理聚焦线程绑定的空闲自动取消聚焦）
- `/session max-age <duration|off>`（管理聚焦线程绑定的硬性最长存活时间自动取消聚焦）
- `/subagents list|kill|log|info|send|steer|spawn`（检查、控制或为当前会话启动子智能体运行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（检查并控制 ACP 运行时会话）
- `/agents`（列出此会话中绑定到线程的智能体）
- `/focus <target>`（Discord：将此线程或一个新线程绑定到某个会话 / 子智能体目标）
- `/unfocus`（Discord：移除当前线程绑定）
- `/kill <id|#|all>`（立即中止此会话中一个或所有正在运行的子智能体；无确认消息）
- `/steer <id|#> <message>`（立即引导一个运行中的子智能体：如果可能则在运行内生效，否则中止当前工作并用引导消息重新启动）
- `/tell <id|#> <message>`（`/steer` 的别名）
- `/config show|get|set|unset`（将配置持久化到磁盘，仅所有者；需要 `commands.config: true`）
- `/mcp show|get|set|unset`（管理 OpenClaw MCP 服务器配置，仅所有者；需要 `commands.mcp: true`）
- `/plugins list|show|get|install|enable|disable`（检查已发现插件、安装新插件并切换启用状态；写操作仅所有者可用；需要 `commands.plugins: true`）
  - `/plugin` 是 `/plugins` 的别名。
  - `/plugin install <spec>` 接受与 `openclaw plugins install` 相同的插件描述：本地路径 / 归档、npm 包或 `clawhub:<pkg>`。
  - 启用 / 禁用写操作仍会回复重启提示。在带监听的前台 Gateway 网关上，OpenClaw 可能会在写入后自动执行重启。
- `/debug show|set|unset|reset`（运行时覆盖，仅所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每次响应的 usage 页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；参见 [/tts](/zh-CN/tools/tts)）
  - Discord：原生命令是 `/voice`（Discord 保留 `/tts`）；文本 `/tts` 仍可用。
- `/stop`
- `/restart`
- `/dock-telegram`（别名：`/dock_telegram`）（将回复切换到 Telegram）
- `/dock-discord`（别名：`/dock_discord`）（将回复切换到 Discord）
- `/dock-slack`（别名：`/dock_slack`）（将回复切换到 Slack）
- `/activation mention|always`（仅群组）
- `/send on|off|inherit`（仅所有者）
- `/reset` 或 `/new [model]`（可选模型提示；其余内容会透传）
- `/think <off|minimal|low|medium|high|xhigh>`（按模型 / 提供商动态提供选项；别名：`/thinking`、`/t`）
- `/fast status|on|off`（省略参数时显示当前实际 fast mode 状态）
- `/verbose on|full|off`（别名：`/v`）
- `/reasoning on|off|stream`（别名：`/reason`；开启时会发送一条以 `Reasoning:` 开头的单独消息；`stream` = 仅 Telegram 草稿）
- `/elevated on|off|ask|full`（别名：`/elev`；`full` 会跳过 exec 审批）
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（发送 `/exec` 可查看当前设置）
- `/model <name>`（别名：`/models`；或使用 `agents.defaults.models.*.alias` 中的 `/<alias>`）
- `/queue <mode>`（加上 `debounce:2s cap:25 drop:summarize` 这类选项；发送 `/queue` 查看当前设置）
- `/bash <command>`（仅限主机；`! <command>` 的别名；需要 `commands.bash: true` + `tools.elevated` 允许列表）
- `/dreaming [on|off|status|help]`（切换全局 dreaming 或显示状态；参见 [Dreaming](/zh-CN/concepts/dreaming)）

仅文本：

- `/compact [instructions]`（参见 [/concepts/compaction](/zh-CN/concepts/compaction)）
- `! <command>`（仅限主机；一次一个；长时间任务请使用 `!poll` + `!stop`）
- `!poll`（检查输出 / 状态；接受可选 `sessionId`；`/bash poll` 也可用）
- `!stop`（停止正在运行的 bash 任务；接受可选 `sessionId`；`/bash stop` 也可用）

说明：

- 命令支持在命令和参数之间添加可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受 model alias、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配项，则文本会被当作消息正文。
- 要查看完整的 provider 使用量细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true`，并遵守渠道 `configWrites`。
- 在多账号渠道中，面向配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵守目标账号的 `configWrites`。
- `/usage` 控制每次响应的 usage 页脚；`/usage cost` 会从 OpenClaw 会话日志中打印本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 可禁用它。
- 仅 Discord 的原生命令：`/vc join|leave|status` 用于控制语音频道（需要 `channels.discord.voice` 和原生命令；不提供文本形式）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）要求实际启用了线程绑定（`session.threadBindings.enabled` 和 / 或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：参见 [ACP Agents](/zh-CN/tools/acp-agents)。
- `/verbose` 主要用于调试和额外可见性；正常使用时请保持**关闭**。
- `/fast on|off` 会持久化一个会话覆盖值。使用 Sessions UI 的 `inherit` 选项可清除它，并回退到配置默认值。
- `/fast` 具有提供商特定行为：OpenAI / OpenAI Codex 会将其映射到原生 Responses 端点上的 `service_tier=priority`，而直连公共 Anthropic 请求，包括发往 `api.anthropic.com` 的 OAuth 认证流量，会将其映射到 `service_tier=auto` 或 `standard_only`。参见 [OpenAI](/zh-CN/providers/openai) 和 [Anthropic](/zh-CN/providers/anthropic)。
- 工具失败摘要在相关时仍会显示，但详细失败文本只有在 `/verbose` 为 `on` 或 `full` 时才会包含。
- `/reasoning`（以及 `/verbose`）在群组环境中有风险：它们可能暴露你原本不打算公开的内部推理或工具输出。尤其在群聊中，建议保持关闭。
- `/model` 会立即持久化新的会话模型。
- 如果智能体处于空闲状态，下一次运行会立即使用它。
- 如果当前已有运行处于活动状态，OpenClaw 会将实时切换标记为待处理，并只会在一个干净的重试点切换到新模型。
- 如果工具活动或回复输出已经开始，则待处理切换可能会一直排队到后续重试机会或下一次用户轮次。
- **快速路径：** 来自允许列表发送者的纯命令消息会被立即处理（绕过队列 + 模型）。
- **群组 mention 门控：** 来自允许列表发送者的纯命令消息会绕过 mention 要求。
- **内联快捷方式（仅限允许列表发送者）：** 某些命令在嵌入普通消息时也可用，并会在模型看到剩余文本前被剥离。
  - 示例：`hey /status` 会触发一条状态回复，而剩余文本会继续走正常流程。
- 当前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息会被静默忽略，而内联 `/...` token 会被当作普通文本。
- **Skill 命令：** `user-invocable` Skills 会作为 slash commands 暴露。名称会被规范化为 `a-z0-9_`（最多 32 个字符）；冲突时会添加数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行一个 Skill（当原生命令数量限制阻止为每个 Skill 单独创建命令时很有用）。
  - 默认情况下，Skill 命令会作为普通请求转发给模型。
  - Skills 可选声明 `command-dispatch: tool`，以便将命令直接路由到工具（确定性、无模型）。
  - 示例：`/prose`（OpenProse 插件）——参见 [OpenProse](/zh-CN/prose)。
- **原生命令参数：** Discord 对动态选项使用自动补全（当你省略必填参数时也会显示按钮菜单）。Telegram 和 Slack 会在命令支持选项且你省略参数时显示按钮菜单。

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：**当前这个智能体在这次对话中现在能使用什么**。

- 默认 `/tools` 为紧凑模式，适合快速浏览。
- `/tools verbose` 会添加简短说明。
- 支持参数的原生命令界面也会暴露相同的 `compact|verbose` 模式切换。
- 结果是按会话划分的，因此更改智能体、渠道、线程、发送者授权或模型都可能改变输出。
- `/tools` 包含在运行时真正可达的工具，包括核心工具、已连接的插件工具和归属于渠道的工具。

对于配置文件和覆盖项编辑，请使用 Control UI 的工具面板或配置 / 目录界面，而不要把 `/tools` 当作静态目录。

## Usage 展示界面（各处显示什么）

- **Provider 使用量 / 配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时显示在 `/status` 中，针对当前模型提供商展示。OpenClaw 会将 provider 窗口统一归一化为“剩余百分比”；对 MiniMax 来说，只有剩余值的百分比字段会在显示前被取反，而 `model_remains` 响应会优先选择 chat-model 条目以及带模型标签的方案标签。
- 当实时会话快照较稀疏时，`/status` 中的 **token / cache 行** 可以回退到最近的转录使用量条目。已有的非零实时值仍然优先，而转录回退还可以在已存总量缺失或偏小时恢复当前运行时模型标签以及更大的、偏向 prompt 的总量。
- **每次响应的 token / 成本** 由 `/usage off|tokens|full` 控制（附加到普通回复后）。
- `/model status` 关注的是**模型 / 认证 / 端点**，而不是使用量。

## 模型选择（`/model`）

`/model` 作为一个指令实现。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

说明：

- `/model` 和 `/model list` 会显示一个紧凑的编号选择器（模型家族 + 可用 provider）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含 provider 和 model 下拉框以及提交步骤。
- `/model <#>` 会从该选择器中选择（并在可能时优先当前 provider）。
- `/model status` 会显示详细视图，包括已配置的 provider 端点（`baseUrl`）以及可用时的 API 模式（`api`）。

## 调试覆盖项

`/debug` 允许你设置**仅运行时**的配置覆盖项（存于内存，不写盘）。仅所有者可用。默认关闭；使用 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

说明：

- 覆盖项会立即应用到新的配置读取，但**不会**写入 `openclaw.json`。
- 使用 `/debug reset` 可清除所有覆盖项，并恢复到磁盘上的配置。

## 配置更新

`/config` 会写入磁盘上的配置（`openclaw.json`）。仅所有者可用。默认关闭；使用 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

说明：

- 写入前会校验配置；无效更改会被拒绝。
- `/config` 更新会跨重启持久保存。

## MCP 更新

`/mcp` 会将 OpenClaw 管理的 MCP 服务器定义写入 `mcp.servers`。仅所有者可用。默认关闭；使用 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

说明：

- `/mcp` 将配置存储在 OpenClaw 配置中，而不是 Pi 所拥有的项目设置中。
- 运行时适配器决定哪些传输实际上可执行。

## 插件更新

`/plugins` 让操作者可以检查已发现的插件并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认关闭；使用 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

说明：

- `/plugins list` 和 `/plugins show` 会针对当前工作区和磁盘配置执行真实的插件发现。
- `/plugins enable|disable` 只更新插件配置；不会安装或卸载插件。
- 启用 / 禁用变更后，需要重启 gateway 才会生效。

## 界面说明

- **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组有各自会话）。
- **原生命令** 使用隔离会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 指向聊天会话）
- **`/stop`** 作用于当前活动聊天会话，以便中止当前运行。
- **Slack：** `channels.slack.slashCommand` 仍支持单个 `/openclaw` 风格命令。如果你启用 `commands.native`，则必须为每个内置命令在 Slack 中单独创建一个 slash command（名称与 `/help` 等相同）。Slack 的命令参数菜单会作为临时 Block Kit 按钮发送。
  - Slack 原生例外：请注册 `/agentstatus`（而不是 `/status`），因为 Slack 保留 `/status`。文本 `/status` 在 Slack 消息中仍然可用。

## BTW 侧边问题

`/btw` 是一个关于当前会话的快速**侧边问题**。

与普通聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为一次独立的**无工具**单次调用运行，
- 它不会改变未来的会话上下文，
- 它不会写入转录历史，
- 它会作为实时侧边结果而不是普通助手消息进行传递。

这使得 `/btw` 很适合在主任务继续进行时获取一个临时澄清。

示例：

```text
/btw what are we doing right now?
```

完整行为和客户端 UX 细节，请参见 [BTW 侧边问题](/zh-CN/tools/btw)。
