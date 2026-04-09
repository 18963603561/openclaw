---
read_when:
    - 处理 gateway 协议、客户端或传输时
summary: WebSocket Gateway 网关架构、组件和客户端流程
title: Gateway 网关架构
x-i18n:
    generated_at: "2026-04-08T03:58:15Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2b12a2a29e94334c6d10787ac85c34b5b046f9a14f3dd53be453368ca4a7547d
    source_path: concepts\architecture.md
    workflow: 15
---

# Gateway 网关架构

## 概览

- 单个长期运行的 **Gateway 网关**拥有所有消息界面（通过 Baileys 接入的 WhatsApp、通过 grammY 接入的 Telegram，以及 Slack、Discord、Signal、iMessage、WebChat）。
- 控制平面客户端（macOS 应用、CLI、Web UI、自动化）通过配置的绑定主机上的 **WebSocket** 连接到 Gateway 网关（默认
  `127.0.0.1:18789`）。
- **节点**（macOS/iOS/Android/无头节点）也通过 **WebSocket** 连接，但会声明 `role: node`，并带有显式的 caps/commands。
- 每台主机只运行一个 Gateway 网关；它是唯一会打开 WhatsApp 会话的地方。
- **canvas host** 由 Gateway 网关 HTTP 服务器提供，路径如下：
  - `/__openclaw__/canvas/`（智能体可编辑的 HTML/CSS/JS）
  - `/__openclaw__/a2ui/`（A2UI host）
    它与 Gateway 网关使用相同端口（默认 `18789`）。

## 组件和流程

### Gateway 网关（守护进程）

- 维护 provider 连接。
- 暴露类型化 WS API（请求、响应、服务器推送事件）。
- 根据 JSON Schema 验证入站帧。
- 发出诸如 `agent`、`chat`、`presence`、`health`、`heartbeat`、`cron` 之类的事件。

### 客户端（mac 应用 / CLI / Web 管理）

- 每个客户端一个 WS 连接。
- 发送请求（`health`、`status`、`send`、`agent`、`system-presence`）。
- 订阅事件（`tick`、`agent`、`presence`、`shutdown`）。

### 节点（macOS / iOS / Android / 无头节点）

- 使用 `role: node` 连接到**同一个 WS 服务器**。
- 在 `connect` 中提供设备身份；配对是**基于设备**的（角色为 `node`），
  批准信息存储在设备配对存储中。
- 暴露如 `canvas.*`、`camera.*`、`screen.record`、`location.get` 之类的命令。

协议详情：

- [Gateway ????](/zh-CN/gateway/protocol)

### WebChat

- 使用 Gateway 网关 WS API 获取聊天历史并发送消息的静态 UI。
- 在远程部署中，它通过与其他客户端相同的 SSH/Tailscale 隧道连接。

## 连接生命周期（单个客户端）

```mermaid
sequenceDiagram
    participant Client
    participant Gateway

    Client->>Gateway: req:connect
    Gateway-->>Client: res (ok)
    Note right of Gateway: or res error + close
    Note left of Client: payload=hello-ok<br>snapshot: presence + health

    Gateway-->>Client: event:presence
    Gateway-->>Client: event:tick

    Client->>Gateway: req:agent
    Gateway-->>Client: res:agent<br>ack {runId, status:"accepted"}
    Gateway-->>Client: event:agent<br>(streaming)
    Gateway-->>Client: res:agent<br>final {runId, status, summary}
```

## 线协议（摘要）

- 传输：WebSocket，使用带 JSON 负载的文本帧。
- 第一帧**必须**是 `connect`。
- 握手之后：
  - 请求：`{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - 事件：`{type:"event", event, payload, seq?, stateVersion?}`
- `hello-ok.features.methods` / `events` 是发现元数据，不是
  所有可调用辅助路由的自动生成清单。
- 共享密钥认证使用 `connect.params.auth.token` 或
  `connect.params.auth.password`，具体取决于已配置的 gateway 认证模式。
- 像 Tailscale Serve
  （`gateway.auth.allowTailscale: true`）或非 loopback
  `gateway.auth.mode: "trusted-proxy"` 这类携带身份的模式，会通过请求头满足认证，
  而不是使用 `connect.params.auth.*`。
- 私有入口 `gateway.auth.mode: "none"` 会完全禁用共享密钥认证；
  请勿在公网/不受信任入口上启用该模式。
- 对于有副作用的方法（`send`、`agent`），幂等键是安全重试所必需的；
  服务器会维护一个短期去重缓存。
- 节点必须在 `connect` 中包含 `role: "node"` 以及 caps/commands/permissions。

## 配对 + 本地信任

- 所有 WS 客户端（操作员 + 节点）都会在 `connect` 中包含一个**设备身份**。
- 新的设备 ID 需要配对批准；Gateway 网关会签发一个**设备 token**
  用于后续连接。
- 直接的本地 loopback 连接可以自动批准，以保持同主机 UX
  流畅。
- OpenClaw 还提供了一条狭窄的后端/容器本地自连接路径，用于
  可信的共享密钥辅助流程。
- Tailnet 和 LAN 连接，包括同主机 tailnet 绑定，仍然需要显式配对批准。
- 所有连接都必须对 `connect.challenge` nonce 进行签名。
- `v3` 版签名负载还会绑定 `platform` + `deviceFamily`；gateway 会在重连时固定已配对元数据，并在元数据变更时要求重新配对修复。
- **非本地**连接仍然需要显式批准。
- Gateway 网关认证（`gateway.auth.*`）仍适用于**所有**连接，无论本地还是远程。

详情参见： [Gateway ????](/zh-CN/gateway/protocol)、[配对](/zh-CN/channels/pairing)、
[安全](/zh-CN/gateway/security)。

## 协议类型和代码生成

- TypeBox schemas 定义协议。
- JSON Schema 从这些 schema 生成。
- Swift 模型从 JSON Schema 生成。

## 远程访问

- 首选：Tailscale 或 VPN。
- 备选：SSH 隧道

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- 在隧道之上仍应用相同的握手 + auth token。
- 在远程部署中，可以为 WS 启用 TLS + 可选 pinning。

## 运维快照

- 启动：`openclaw gateway`（前台运行，日志输出到 stdout）。
- 健康检查：通过 WS 调用 `health`（也包含在 `hello-ok` 中）。
- 监管：使用 launchd/systemd 自动重启。

## 不变量

- 每台主机恰好只有一个 Gateway 网关控制单个 Baileys 会话。
- 握手是强制的；任何非 JSON 或非 `connect` 的首帧都会被强制关闭。
- 事件不会重放；客户端必须在发生缺口时主动刷新。

## 相关内容

- [智能体循环](/zh-CN/concepts/agent-loop) — 详细的智能体执行周期
- [Gateway ????](/zh-CN/gateway/protocol) — WebSocket 协议契约
- [队列](/zh-CN/concepts/queue) — 命令队列和并发
- [安全](/zh-CN/gateway/security) — 信任模型和加固
