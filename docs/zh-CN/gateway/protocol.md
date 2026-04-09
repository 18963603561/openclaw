---
read_when:
    - 实现或更新 Gateway 网关 WS 客户端
    - 调试协议不匹配或连接失败
    - 重新生成协议 schema / 模型
summary: Gateway 网关 WebSocket 协议：握手、帧、版本控制
title: Gateway Protocol
x-i18n:
    generated_at: "2026-04-08T04:33:17Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8635e3ac1dd311dbd3a770b088868aa1495a8d53b3ebc1eae0dfda3b2bf4694a
    source_path: gateway\protocol.md
    workflow: 15
---

# Gateway protocol（WebSocket）

Gateway WS 协议是 OpenClaw 的**单一控制平面 + 节点传输协议**。
所有客户端（CLI、Web UI、macOS 应用、iOS / Android 节点、无头
节点）都通过 WebSocket 连接，并在握手时声明其**角色** + **scope**。

## 传输协议

- WebSocket，携带 JSON payload 的文本帧。
- 第一帧**必须**是一个 `connect` 请求。

## 握手（connect）

Gateway → Client（连接前质询）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

Client → Gateway：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway → Client：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": { "type": "hello-ok", "protocol": 3, "policy": { "tickIntervalMs": 15000 } }
}
```

当签发设备 token 时，`hello-ok` 还会包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

在受信任的 bootstrap 交接期间，`hello-ok.auth` 也可能在 `deviceTokens` 中包含额外的
有界角色条目：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

对于内置的 node / operator bootstrap 流程，主节点 token 仍保持
`scopes: []`，而任何交接出的 operator token 都会被限制在 bootstrap
operator allowlist（`operator.approvals`、`operator.read`、
`operator.talk.secrets`、`operator.write`）之内。Bootstrap scope 检查仍保持
按角色前缀进行：operator 条目只满足 operator 请求，而非 operator
角色仍需要自己角色前缀下的 scope。

### Node 示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要 **idempotency keys**（参见 schema）。

## 角色 + scope

### 角色

- `operator` = 控制平面客户端（CLI / UI / 自动化）。
- `node` = 能力宿主（camera / screen / canvas / system.run）。

### Scope（operator）

常见 scope：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`
- `operator.talk.secrets`

带 `includeSecrets: true` 的 `talk.config` 需要 `operator.talk.secrets`
（或 `operator.admin`）。

由插件注册的 Gateway 网关 RPC 方法可以请求自己的 operator scope，但保留的核心管理前缀（`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`）始终解析为 `operator.admin`。

方法 scope 只是第一道关卡。通过 `chat.send` 到达的一些 slash commands
还会在其上施加更严格的命令级检查。例如，持久化
`/config set` 和 `/config unset` 写入需要 `operator.admin`。

`node.pair.approve` 在基础方法 scope 之上还有一层额外的批准时 scope 检查：

- 无命令请求：`operator.pairing`
- 包含非 exec 节点命令的请求：`operator.pairing` + `operator.write`
- 包含 `system.run`、`system.run.prepare` 或 `system.which` 的请求：
  `operator.pairing` + `operator.admin`

### caps / commands / permissions（node）

节点在连接时声明能力主张：

- `caps`：高层能力分类。
- `commands`：供 invoke 使用的命令 allowlist。
- `permissions`：细粒度开关（例如 `screen.record`、`camera.capture`）。

Gateway 网关将这些视为**主张**，并在服务端强制执行 allowlist。

## Presence

- `system-presence` 返回按设备身份键控的条目。
- Presence 条目包含 `deviceId`、`roles` 和 `scopes`，因此 UI 可以在单行中显示一个设备，
  即使它同时以 **operator** 和 **node** 身份连接。

## 常见 RPC 方法族

本页不是自动生成的完整转储，但公开的 WS 接口面比上面的握手 / 认证示例更广。
这些是 Gateway 网关当前暴露的主要方法族。

