---
read_when:
    - 你想通过浏览器操作 Gateway 网关
    - 你想在不使用 SSH 隧道的情况下通过 Tailnet 访问
summary: Gateway 网关的浏览器控制界面（聊天、节点、配置）
title: Control UI
x-i18n:
    generated_at: "2026-04-09T01:04:15Z"
    model: gpt-5.4
    provider: openai
    source_hash: 30e6b61697282a0ad9827652c3398368f0794b746ae2216b29203f9443739b1a
    source_path: web\control-ui.md
    workflow: 15
---

# Control UI（浏览器）

Control UI 是一个由 Gateway 网关提供的小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它会在同一端口上**直接与 Gateway WebSocket 通信**。

## 快速打开（本地）

如果 Gateway 网关运行在同一台电脑上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面无法加载，请先启动 Gateway 网关：`openclaw gateway`。

认证会在 WebSocket 握手期间通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

仪表板设置面板会为当前浏览器标签页会话保存 token 和所选 Gateway URL；
password 不会被持久保存。新手引导通常会在首次连接时为共享密钥认证生成一个 gateway token，
但当 `gateway.auth.mode` 为 `"password"` 时，password 认证同样可用。

## 设备配对（首次连接）

当你从新的浏览器或设备连接到 Control UI 时，Gateway 网关需要一次性的**配对批准**——即使你位于同一个 Tailnet 中并启用了 `gateway.auth.allowTailscale: true` 也是如此。这是一项安全措施，用于防止未经授权的访问。

**你会看到：** “disconnected (1008): pairing required”

**批准设备的方法：**

```bash
# 列出待处理请求
openclaw devices list

# 按请求 ID 批准
openclaw devices approve <requestId>
```

如果浏览器使用已变更的认证详情（role / scopes / public key）重新尝试配对，
之前的待处理请求会被新的请求取代，并生成新的 `requestId`。
因此在批准前请重新运行 `openclaw devices list`。

一旦获得批准，该设备会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则无需再次批准。关于 token 轮换和撤销，请参见
[Devices CLI](/cli/devices)。

**说明：**

- 直接通过本地 `local loopback` 浏览器连接（`127.0.0.1` / `localhost`）会自动获得批准。
- Tailnet 和局域网浏览器连接即使来自同一台机器，仍然需要显式批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据都会要求重新配对。

## 语言支持

Control UI 可以在首次加载时根据你的浏览器语言环境进行本地化。
如果之后想覆盖它，请打开 **Overview -> Gateway Access -> Language**。
语言选择器位于 Gateway Access 卡片中，而不在 Appearance 下。

