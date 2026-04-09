---
read_when:
    - 首次设置 OpenClaw
    - 查找常见的配置模式
    - 导航到特定配置章节
summary: 配置概览：常见任务、快速设置，以及完整参考的链接
title: 配置
x-i18n:
    generated_at: "2026-04-08T04:25:46Z"
    model: gpt-5.4
    provider: openai
    source_hash: a39a7de09c5f9540785ec67f37d435a7a86201f0f5f640dae663054f35976712
    source_path: gateway\configuration.md
    workflow: 15
---

# 配置

OpenClaw 会从 `~/.openclaw/openclaw.json` 读取一个可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置文件。

如果该文件不存在，OpenClaw 会使用安全的默认值。添加配置的常见原因包括：

- 连接渠道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱隔离或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

请查看[完整参考](/zh-CN/gateway/configuration-reference)了解所有可用字段。

<Tip>
**刚开始接触配置？** 先运行 `openclaw onboard` 进行交互式设置，或者查看[配置示例](/zh-CN/gateway/configuration-examples)指南，获取可直接复制粘贴的完整配置。
</Tip>

## 最小配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## 编辑配置

<Tabs>
  <Tab title="交互式向导">
    ```bash
    openclaw onboard       # 完整新手引导流程
    openclaw configure     # 配置向导
    ```
  </Tab>
  <Tab title="CLI（单行命令）">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="控制 UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789) 并使用 **Config** 选项卡。
    控制 UI 会根据实时配置 schema 渲染表单，包括字段
    `title` / `description` 文档元数据，以及在可用时包含插件和渠道 schema，
    同时提供 **Raw JSON** 编辑器作为兜底方式。对于下钻式 UI
    和其他工具，Gateway 网关还提供 `config.schema.lookup`，
    用于获取单个路径范围内的 schema 节点及其直接子项摘要。
  </Tab>
  <Tab title="直接编辑">
    直接编辑 `~/.openclaw/openclaw.json`。Gateway 网关会监视该文件并自动应用更改（参见[热重载](#config-hot-reload)）。
  </Tab>
</Tabs>

## 严格校验

<Warning>
OpenClaw 只接受完全匹配 schema 的配置。未知键名、格式错误的类型或无效值都会导致 Gateway 网关**拒绝启动**。唯一的根级例外是 `$schema`（字符串），这样编辑器就可以附加 JSON Schema 元数据。
</Warning>

Schema 工具说明：

- `openclaw config schema` 会输出与控制 UI
  和配置校验所使用的相同 JSON Schema 族。
- 字段 `title` 和 `description` 的值会被带入 schema 输出，供
  编辑器和表单工具使用。
- 嵌套对象、通配符（`*`）和数组项（`[]`）条目会在存在匹配字段文档时
  继承相同的文档元数据。
- `anyOf` / `oneOf` / `allOf` 组合分支也会继承相同的文档
  元数据，因此联合/交叉变体会保留相同的字段帮助信息。
- `config.schema.lookup` 会返回一个规范化的配置路径，其中包含浅层
  schema 节点（`title`、`description`、`type`、`enum`、`const`、常见边界
  以及类似校验字段）、匹配的 UI 提示元数据，以及其直接子项
  摘要，供下钻工具使用。
- 当 Gateway 网关能够加载当前清单注册表时，也会合并运行时插件/渠道 schema。

当校验失败时：

- Gateway 网关不会启动
- 只有诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行 `openclaw doctor --fix`（或 `--yes`）应用修复

## 常见任务

<AccordionGroup>
  <Accordion title="设置一个渠道（WhatsApp、Telegram、Discord 等）">
    每个渠道在 `channels.<provider>` 下都有自己的配置章节。请查看对应的渠道页面获取设置步骤：

    - [WhatsApp](/zh-CN/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/zh-CN/channels/telegram) — `channels.telegram`
    - [Discord](/zh-CN/channels/discord) — `channels.discord`
    - [Feishu](/zh-CN/channels/feishu) — `channels.feishu`
    - [Google Chat](/zh-CN/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/zh-CN/channels/msteams) — `channels.msteams`
    - [Slack](/zh-CN/channels/slack) — `channels.slack`
    - [Signal](/zh-CN/channels/signal) — `channels.signal`
    - [iMessage](/zh-CN/channels/imessage) — `channels.imessage`
    - [Mattermost](/zh-CN/channels/mattermost) — `channels.mattermost`

    所有渠道共享相同的私信策略模式：

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="选择并配置模型">
    设置主模型和可选的回退模型：

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` 定义模型目录，并作为 `/model` 的允许列表。
    - 模型引用使用 `provider/model` 格式（例如 `anthropic/claude-opus-4-6`）。
    - `agents.defaults.imageMaxDimensionPx` 控制转录/工具图像的缩放上限（默认 `1200`）；较低的值通常会在以截图为主的运行中减少视觉 token 使用量。
    - 查看[模型 CLI](/zh-CN/concepts/models)了解如何在聊天中切换模型，查看[模型故障转移](/zh-CN/concepts/model-failover)了解凭证轮换和回退行为。
    - 对于自定义/自托管提供商，请参见参考中的[自定义提供商](/gateway/configuration-reference#custom-providers-and-base-urls)。

  </Accordion>

  <Accordion title="控制谁可以给机器人发消息">
    私信访问通过每个渠道的 `dmPolicy` 控制：

    - `"pairing"`（默认）：未知发送者会收到一次性配对码用于批准
    - `"allowlist"`：仅允许 `allowFrom` 中的发送者（或已配对的允许存储）
    - `"open"`：允许所有传入私信（需要 `allowFrom: ["*"]`）
    - `"disabled"`：忽略所有私信

    对于群组，请使用 `groupPolicy` + `groupAllowFrom` 或渠道特定的允许列表。

    请查看[完整参考](/gateway/configuration-reference#dm-and-group-access)了解各渠道的详细信息。

  </Accordion>

  <Accordion title="设置群聊提及门控">
    群消息默认**需要提及**。可按智能体配置模式：

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **元数据提及**：原生 @ 提及（WhatsApp 点击提及、Telegram @bot 等）
    - **文本模式**：`mentionPatterns` 中的安全正则表达式模式
    - 请查看[完整参考](/gateway/configuration-reference#group-chat-mention-gating)了解各渠道覆盖项和自聊模式。

  </Accordion>

  <Accordion title="按智能体限制 Skills">
    使用 `agents.defaults.skills` 作为共享基线，然后通过
    `agents.list[].skills` 覆盖特定智能体：

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - 省略 `agents.defaults.skills` 表示默认情况下 Skills 不受限制。
    - 省略 `agents.list[].skills` 表示继承默认值。
    - 设置 `agents.list[].skills: []` 表示不启用任何 Skills。
    - 请查看 [Skills](/tools/skills)、[Skills 配置](/tools/skills-config) 和
      [配置参考](/gateway/configuration-reference#agentsdefaultsskills)。

  </Accordion>

  <Accordion title="调整 Gateway 网关渠道健康监控">
    控制 Gateway 网关对看起来已停滞的渠道执行重启的激进程度：

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - 设置 `gateway.channelHealthCheckMinutes: 0` 可全局禁用健康监控重启。
    - `channelStaleEventThresholdMinutes` 应大于或等于检查间隔。
    - 使用 `channels.<provider>.healthMonitor.enabled` 或 `channels.<provider>.accounts.<id>.healthMonitor.enabled`，可仅为单个渠道或账户禁用自动重启，而不关闭全局监控。
    - 查看[健康检查](/zh-CN/gateway/health)了解运维调试内容，并查看[完整参考](/gateway/configuration-reference#gateway)了解所有字段。

  </Accordion>

  <Accordion title="配置会话和重置">
    会话控制对话连续性和隔离性：

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`：`main`（共享）| `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`：线程绑定会话路由的全局默认值（Discord 支持 `/focus`、`/unfocus`、`/agents`、`/session idle` 和 `/session max-age`）。
    - 查看[会话管理](/zh-CN/concepts/session)了解作用域、身份链接和发送策略。
    - 查看[完整参考](/gateway/configuration-reference#session)了解所有字段。

  </Accordion>

  <Accordion title="启用沙箱隔离">
    在隔离的 Docker 容器中运行智能体会话：

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    请先构建镜像：`scripts/sandbox-setup.sh`

    查看[沙箱隔离](/gateway/sandboxing)获取完整指南，查看[完整参考](/gateway/configuration-reference#agentsdefaultssandbox)了解所有选项。

  </Accordion>

  <Accordion title="为官方 iOS 构建启用基于 relay 的推送">
    基于 relay 的推送在 `openclaw.json` 中配置。

    在 Gateway 网关配置中设置以下内容：

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    等效 CLI：

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    其作用如下：

    - 让 Gateway 网关通过外部 relay 发送 `push.test`、唤醒提醒和重连唤醒。
    - 使用由已配对 iOS 应用转发的、基于注册范围的发送授权。Gateway 网关不需要部署范围的 relay token。
    - 将每个基于 relay 的注册绑定到 iOS 应用所配对的 Gateway 网关身份，因此其他 Gateway 网关无法复用已存储的注册信息。
    - 本地/手动 iOS 构建仍使用直接 APNs。基于 relay 的发送仅适用于通过 relay 注册的官方分发构建。
    - 必须与官方/TestFlight iOS 构建中固化的 relay 基础 URL 匹配，这样注册和发送流量才能到达同一个 relay 部署。

    端到端流程：

    1. 安装一个使用相同 relay 基础 URL 编译的官方/TestFlight iOS 构建。
    2. 在 Gateway 网关上配置 `gateway.push.apns.relay.baseUrl`。
    3. 将 iOS 应用与 Gateway 网关配对，并让节点会话和操作员会话都连接成功。
    4. iOS 应用获取 Gateway 网关身份，使用 App Attest 加上应用回执向 relay 注册，然后将基于 relay 的 `push.apns.register` 负载发布到已配对的 Gateway 网关。
    5. Gateway 网关存储 relay 句柄和发送授权，然后将其用于 `push.test`、唤醒提醒和重连唤醒。

    运维说明：

    - 如果你将 iOS 应用切换到另一个 Gateway 网关，请重新连接应用，以便它发布绑定到该 Gateway 网关的新 relay 注册。
    - 如果你发布了一个指向不同 relay 部署的新 iOS 构建，应用会刷新其缓存的 relay 注册，而不是复用旧的 relay 来源。

    兼容性说明：

    - `OPENCLAW_APNS_RELAY_BASE_URL` 和 `OPENCLAW_APNS_RELAY_TIMEOUT_MS` 仍可作为临时环境变量覆盖项使用。
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` 仍然只是一个仅限 loopback 的开发逃生开关；不要在配置中持久保存 HTTP relay URL。

    查看[iOS App](/platforms/ios#relay-backed-push-for-official-builds)了解端到端流程，查看[凭证和信任流](/platforms/ios#authentication-and-trust-flow)了解 relay 安全模型。

  </Accordion>

  <Accordion title="设置 heartbeat（定期签到）">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`：时长字符串（`30m`、`2h`）。设置为 `0m` 可禁用。
    - `target`：`last` | `none` | `<channel-id>`（例如 `discord`、`matrix`、`telegram` 或 `whatsapp`）
    - `directPolicy`：私信风格 heartbeat 目标使用 `allow`（默认）或 `block`
    - 查看[Heartbeat](/zh-CN/gateway/heartbeat)获取完整指南。

  </Accordion>

  <Accordion title="配置 cron 作业">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`：从 `sessions.json` 中清理已完成的隔离运行会话（默认 `24h`；设置为 `false` 可禁用）。
    - `runLog`：按大小和保留行数清理 `cron/runs/<jobId>.jsonl`。
    - 查看[Cron 作业](/zh-CN/automation/cron-jobs)了解功能概览和 CLI 示例。

  </Accordion>

  <Accordion title="设置 webhook（hooks）">
    在 Gateway 网关上启用 HTTP webhook 端点：

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    安全说明：
    - 将所有 hook/webhook 负载内容都视为不可信输入。
    - 使用专用的 `hooks.token`；不要复用共享的 Gateway 网关 token。
    - Hook 认证仅支持请求头（`Authorization: Bearer ...` 或 `x-openclaw-token`）；查询字符串 token 会被拒绝。
    - `hooks.path` 不能为 `/`；请将 webhook 入口保留在专用子路径下，例如 `/hooks`。
    - 保持不安全内容绕过标志为禁用（`hooks.gmail.allowUnsafeExternalContent`、`hooks.mappings[].allowUnsafeExternalContent`），除非是在进行严格限定范围的调试。
    - 如果启用 `hooks.allowRequestSessionKey`，也应设置 `hooks.allowedSessionKeyPrefixes` 以限制调用方可选的会话键。
    - 对于由 hook 驱动的智能体，优先使用强大的现代模型层级和严格的工具策略（例如尽量只允许消息类工具并启用沙箱隔离）。

    查看[完整参考](/gateway/configuration-reference#hooks)了解所有映射选项和 Gmail 集成。

  </Accordion>

  <Accordion title="配置多智能体路由">
    运行多个隔离的智能体，并分别使用不同的工作区和会话：

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    查看[多智能体](/zh-CN/concepts/multi-agent)和[完整参考](/gateway/configuration-reference#multi-agent-routing)了解绑定规则和每个智能体的访问配置文件。

  </Accordion>

  <Accordion title="将配置拆分为多个文件（$include）">
    使用 `$include` 组织大型配置：

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **单个文件**：替换包含它的对象
    - **文件数组**：按顺序深度合并（后者优先）
    - **同级键**：在 include 之后合并（覆盖包含的值）
    - **嵌套 include**：最多支持 10 层
    - **相对路径**：相对于包含它的文件解析
    - **错误处理**：对缺失文件、解析错误和循环 include 提供清晰错误

  </Accordion>
</AccordionGroup>

## 配置热重载

Gateway 网关会监视 `~/.openclaw/openclaw.json` 并自动应用更改——大多数设置都不需要手动重启。

### 重载模式

| 模式 | 行为 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **`hybrid`**（默认） | 立即热应用安全更改。对关键更改自动重启。 |
| **`hot`** | 仅热应用安全更改。当需要重启时记录警告——由你自行处理。 |
| **`restart`** | 任何配置更改都会重启 Gateway 网关，无论是否安全。 |
| **`off`** | 禁用文件监视。更改会在下次手动重启时生效。 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### 哪些可以热应用，哪些需要重启

大多数字段都可以无停机热应用。在 `hybrid` 模式下，需要重启的更改会自动处理。

| 类别 | 字段 | 需要重启？ |
| ------------------- | -------------------------------------------------------------------- | --------------- |
| 渠道 | `channels.*`、`web`（WhatsApp）——所有内置和扩展渠道 | 否 |
| 智能体和模型 | `agent`、`agents`、`models`、`routing` | 否 |
| 自动化 | `hooks`、`cron`、`agent.heartbeat` | 否 |
| 会话和消息 | `session`、`messages` | 否 |
| 工具和媒体 | `tools`、`browser`、`skills`、`audio`、`talk` | 否 |
| UI 和杂项 | `ui`、`logging`、`identity`、`bindings` | 否 |
| Gateway 网关服务器 | `gateway.*`（port、bind、auth、tailscale、TLS、HTTP） | **是** |
| 基础设施 | `discovery`、`canvasHost`、`plugins` | **是** |

<Note>
`gateway.reload` 和 `gateway.remote` 是例外——更改它们**不会**触发重启。
</Note>

## 配置 RPC（程序化更新）

<Note>
控制平面写入 RPC（`config.apply`、`config.patch`、`update.run`）会按每个 `deviceId+clientIp` 限流为**每 60 秒 3 次请求**。触发限制时，RPC 会返回 `UNAVAILABLE` 和 `retryAfterMs`。
</Note>

安全/默认流程：

- `config.schema.lookup`：检查单个路径范围的配置子树，返回浅层
  schema 节点、匹配的提示元数据以及直接子项摘要
- `config.get`：获取当前快照 + hash
- `config.patch`：推荐的部分更新路径
- `config.apply`：仅用于完整配置替换
- `update.run`：显式自更新 + 重启

当你不是要替换整个配置时，优先使用 `config.schema.lookup`
然后再使用 `config.patch`。

<AccordionGroup>
  <Accordion title="config.apply（完整替换）">
    在一步内校验并写入完整配置，然后重启 Gateway 网关。

    <Warning>
    `config.apply` 会替换**整个配置**。部分更新请使用 `config.patch`，单个键请使用 `openclaw config set`。
    </Warning>

    参数：

    - `raw`（string）— 整个配置的 JSON5 负载
    - `baseHash`（可选）— 来自 `config.get` 的配置 hash（配置已存在时必需）
    - `sessionKey`（可选）— 重启后唤醒 ping 使用的会话键
    - `note`（可选）— 重启哨兵的备注
    - `restartDelayMs`（可选）— 重启前延迟（默认 2000）

    当已有重启处于待处理/进行中时，新的重启请求会被合并；并且两次重启周期之间会应用 30 秒冷却时间。

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch（部分更新）">
    将部分更新合并到现有配置中（JSON merge patch 语义）：

    - 对象递归合并
    - `null` 删除键
    - 数组整体替换

    参数：

    - `raw`（string）— 仅包含要更改键的 JSON5
    - `baseHash`（必需）— 来自 `config.get` 的配置 hash
    - `sessionKey`、`note`、`restartDelayMs` — 与 `config.apply` 相同

    重启行为与 `config.apply` 一致：会合并待处理重启，并在两次重启周期之间应用 30 秒冷却时间。

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## 环境变量

OpenClaw 会从父进程读取环境变量，另外还包括：

- 当前工作目录中的 `.env`（如果存在）
- `~/.openclaw/.env`（全局回退）

这两个文件都不会覆盖现有环境变量。你也可以在配置中直接设置内联环境变量：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Shell 环境导入（可选）">
  如果启用且预期键名尚未设置，OpenClaw 会运行你的登录 shell，并且只导入缺失的键：

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

环境变量等效项：`OPENCLAW_LOAD_SHELL_ENV=1`
</Accordion>

<Accordion title="配置值中的环境变量替换">
  在任意配置字符串值中使用 `${VAR_NAME}` 引用环境变量：

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

规则：

- 仅匹配大写名称：`[A-Z_][A-Z0-9_]*`
- 缺失/空变量会在加载时抛出错误
- 使用 `$${VAR}` 进行转义以输出字面量
- 在 `$include` 文件中同样可用
- 内联替换：`"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="SecretRef（env、file、exec）">
  对于支持 SecretRef 对象的字段，你可以使用：

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

SecretRef 详细信息（包括 `env`/`file`/`exec` 的 `secrets.providers`）请参见[Secrets Management](/gateway/secrets)。
支持的凭证路径列于[SecretRef Credential Surface](/reference/secretref-credential-surface)。
</Accordion>

查看[环境](/help/environment)了解完整的优先级和来源。

## 完整参考

如需按字段查看的完整参考，请参见 **[配置参考](/zh-CN/gateway/configuration-reference)**。

---

_相关内容：[配置示例](/zh-CN/gateway/configuration-examples) · [配置参考](/zh-CN/gateway/configuration-reference) · [Doctor](/zh-CN/gateway/doctor)_