`hello-ok.features.methods` 是一个保守的发现列表，构建自
`src/gateway/server-methods-list.ts` 加上已加载插件 / 渠道方法导出。
请将其视为功能发现，而不是对 `src/gateway/server-methods/*.ts` 中每个可调用辅助方法的自动生成转储。

### 系统与身份

- `health` 返回缓存的或新探测的 Gateway 网关健康快照。
- `status` 返回 `/status` 风格的 Gateway 网关摘要；敏感字段
  仅对具备 admin scope 的 operator 客户端可见。
- `gateway.identity.get` 返回 relay 和配对流程中使用的 Gateway 网关设备身份。
- `system-presence` 返回当前已连接
  operator / node 设备的 presence 快照。
- `system-event` 追加一个系统事件，并可更新 / 广播 presence
  上下文。
- `last-heartbeat` 返回最新持久化的 heartbeat 事件。
- `set-heartbeats` 切换 Gateway 网关上的 heartbeat 处理。

### 模型与用量

- `models.list` 返回运行时允许的模型目录。
- `usage.status` 返回提供商用量窗口 / 剩余额度摘要。
- `usage.cost` 返回某个日期范围的聚合成本用量摘要。
- `doctor.memory.status` 返回当前默认智能体工作区的
  vector-memory / 嵌入就绪性。
- `sessions.usage` 返回按会话划分的用量摘要。
- `sessions.usage.timeseries` 返回单个会话的 timeseries 用量。
- `sessions.usage.logs` 返回单个会话的用量日志条目。

### 渠道与登录辅助

- `channels.status` 返回内置 + 内置打包渠道 / 插件状态摘要。
- `channels.logout` 注销某个支持注销的特定渠道 / 账户。
- `web.login.start` 为当前支持 QR 的 Web
  渠道提供商启动 QR / Web 登录流程。
- `web.login.wait` 等待该 QR / Web 登录流程完成，并在成功后启动该渠道。
- `push.test` 向已注册的 iOS 节点发送测试 APNs 推送。
- `voicewake.get` 返回已存储的唤醒词触发器。
- `voicewake.set` 更新唤醒词触发器并广播变更。

### 消息与日志

- `send` 是直接的出站投递 RPC，用于 chat runner 之外、
  面向渠道 / 账户 / 线程目标的发送。
- `logs.tail` 返回已配置的 Gateway 网关文件日志尾部，支持游标 / limit 和
  max-byte 控制。

### Talk 与 TTS

- `talk.config` 返回生效的 Talk 配置 payload；`includeSecrets`
  需要 `operator.talk.secrets`（或 `operator.admin`）。
- `talk.mode` 为 WebChat / 控制 UI
  客户端设置 / 广播当前 Talk 模式状态。
- `talk.speak` 通过当前激活的 Talk 语音提供商合成语音。
- `tts.status` 返回 TTS 启用状态、当前提供商、回退提供商
  以及提供商配置状态。
- `tts.providers` 返回可见的 TTS 提供商清单。
- `tts.enable` 和 `tts.disable` 切换 TTS 偏好状态。
- `tts.setProvider` 更新首选 TTS 提供商。
- `tts.convert` 执行一次性 text-to-speech 转换。

### Secrets、配置、更新与向导

- `secrets.reload` 重新解析当前生效的 SecretRef，并且只在完全成功时切换运行时 secret 状态。
- `secrets.resolve` 为特定命令 / 目标集合解析命令目标 secret 分配。
- `config.get` 返回当前配置快照和哈希值。
- `config.set` 写入经过校验的配置 payload。
- `config.patch` 合并部分配置更新。
- `config.apply` 校验并替换完整配置 payload。
- `config.schema` 返回控制 UI 和
  CLI 工具使用的实时配置 schema payload：schema、`uiHints`、版本和生成元数据，
  在运行时可加载时也包括插件 + 渠道 schema 元数据。该 schema
  包含字段 `title` / `description` 元数据，来源与 UI 使用的标签
  和帮助文本相同；当存在匹配字段文档时，也包括嵌套对象、通配符、数组项，
  以及 `anyOf` / `oneOf` / `allOf` 组合分支。