- 支持的语言环境：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`、`ja-JP`、`ko`、`fr`、`tr`、`uk`、`id`、`pl`
- 非英语翻译会在浏览器中按需懒加载。
- 所选语言环境会保存在浏览器存储中，并在后续访问时复用。
- 缺失的翻译键会回退到英语。

## 它当前能做什么

- 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 在聊天中流式显示工具调用 + 实时工具输出卡片（智能体事件）
- 渠道：内置渠道以及内置 / 外部插件渠道的状态、二维码登录和按渠道配置（`channels.status`、`web.login.*`、`config.patch`）
- 实例：在线列表 + 刷新（`system-presence`）
- 会话：列表 + 按会话设置 model / thinking / fast / verbose / reasoning 覆盖项（`sessions.list`、`sessions.patch`）
- Dreams：dreaming 状态、启用 / 禁用开关，以及 Dream Diary 阅读器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）
- Cron jobs：列表 / 添加 / 编辑 / 运行 / 启用 / 禁用 + 运行历史（`cron.*`）
- Skills：状态、启用 / 禁用、安装、API 密钥更新（`skills.*`）
- 节点：列表 + 能力上限（`node.list`）
- Exec 审批：编辑 gateway 或节点允许列表 + 为 `exec host=gateway/node` 设置询问策略（`exec.approvals.*`）
- 配置：查看 / 编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）
- 配置：带校验地应用 + 重启（`config.apply`），并唤醒最近活跃的会话
- 配置写入包含 base-hash 防护，以防覆盖并发编辑
- 配置写入（`config.set` / `config.apply` / `config.patch`）还会在写入前预检提交配置负载中活动 SecretRef 的解析情况；提交的活动 ref 如无法解析，会在写入前被拒绝
- 配置 schema + 表单渲染（`config.schema` / `config.schema.lookup`，
  包括字段 `title` / `description`、匹配的 UI 提示、直接子项摘要、
  嵌套对象 / 通配节点 / 数组 / 组合节点上的文档元数据，以及可用时的插件 + 渠道 schema）；仅当快照可以安全地进行原始往返时，才提供 Raw JSON 编辑器
- 如果某个快照无法安全地往返原始文本，Control UI 会强制使用 Form 模式，并为该快照禁用 Raw 模式
- 结构化 SecretRef 对象值会在表单文本输入中以只读方式渲染，以防止意外把对象破坏成字符串
- 调试：状态 / 健康 / 模型快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）
- 日志：带过滤 / 导出的 gateway 文件日志实时 tail（`logs.tail`）
- 更新：运行包 / git 更新 + 重启（`update.run`），并附带重启报告

Cron jobs 面板说明：

- 对于隔离作业，投递默认是公告摘要。若你只想执行内部运行，可以切换为 none。
- 当选择公告时，会显示渠道 / 目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
- 对于主会话作业，可用 webhook 和 none 投递模式。
- 高级编辑控件包括运行后删除、清除智能体覆盖、cron 精确 / 错峰选项、
  智能体 model / thinking 覆盖，以及尽力投递开关。
- 表单校验为内联模式，带字段级错误；存在无效值时，保存按钮会被禁用，直到修复为止。
- 设置 `cron.webhookToken` 可发送专用 bearer token；如果省略，webhook 将不带认证头发送。
- 已弃用回退：仍然存储为 `notify: true` 的旧版作业，在迁移前仍可使用 `cron.webhook`。

## 聊天行为

- `chat.send` 是**非阻塞**的：它会立即以 `{ runId, status: "started" }` 确认，响应会通过 `chat` 事件流式返回。
- 使用相同 `idempotencyKey` 再次发送时，如果仍在运行会返回 `{ status: "in_flight" }`，完成后则返回 `{ status: "ok" }`。
- 出于 UI 安全考虑，`chat.history` 响应有大小上限。当转录条目过大时，Gateway 网关可能会截断长文本字段、省略重量级元数据块，并用占位符替换超大消息（`[chat.history omitted: message too large]`）。
- `chat.history` 还会从可见的助手文本中去除仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 负载（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 以及被截断的工具调用块），以及泄露的 ASCII / 全角模型控制 token，并省略那些整个可见文本仅为精确静默 token `NO_REPLY` / `no_reply` 的助手条目。
- `chat.inject` 会向会话转录中追加一条助手备注，并广播一个 `chat` 事件供仅 UI 更新使用（不触发智能体运行，也不做渠道投递）。
- 聊天头部的 model 和 thinking 选择器会通过 `sessions.patch` 立即修改当前会话；它们是持久化的会话覆盖项，而不是单轮发送选项。
- 停止：
  - 点击 **Stop**（调用 `chat.abort`）
  - 输入 `/stop`（或独立的中止短语，如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）以带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无需 `runId`）来中止该会话的所有活动运行
- 中止后的部分保留：
  - 当某次运行被中止时，部分助手文本仍可能显示在 UI 中
  - 当存在缓冲输出时，Gateway 网关会将被中止的部分助手文本持久化到转录历史中
  - 持久化条目包含中止元数据，以便转录消费者区分“中止后的部分输出”和正常完成输出

## Tailnet 访问（推荐）

### 集成式 Tailscale Serve（首选）

让 Gateway 网关继续绑定在 loopback 上，并让 Tailscale Serve 通过 HTTPS 代理它：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI / WebSocket 的 Serve 请求可通过 Tailscale 身份头（`tailscale-user-login`）认证。OpenClaw 会通过 `tailscale whois` 解析 `x-forwarded-for` 地址并与头信息匹配来验证身份，并且仅当请求通过带有 Tailscale `x-forwarded-*` 头的 loopback 命中时才接受这些头。
如果你希望即便对 Serve 流量也强制要求显式共享密钥凭证，请设置
`gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或
`"password"`。
对于该异步 Serve 身份路径，来自同一客户端 IP 和认证范围的失败认证尝试，会在写入限流状态前被串行化。因此，同一浏览器并发的错误重试，第二个请求可能会显示 `retry later`，而不是两个普通不匹配并行竞争。
无 token 的 Serve 认证假定 gateway 主机是可信的。如果该主机上可能运行不可信的本地代码，请要求 token / password 认证。

