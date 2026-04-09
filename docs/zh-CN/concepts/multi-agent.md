---
read_when: You want multiple isolated agents (workspaces + auth) in one gateway process.
status: active
summary: 多智能体路由：隔离的智能体、渠道账户与绑定
title: 多智能体路由
x-i18n:
    generated_at: "2026-04-08T04:04:38Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7e8bc48f229d01aa793ca4137e5a59f2a5ceb0ba65841710aaf69f53a672be60
    source_path: concepts\multi-agent.md
    workflow: 15
---

# 多智能体路由

目标：在一个正在运行的 Gateway 网关中，支持多个_相互隔离_的智能体（独立的 workspace + `agentDir` + sessions），以及多个渠道账户（例如两个 WhatsApp 账号）。入站消息会通过绑定路由到某个智能体。

## 什么是“一个智能体”？

一个**智能体**是一个完整作用域的“大脑”，它拥有自己的：

- **工作区**（文件、AGENTS.md/SOUL.md/USER.md、本地笔记、人格规则）。
- 用于认证配置、模型注册表和按智能体配置的**状态目录**（`agentDir`）。
- 位于 `~/.openclaw/agents/<agentId>/sessions` 下的**会话存储**（聊天记录 + 路由状态）。

认证配置是**按智能体隔离**的。每个智能体都从自己的以下文件读取：