- `config.schema.lookup` 返回某个配置路径的 path-scope 查找 payload：
  规范化路径、浅层 schema 节点、匹配的 hint + `hintPath`，以及
  UI / CLI 下钻所需的直接子节点摘要。
  - Lookup schema 节点保留面向用户的文档和常见校验字段：
    `title`、`description`、`type`、`enum`、`const`、`format`、`pattern`、
    数值 / 字符串 / 数组 / 对象边界，以及布尔标志如
    `additionalProperties`、`deprecated`、`readOnly`、`writeOnly`。
  - 子节点摘要暴露 `key`、规范化的 `path`、`type`、`required`、
    `hasChildren`，以及匹配到的 `hint` / `hintPath`。
- `update.run` 运行 Gateway 网关更新流程，并且只有在更新本身成功时才安排重启。
- `wizard.start`、`wizard.next`、`wizard.status` 和 `wizard.cancel` 通过
  WS RPC 暴露新手引导向导。

### 现有主要方法族

#### 智能体与工作区辅助

- `agents.list` 返回已配置的智能体条目。
- `agents.create`、`agents.update` 和 `agents.delete` 管理智能体记录及
  工作区连线。
- `agents.files.list`、`agents.files.get` 和 `agents.files.set` 管理为智能体暴露的
  bootstrap 工作区文件。
- `agent.identity.get` 返回某个智能体或
  会话的生效助手身份。
- `agent.wait` 等待一次运行结束，并在可用时返回终态快照。

#### 会话控制

- `sessions.list` 返回当前会话索引。
- `sessions.subscribe` 和 `sessions.unsubscribe` 为当前 WS 客户端切换会话变更事件订阅。
- `sessions.messages.subscribe` 和 `sessions.messages.unsubscribe` 为某个会话切换
  transcript / 消息事件订阅。
- `sessions.preview` 返回特定会话键的有界 transcript 预览。
- `sessions.resolve` 解析或规范化会话目标。
- `sessions.create` 创建一个新的会话条目。
- `sessions.send` 向现有会话发送消息。
- `sessions.steer` 是活动会话的中断并引导变体。
- `sessions.abort` 中止某个会话的活动工作。
- `sessions.patch` 更新会话元数据 / 覆盖项。
- `sessions.reset`、`sessions.delete` 和 `sessions.compact` 执行会话维护。
- `sessions.get` 返回完整存储的会话记录。
- chat 执行仍使用 `chat.history`、`chat.send`、`chat.abort` 和
  `chat.inject`。
- `chat.history` 对 UI 客户端进行了显示规范化：会从可见文本中移除内联 directive 标签，移除纯文本工具调用 XML payload（包括
  `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、
  `<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及
  被截断的工具调用块）和泄漏出的 ASCII / 全角模型控制 token，
  省略纯静默 token 的助手行，例如完全匹配的 `NO_REPLY` /
  `no_reply`，并且超大行可替换为占位符。

#### 设备配对与设备 token

- `device.pair.list` 返回待处理和已批准的配对设备。
- `device.pair.approve`、`device.pair.reject` 和 `device.pair.remove` 管理
  设备配对记录。
- `device.token.rotate` 在已批准角色
  和 scope 边界内轮换配对设备 token。
- `device.token.revoke` 吊销配对设备 token。

#### 节点配对、invoke 与待处理工作

- `node.pair.request`、`node.pair.list`、`node.pair.approve`、
  `node.pair.reject` 和 `node.pair.verify` 覆盖节点配对与 bootstrap
  校验。