### 绑定到 tailnet + token

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

将匹配的共享密钥粘贴到 UI 设置中（作为
`connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

## 不安全的 HTTP

如果你通过纯 HTTP 打开仪表板（`http://<lan-ip>` 或 `http://<tailscale-ip>`），浏览器会运行在**非安全上下文**中，并阻止 WebCrypto。默认情况下，OpenClaw **会阻止**没有设备身份的 Control UI 连接。

文档说明的例外情况：

- 通过 `gateway.controlUi.allowInsecureAuth=true` 启用的仅 localhost 非安全 HTTP 兼容模式
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功完成的 operator Control UI 认证
- 紧急兜底的 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复方式：** 使用 HTTPS（Tailscale Serve），或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在 gateway 主机上）

**不安全认证开关行为：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 只是一个本地兼容性开关：

- 它允许 localhost 的 Control UI 会话在非安全 HTTP 上下文中绕过设备身份继续进行。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

**仅限紧急兜底：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 会禁用 Control UI 的设备身份检查，这是一次严重的安全降级。紧急使用后请尽快恢复。

受信任代理说明：

- 成功的 trusted-proxy 认证可以允许**operator** Control UI 会话在没有设备身份的情况下接入
- 这**不**适用于 node-role Control UI 会话
- 同主机 loopback 反向代理仍不能满足 trusted-proxy 认证；参见
  [Trusted Proxy Auth](/zh-CN/gateway/trusted-proxy-auth)

关于 HTTPS 设置指导，请参见 [Tailscale](/zh-CN/gateway/tailscale)。

## 构建 UI

Gateway 网关会从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build # 首次运行时会自动安装 UI 依赖
```

可选的绝对 base（当你希望固定资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（单独的开发服务器）：

```bash
pnpm ui:dev # 首次运行时会自动安装 UI 依赖
```

然后将 UI 指向你的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试 / 测试：开发服务器 + 远程 Gateway 网关

Control UI 是静态文件；WebSocket 目标可配置，并且可以与 HTTP 来源不同。当你希望本地运行 Vite 开发服务器，而 Gateway 网关运行在其他地方时，这会很方便。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 打开如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选的一次性认证（如需要）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

说明：

- `gatewayUrl` 会在加载后存入 localStorage，并从 URL 中移除。
- `token` 应尽可能通过 URL 片段（`#token=...`）传递。片段不会发送到服务器，这样可避免请求日志和 Referer 泄露。旧版 `?token=` query 参数仍会出于兼容性被导入一次，但只是回退方案，并会在引导后立即剥离。
- `password` 仅保存在内存中。
- 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭证。
  你需要显式提供 `token`（或 `password`）。缺少显式凭证会报错。
- 当 Gateway 网关位于 TLS 后方（Tailscale Serve、HTTPS 代理等）时，请使用 `wss://`。
- `gatewayUrl` 只会在顶级窗口中被接受（不能嵌入），以防止点击劫持。
- 非 loopback 的 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`
  （完整 origin）。这也包括远程开发环境。
- 除非是在严格受控的本地测试中，否则不要使用 `gateway.controlUi.allowedOrigins: ["*"]`。
  这表示允许任意浏览器 origin，而不是“匹配我当前使用的任何主机”。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用
  Host header origin 回退模式，但这是危险的安全模式。

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置细节：参见 [Remote access](/zh-CN/gateway/remote)。

## 相关内容

- [Dashboard](/web/dashboard) — gateway 仪表板
- [WebChat](/web/webchat) — 基于浏览器的聊天界面
- [TUI](/web/tui) — 终端用户界面
- [Health Checks](/zh-CN/gateway/health) — gateway 健康监控