```text
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

这里的 `sessions_history` 也是更安全的跨会话回溯路径：它返回的是一个有界、已净化的视图，而不是原始会话转储。assistant 回溯会在脱敏/截断之前移除 thinking 标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块）、降级后的工具调用脚手架、泄露的 ASCII/全角模型控制 token，以及格式错误的 MiniMax 工具调用 XML。

主智能体的凭证**不会**自动共享。绝不要在多个智能体之间复用 `agentDir`（这会导致认证/会话冲突）。如果你想共享凭证，请将 `auth-profiles.json` 复制到另一个智能体的 `agentDir` 中。

Skills 会从每个智能体的工作区以及共享根目录（例如 `~/.openclaw/skills`）中加载，然后在配置了 allowlist 时，按生效中的智能体 Skills allowlist 进行过滤。使用 `agents.defaults.skills` 作为共享基线，使用 `agents.list[].skills` 作为按智能体替换。参见
[Skills: per-agent vs shared](/tools/skills#per-agent-vs-shared-skills) 和
[Skills: agent skill allowlists](/tools/skills#agent-skill-allowlists)。

Gateway 网关可以承载**一个智能体**（默认）或**多个智能体**并行运行。

**工作区说明：** 每个智能体的工作区是默认的 cwd，而不是硬性沙箱。相对路径会在工作区内解析，但绝对路径仍可访问主机上的其他位置，除非启用了沙箱隔离。参见
[沙箱隔离](/gateway/sandboxing)。

## 路径（快速对照）

- 配置：`~/.openclaw/openclaw.json`（或 `OPENCLAW_CONFIG_PATH`）
- 状态目录：`~/.openclaw`（或 `OPENCLAW_STATE_DIR`）
- 工作区：`~/.openclaw/workspace`（或 `~/.openclaw/workspace-<agentId>`）
- 智能体目录：`~/.openclaw/agents/<agentId>/agent`（或 `agents.list[].agentDir`）
- 会话：`~/.openclaw/agents/<agentId>/sessions`

### 单智能体模式（默认）

如果你什么都不做，OpenClaw 会运行单个智能体：

- `agentId` 默认为 **`main`**。
- 会话键格式为 `agent:main:<mainKey>`。
- 工作区默认为 `~/.openclaw/workspace`（当设置了 `OPENCLAW_PROFILE` 时为 `~/.openclaw/workspace-<profile>`）。
- 状态默认位于 `~/.openclaw/agents/main/agent`。

## 智能体助手

使用智能体向导添加一个新的隔离智能体：

```bash
openclaw agents add work
```

然后添加 `bindings`（或让向导代劳）以路由入站消息。

可通过以下命令验证：

```bash
openclaw agents list --bindings
```

## 快速开始

<Steps>
  <Step title="创建每个智能体工作区">

使用向导，或手动创建工作区：

```bash
openclaw agents add coding
openclaw agents add social
```

每个智能体都会获得自己的工作区，其中包含 `SOUL.md`、`AGENTS.md` 和可选的 `USER.md`，以及位于 `~/.openclaw/agents/<agentId>` 下的专用 `agentDir` 和会话存储。

  </Step>

  <Step title="创建渠道账户">

在你偏好的渠道上，为每个智能体创建一个账户：

- Discord：每个智能体一个 bot，启用 Message Content Intent，并复制各自的 token。
- Telegram：通过 BotFather 为每个智能体创建一个 bot，并复制各自的 token。
- WhatsApp：为每个账户关联各自的电话号码。

```bash
openclaw channels login --channel whatsapp --account work
```

参见各渠道指南：[Discord](/zh-CN/channels/discord)、[Telegram](/zh-CN/channels/telegram)、[WhatsApp](/zh-CN/channels/whatsapp)。

  </Step>

  <Step title="添加智能体、账户和绑定">

在 `agents.list` 下添加智能体，在 `channels.<channel>.accounts` 下添加渠道账户，并使用 `bindings` 将它们连接起来（示例见下文）。

  </Step>

  <Step title="重启并验证">

```bash
openclaw gateway restart
openclaw agents list --bindings
openclaw channels status --probe
```

  </Step>
</Steps>

## 多个智能体 = 多个人，多种人格

使用**多个智能体**时，每个 `agentId` 都会成为一个**完全隔离的人格**：

- **不同的电话号码/账户**（按渠道的 `accountId`）。
- **不同的人格**（按智能体的工作区文件，如 `AGENTS.md` 和 `SOUL.md`）。
- **独立的认证 + 会话**（除非显式启用，否则不会互相串话）。

这使得**多个人**可以共享一个 Gateway 网关服务器，同时保持各自的 AI “大脑”和数据相互隔离。

## 跨智能体 QMD memory 搜索

如果某个智能体需要搜索另一个智能体的 QMD 会话记录，可在
`agents.list[].memorySearch.qmd.extraCollections` 下添加额外集合。
仅当每个智能体都应继承同一组共享会话记录集合时，才使用
`agents.defaults.memorySearch.qmd.extraCollections`。

```json5
{
  agents: {
    defaults: {
      workspace: "~/workspaces/main",
      memorySearch: {
        qmd: {
          extraCollections: [{ path: "~/agents/family/sessions", name: "family-sessions" }],
        },
      },
    },
    list: [
      {
        id: "main",
        workspace: "~/workspaces/main",
        memorySearch: {
          qmd: {
            extraCollections: [{ path: "notes" }], // 在工作区内解析 -> 集合命名为 "notes-main"
          },
        },
      },
      { id: "family", workspace: "~/workspaces/family" },
    ],
  },
  memory: {
    backend: "qmd",
    qmd: { includeDefaultMemory: false },
  },
}
```

额外集合路径可以在多个智能体之间共享，但当路径位于智能体工作区之外时，集合名称必须保持显式指定。位于工作区内的路径仍然是按智能体划分的，因此每个智能体都保有自己的会话记录搜索集合。

## 一个 WhatsApp 号码，多个用户（私信拆分）

你可以在**同一个 WhatsApp 账户**上，将**不同的 WhatsApp 私信**路由到不同智能体。通过发送者的 E.164（如 `+15551234567`）并配合 `peer.kind: "direct"` 进行匹配。回复仍然来自同一个 WhatsApp 号码（不支持按智能体区分发送者身份）。

重要细节：私聊会折叠到该智能体的**主会话键**，因此若要实现真正隔离，必须**每个人一个智能体**。

示例：

```json5
{
  agents: {
    list: [
      { id: "alex", workspace: "~/.openclaw/workspace-alex" },
      { id: "mia", workspace: "~/.openclaw/workspace-mia" },
    ],
  },
  bindings: [
    {
      agentId: "alex",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230001" } },
    },
    {
      agentId: "mia",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551230002" } },
    },
  ],
  channels: {
    whatsapp: {
      dmPolicy: "allowlist",
      allowFrom: ["+15551230001", "+15551230002"],
    },
  },
}
```

说明：

- 私信访问控制是**按 WhatsApp 账户全局生效**的（pairing/allowlist），而不是按智能体生效。
- 对于共享群组，请将该群绑定到一个智能体，或使用 [Broadcast groups](/zh-CN/channels/broadcast-groups)。

## 路由规则（消息如何选中某个智能体）

绑定是**确定性的**，并且**最具体的规则优先**：

1. `peer` 匹配（精确的私信/群组/频道 id）
2. `parentPeer` 匹配（线程继承）
3. `guildId + roles`（Discord 角色路由）
4. `guildId`（Discord）
5. `teamId`（Slack）
6. 某个渠道的 `accountId` 匹配
7. 渠道级匹配（`accountId: "*"`）
8. 回退到默认智能体（`agents.list[].default`，否则取列表第一项，默认：`main`）

如果同一层级有多个绑定匹配，则按配置顺序取第一个。
如果某个绑定设置了多个匹配字段（例如 `peer` + `guildId`），则所有已指定字段都必须满足（`AND` 语义）。

关于账户作用域的重要细节：

- 省略 `accountId` 的绑定只匹配默认账户。
- 若要为某个渠道下的所有账户设置回退，请使用 `accountId: "*"`。
- 如果你之后为同一个智能体、同一个绑定添加了显式账户 id，OpenClaw 会将现有的仅渠道绑定升级为账户作用域绑定，而不是重复创建。

## 多账户 / 多电话号码

支持**多个账户**的渠道（例如 WhatsApp）使用 `accountId` 来标识每次登录。
每个 `accountId` 都可以路由到不同的智能体，因此一台服务器可以承载多个电话号码而不会混淆会话。

如果你希望在省略 `accountId` 时使用某个渠道范围内的默认账户，可设置
`channels.<channel>.defaultAccount`（可选）。如果未设置，OpenClaw 会优先回退到 `default`，若不存在则取第一个已配置的账户 id（按排序）。

支持这种模式的常见渠道包括：

- `whatsapp`、`telegram`、`discord`、`slack`、`signal`、`imessage`
- `irc`、`line`、`googlechat`、`mattermost`、`matrix`、`nextcloud-talk`
- `bluebubbles`、`zalo`、`zalouser`、`nostr`、`feishu`

## 概念

- `agentId`：一个“脑”（工作区、按智能体的认证、按智能体的会话存储）。
- `accountId`：一个渠道账户实例（例如 WhatsApp 账户 `"personal"` 与 `"biz"`）。
- `binding`：根据 `(channel, accountId, peer)`，并可选结合 guild/team id，将入站消息路由到某个 `agentId`。
- 私聊会折叠到 `agent:<agentId>:<mainKey>`（按智能体的“主会话”；`session.mainKey`）。

## 平台示例

### 每个智能体对应一个 Discord bot

每个 Discord bot 账户都映射到唯一的 `accountId`。将每个账户绑定到一个智能体，并为每个 bot 保持各自的 allowlist。

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "coding", workspace: "~/.openclaw/workspace-coding" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "discord", accountId: "default" } },
    { agentId: "coding", match: { channel: "discord", accountId: "coding" } },
  ],
  channels: {
    discord: {
      groupPolicy: "allowlist",
      accounts: {
        default: {
          token: "DISCORD_BOT_TOKEN_MAIN",
          guilds: {
            "123456789012345678": {
              channels: {
                "222222222222222222": { allow: true, requireMention: false },
              },
            },
          },
        },
        coding: {
          token: "DISCORD_BOT_TOKEN_CODING",
          guilds: {
            "123456789012345678": {
              channels: {
                "333333333333333333": { allow: true, requireMention: false },
              },
            },
          },
        },
      },
    },
  },
}
```