- `node.list` 和 `node.describe` 返回已知 / 已连接的节点状态。
- `node.rename` 更新已配对节点标签。
- `node.invoke` 将命令转发到已连接节点。
- `node.invoke.result` 返回某个 invoke 请求的结果。
- `node.event` 将节点发起的事件带回 Gateway 网关。
- `node.canvas.capability.refresh` 刷新带作用域的 canvas capability token。
- `node.pending.pull` 和 `node.pending.ack` 是已连接节点的队列 API。
- `node.pending.enqueue` 和 `node.pending.drain` 管理
  面向离线 / 断开连接节点的持久待处理工作。

#### Approval 方法族

- `exec.approval.request`、`exec.approval.get`、`exec.approval.list` 和
  `exec.approval.resolve` 覆盖一次性 exec approval 请求，以及待处理
  approval 的查询 / 重放。
- `exec.approval.waitDecision` 等待一个待处理 exec approval，并返回
  最终决策（超时时返回 `null`）。
- `exec.approvals.get` 和 `exec.approvals.set` 管理 Gateway 网关 exec approval
  策略快照。
- `exec.approvals.node.get` 和 `exec.approvals.node.set` 通过节点 relay 命令
  管理节点本地 exec approval 策略。
- `plugin.approval.request`、`plugin.approval.list`、
  `plugin.approval.waitDecision` 和 `plugin.approval.resolve` 覆盖
  插件定义的 approval 流程。

#### 其他主要方法族

- 自动化：
  - `wake` 安排立即或下一个 heartbeat 的唤醒文本注入
  - `cron.list`、`cron.status`、`cron.add`、`cron.update`、`cron.remove`、
    `cron.run`、`cron.runs`
- Skills / 工具：`skills.*`、`tools.catalog`、`tools.effective`

### 常见事件族

- `chat`：UI chat 更新，例如 `chat.inject` 和其他仅 transcript 的 chat
  事件。
- `session.message` 和 `session.tool`：已订阅会话的 transcript / 事件流更新。
- `sessions.changed`：会话索引或元数据已变更。
- `presence`：系统 presence 快照更新。
- `tick`：周期性 keepalive / 存活事件。
- `health`：Gateway 网关健康快照更新。
- `heartbeat`：heartbeat 事件流更新。
- `cron`：cron 运行 / 任务变更事件。
- `shutdown`：Gateway 网关关闭通知。
- `node.pair.requested` / `node.pair.resolved`：节点配对生命周期。
- `node.invoke.request`：节点 invoke 请求广播。
- `device.pair.requested` / `device.pair.resolved`：配对设备生命周期。
- `voicewake.changed`：唤醒词触发器配置已变更。
- `exec.approval.requested` / `exec.approval.resolved`：exec approval
  生命周期。
- `plugin.approval.requested` / `plugin.approval.resolved`：插件 approval
  生命周期。

### 节点辅助方法

- 节点可以调用 `skills.bins`，以获取当前 Skills 可执行文件列表，
  用于自动 allow 检查。

### Operator 辅助方法

- Operator 可以调用 `tools.catalog`（`operator.read`）来获取某个
  智能体的运行时工具目录。响应包括分组后的工具和来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件归属
  - `optional`：插件工具是否为可选
- Operator 可以调用 `tools.effective`（`operator.read`）来获取某个
  会话在运行时生效的工具清单。
  - `sessionKey` 为必填。
  - Gateway 网关会从服务端的会话中派生受信任的运行时上下文，而不是接受
    调用方提供的认证或投递上下文。
  - 响应是会话作用域的，反映当前活动对话此刻可使用的内容，
    包括 core、plugin 和渠道工具。
- Operator 可以调用 `skills.status`（`operator.read`）来获取某个
  智能体可见的 Skills 清单。
  - `agentId` 为可选；省略时读取默认智能体工作区。
  - 响应包括可用性、缺失依赖、配置检查，以及
    已脱敏的安装选项，不暴露原始 secret 值。
- Operator 可以调用 `skills.search` 和 `skills.detail`（`operator.read`）获取
  ClawHub 发现元数据。