说明：

- 将每个 bot 邀请进 guild，并启用 Message Content Intent。
- token 存放在 `channels.discord.accounts.<id>.token` 中（默认账户可使用 `DISCORD_BOT_TOKEN`）。

### 每个智能体对应一个 Telegram bot

```json5
{
  agents: {
    list: [
      { id: "main", workspace: "~/.openclaw/workspace-main" },
      { id: "alerts", workspace: "~/.openclaw/workspace-alerts" },
    ],
  },
  bindings: [
    { agentId: "main", match: { channel: "telegram", accountId: "default" } },
    { agentId: "alerts", match: { channel: "telegram", accountId: "alerts" } },
  ],
  channels: {
    telegram: {
      accounts: {
        default: {
          botToken: "123456:ABC...",
          dmPolicy: "pairing",
        },
        alerts: {
          botToken: "987654:XYZ...",
          dmPolicy: "allowlist",
          allowFrom: ["tg:123456789"],
        },
      },
    },
  },
}
```

说明：

- 通过 BotFather 为每个智能体创建一个 bot，并复制各自的 token。
- token 存放在 `channels.telegram.accounts.<id>.botToken` 中（默认账户可使用 `TELEGRAM_BOT_TOKEN`）。

### 每个智能体对应一个 WhatsApp 号码