- Operator 可以通过两种模式调用 `skills.install`（`operator.admin`）：
  - ClawHub 模式：`{ source: "clawhub", slug, version?, force? }` 将某个
    skill 文件夹安装到默认智能体工作区的 `skills/` 目录。
  - Gateway 安装器模式：`{ name, installId, dangerouslyForceUnsafeInstall?, timeoutMs? }`
    在 Gateway 网关主机上运行已声明的 `metadata.openclaw.install` 动作。
- Operator 可以通过两种模式调用 `skills.update`（`operator.admin`）：
  - ClawHub 模式会更新默认智能体工作区中一个被跟踪的 slug 或所有被跟踪的 ClawHub 安装。
  - 配置模式会修补 `skills.entries.<skillKey>` 值，例如 `enabled`、
    `apiKey` 和 `env`。

## Exec approvals

- 当某个 exec 请求需要 approval 时，Gateway 网关会广播 `exec.approval.requested`。
- Operator 客户端通过调用 `exec.approval.resolve` 来完成处理（需要 `operator.approvals` scope）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范化的 `argv` / `cwd` / `rawCommand` / 会话元数据）。缺少 `systemRunPlan` 的请求会被拒绝。
- 批准后，被转发的 `node.invoke system.run` 调用会复用这个规范化的
  `systemRunPlan` 作为权威的 command / cwd / 会话上下文。
- 如果调用方在 prepare 与最终获批的 `system.run` 转发之间修改了
  `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，Gateway 网关会拒绝此次运行，而不是信任被修改过的 payload。

## 智能体投递回退

- `agent` 请求可包含 `deliver=true` 以请求出站投递。
- `bestEffortDeliver=false` 保持严格行为：无法解析或仅内部可用的投递目标会返回 `INVALID_REQUEST`。
- `bestEffortDeliver=true` 在无法解析外部可投递路由时，允许回退为仅会话执行（例如内部 / webchat 会话，或多渠道配置含糊不清时）。

## 版本控制

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器会拒绝不匹配。
- Schema + 模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 认证

- 共享密钥 Gateway 网关认证使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，取决于配置的认证模式。
- 带身份信息的模式，例如 Tailscale Serve
  （`gateway.auth.allowTailscale: true`）或非 loopback 的
  `gateway.auth.mode: "trusted-proxy"`，会通过请求头而不是
  `connect.params.auth.*` 来满足 connect 认证检查。
- 私有入口 `gateway.auth.mode: "none"` 会完全跳过共享密钥 connect 认证；
  不要在公开 / 不受信任的入口上暴露该模式。
- 配对后，Gateway 网关会签发一个**设备 token**，其作用域与连接角色 + scope 绑定。它会在 `hello-ok.auth.deviceToken` 中返回，客户端应将其持久化以供后续连接使用。
- 客户端应在任何成功连接之后持久化主 `hello-ok.auth.deviceToken`。
- 之后用该**已存储**设备 token 重新连接时，也应复用为该 token 存储的
  已批准 scope 集合。这可保留先前已授予的读取 / 探测 / 状态访问，
  并避免重新连接在无声中收缩为更窄的隐式仅 admin scope。
- 正常 connect 认证优先级为：显式共享 token / password 优先，其次是
  显式 `deviceToken`，再其次是已存储的每设备 token，最后是 bootstrap token。
- 额外的 `hello-ok.auth.deviceTokens` 条目是 bootstrap 交接 token。
  仅当连接使用了 bootstrap 认证且传输协议受信任（例如 `wss://` 或 loopback / 本地配对）时才持久化它们。
- 如果客户端提供了**显式** `deviceToken` 或显式 `scopes`，那么该调用方请求的 scope 集合仍然是权威值；只有当客户端复用已存储的每设备 token 时，才会复用缓存 scope。
- 设备 token 可通过 `device.token.rotate` 和
  `device.token.revoke` 进行轮换 / 吊销（需要 `operator.pairing` scope）。
- Token 签发 / 轮换始终受限于该设备配对条目中记录的
  已批准角色集合；轮换 token 不能将设备扩展到配对批准从未授予的角色。
- 对于配对设备 token 会话，设备管理默认是自作用域的，除非调用方同时拥有 `operator.admin`：非 admin 调用方只能移除 / 吊销 / 轮换其**自己的**设备条目。
- `device.token.rotate` 还会根据调用方当前会话 scope 检查所请求的 operator scope 集合。非 admin 调用方不能将 token 轮换为比其当前持有更宽的 operator scope 集合。
- 认证失败会包含 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`（`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`）
- 客户端对 `AUTH_TOKEN_MISMATCH` 的行为：
  - 受信任客户端可以尝试使用缓存的每设备 token 进行一次有界重试。
  - 如果该重试失败，客户端应停止自动重连循环，并呈现操作员处理指导。

## 设备身份 + 配对

- 节点应包含稳定的设备身份（`device.id`），通常来源于
  keypair 指纹。
- Gateway 网关按设备 + 角色签发 token。
- 新设备 ID 需要配对批准，除非启用了本地自动批准。
- 配对自动批准以直接本地 local loopback 连接为中心。
- OpenClaw 还提供一条狭窄的后端 / 容器本地自连接路径，用于
  受信任的共享密钥辅助流程。
- 同主机上的 tailnet 或局域网连接仍会被视为远程配对，
  并需要批准。
- 所有 WS 客户端都必须在 `connect` 期间包含 `device`
  身份（operator + node）。
  只有在以下模式下，控制 UI 才可以省略它：
  - `gateway.controlUi.allowInsecureAuth=true`，用于仅 localhost 的不安全 HTTP 兼容。
  - 成功通过 `gateway.auth.mode: "trusted-proxy"` 的 operator 控制 UI 认证。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（玻璃破碎式开关，严重安全降级）。
- 所有连接都必须签署服务器提供的 `connect.challenge` nonce。

### 设备认证迁移诊断

对于仍使用 pre-challenge 签名行为的旧版客户端，`connect` 现在会在
`error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并附带稳定的 `error.details.reason`。

常见迁移失败：

| Message | details.code | details.reason | 含义 |
| ------- | ------------ | -------------- | ---- |
| `device nonce required` | `DEVICE_AUTH_NONCE_REQUIRED` | `device-nonce-missing` | 客户端省略了 `device.nonce`（或发送了空值）。 |
| `device nonce mismatch` | `DEVICE_AUTH_NONCE_MISMATCH` | `device-nonce-mismatch` | 客户端使用了陈旧 / 错误的 nonce 进行签名。 |
| `device signature invalid` | `DEVICE_AUTH_SIGNATURE_INVALID` | `device-signature` | 签名 payload 与 v2 payload 不匹配。 |
| `device signature expired` | `DEVICE_AUTH_SIGNATURE_EXPIRED` | `device-signature-stale` | 签名时间戳超出允许的时钟偏差范围。 |
| `device identity mismatch` | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch` | `device.id` 与公钥指纹不匹配。 |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key` | 公钥格式 / 规范化失败。 |

迁移目标：

- 始终等待 `connect.challenge`。
- 对包含服务器 nonce 的 v2 payload 进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名 payload 是 `v3`，它会额外绑定 `platform` 和 `deviceFamily`，
  除 device / client / role / scopes / token / nonce 字段之外。
- 为兼容性起见，旧版 `v2` 签名仍被接受，但配对设备
  元数据钉住仍会在重连时控制命令策略。

## TLS + pinning

- WS 连接支持 TLS。
- 客户端可以选择性地 pin Gateway 网关证书指纹（参见 `gateway.tls`
  配置，以及 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint`）。

## 范围

该协议暴露了**完整的 Gateway 网关 API**（status、channels、models、chat、
agent、sessions、nodes、approvals 等）。确切接口面由
`src/gateway/protocol/schema.ts` 中的 TypeBox schema 定义。