在启动 gateway 之前，先关联每个账户：

```bash
openclaw channels login --channel whatsapp --account personal
openclaw channels login --channel whatsapp --account biz
```

`~/.openclaw/openclaw.json`（JSON5）：

```js
{
  agents: {
    list: [
      {
        id: "home",
        default: true,
        name: "Home",
        workspace: "~/.openclaw/workspace-home",
        agentDir: "~/.openclaw/agents/home/agent",
      },
      {
        id: "work",
        name: "Work",
        workspace: "~/.openclaw/workspace-work",
        agentDir: "~/.openclaw/agents/work/agent",
      },
    ],
  },

  // 确定性路由：首个匹配生效（最具体的规则优先）。
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },

    // 可选的按 peer 覆盖（示例：将某个特定群组发送到工作智能体）。
    {
      agentId: "work",
      match: {
        channel: "whatsapp",
        accountId: "personal",
        peer: { kind: "group", id: "1203630...@g.us" },
      },
    },
  ],

  // 默认关闭：智能体到智能体消息必须显式启用并加入 allowlist。
  tools: {
    agentToAgent: {
      enabled: false,
      allow: ["home", "work"],
    },
  },

  channels: {
    whatsapp: {
      accounts: {
        personal: {
          // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/personal
          // authDir: "~/.openclaw/credentials/whatsapp/personal",
        },
        biz: {
          // 可选覆盖。默认：~/.openclaw/credentials/whatsapp/biz
          // authDir: "~/.openclaw/credentials/whatsapp/biz",
        },
      },
    },
  },
}
```

## 示例：WhatsApp 日常聊天 + Telegram 深度工作

按渠道拆分：将 WhatsApp 路由到一个快速的日常智能体，将 Telegram 路由到一个 Opus 智能体。

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    { agentId: "chat", match: { channel: "whatsapp" } },
    { agentId: "opus", match: { channel: "telegram" } },
  ],
}
```

说明：

- 如果你在某个渠道上有多个账户，请在绑定中添加 `accountId`（例如 `{ channel: "whatsapp", accountId: "personal" }`）。
- 如果你想将某个单独的私信/群组路由到 Opus，同时其余内容仍走 chat，请为该 peer 添加 `match.peer` 绑定；peer 匹配始终优先于渠道范围规则。

## 示例：同一渠道中，将某个 peer 路由到 Opus

让 WhatsApp 继续使用快速智能体，但将一个私信路由到 Opus：

```json5
{
  agents: {
    list: [
      {
        id: "chat",
        name: "Everyday",
        workspace: "~/.openclaw/workspace-chat",
        model: "anthropic/claude-sonnet-4-6",
      },
      {
        id: "opus",
        name: "Deep Work",
        workspace: "~/.openclaw/workspace-opus",
        model: "anthropic/claude-opus-4-6",
      },
    ],
  },
  bindings: [
    {
      agentId: "opus",
      match: { channel: "whatsapp", peer: { kind: "direct", id: "+15551234567" } },
    },
    { agentId: "chat", match: { channel: "whatsapp" } },
  ],
}
```

peer 绑定始终优先，因此请将它们放在渠道范围规则之前。

## 绑定到 WhatsApp 群组的家庭智能体

将一个专用家庭智能体绑定到单个 WhatsApp 群组，并启用 mention 门控及更严格的工具策略：

```json5
{
  agents: {
    list: [
      {
        id: "family",
        name: "Family",
        workspace: "~/.openclaw/workspace-family",
        identity: { name: "Family Bot" },
        groupChat: {
          mentionPatterns: ["@family", "@familybot", "@Family Bot"],
        },
        sandbox: {
          mode: "all",
          scope: "agent",
        },
        tools: {
          allow: [
            "exec",
            "read",
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
          ],
          deny: ["write", "edit", "apply_patch", "browser", "canvas", "nodes", "cron"],
        },
      },
    ],
  },
  bindings: [
    {
      agentId: "family",
      match: {
        channel: "whatsapp",
        peer: { kind: "group", id: "120363999999999999@g.us" },
      },
    },
  ],
}
```

说明：

- 工具 allow/deny 列表是**工具**，不是 Skills。如果某个 Skill 需要运行某个二进制文件，请确保已允许 `exec`，并且该二进制文件存在于沙箱中。
- 若要实现更严格的门控，请设置 `agents.list[].groupChat.mentionPatterns`，并保持该渠道的群组 allowlist 处于启用状态。

## 按智能体划分的沙箱与工具配置

每个智能体都可以拥有自己的沙箱和工具限制：

```js
{
  agents: {
    list: [
      {
        id: "personal",
        workspace: "~/.openclaw/workspace-personal",
        sandbox: {
          mode: "off",  // 个人智能体不使用沙箱
        },
        // 不限制工具——所有工具均可用
      },
      {
        id: "family",
        workspace: "~/.openclaw/workspace-family",
        sandbox: {
          mode: "all",     // 始终启用沙箱
          scope: "agent",  // 每个智能体一个容器
          docker: {
            // 容器创建后的一次性可选设置
            setupCommand: "apt-get update && apt-get install -y git curl",
          },
        },
        tools: {
          allow: ["read"],                    // 仅允许 read 工具
          deny: ["exec", "write", "edit", "apply_patch"],    // 拒绝其他工具
        },
      },
    ],
  },
}
```

注意：`setupCommand` 位于 `sandbox.docker` 下，并会在容器创建时运行一次。
当解析后的作用域是 `"shared"` 时，按智能体设置的 `sandbox.docker.*` override 会被忽略。

**优势：**

- **安全隔离**：限制不受信任智能体的工具
- **资源控制**：仅对特定智能体启用沙箱，而其他智能体仍运行在主机上
- **灵活策略**：按智能体设置不同权限

注意：`tools.elevated` 是**全局**且基于发送者的；它不能按智能体配置。
如果你需要按智能体划定边界，请使用 `agents.list[].tools` 禁止 `exec`。
如果需要按群定向，请使用 `agents.list[].groupChat.mentionPatterns`，这样 @ 提及就能清晰地映射到目标智能体。

有关详细示例，请参见 [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools)。

## 相关内容

- [Channel Routing](/zh-CN/channels/channel-routing) —— 消息如何路由到智能体
- [Sub-Agents](/tools/subagents) —— 生成后台智能体运行
- [ACP Agents](/tools/acp-agents) —— 运行外部编码 harness
- [Presence](/zh-CN/concepts/presence) —— 智能体存在状态与可用性
- [Session](/zh-CN/concepts/session) —— 会话隔离与路由
