---
read_when:
    - 将 iOS/Android 节点与 gateway 配对时
    - 使用节点 canvas/camera 作为智能体上下文时
    - 添加新的节点命令或 CLI 辅助工具时
summary: 节点：配对、能力、权限，以及用于 canvas/camera/screen/device/notifications/system 的 CLI 辅助工具
title: 节点
x-i18n:
    generated_at: "2026-04-08T06:10:46Z"
    model: gpt-5.4
    provider: openai
    source_hash: 201be0e13cb6d39608f0bbd40fd02333f68bd44f588538d1016fe864db7e038e
    source_path: nodes\index.md
    workflow: 15
---

# 节点

**节点**是一个配套设备（macOS/iOS/Android/无头设备），它通过 Gateway **WebSocket**（与操作员相同的端口）以 `role: "node"` 连接，并通过 `node.invoke` 暴露命令表面（例如 `canvas.*`、`camera.*`、`device.*`、`notifications.*`、`system.*`）。协议详情见：[Gateway 协议](/zh-CN/gateway/protocol)。

旧版传输协议：[Bridge protocol](/zh-CN/gateway/bridge-protocol)（TCP JSONL；
仅作当前节点的历史参考）。

macOS 也可以运行在**节点模式**下：菜单栏应用会连接到 Gateway 的 WS 服务器，并将其本地 canvas/camera 命令暴露为一个节点（因此 `openclaw nodes …` 可以针对这台 Mac 工作）。

说明：

- 节点是**外设**，不是 gateway。它们不会运行 gateway 服务。
- Telegram/WhatsApp 等消息会到达 **gateway**，而不是节点。
- 故障排除运行手册：[/nodes/troubleshooting](/zh-CN/nodes/troubleshooting)

## 配对 + 状态

**WS 节点使用设备配对。**节点会在 `connect` 期间提供设备身份；Gateway
会为 `role: node` 创建设备配对请求。可通过 devices CLI（或 UI）批准。

快速 CLI：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果节点使用变更后的认证详情（role/scopes/public key）重试连接，则先前
待处理的请求会被替代，并生成新的 `requestId`。批准前请重新运行
`openclaw devices list`。

说明：

- 当节点的设备配对角色包含 `node` 时，`nodes status` 会将其标记为**已配对**。
- 设备配对记录是持久化的已批准角色契约。Token
  轮换会保持在该契约内；它不能把一个已配对节点升级成
  配对批准从未授予过的其他角色。
- `node.pair.*`（CLI：`openclaw nodes pending/approve/reject/rename`）是另一个由 gateway 拥有的
  节点配对存储；它**不会**控制 WS `connect` 握手。
- 批准范围遵循待处理请求声明的命令：
  - 无命令请求：`operator.pairing`
  - 非 exec 节点命令：`operator.pairing` + `operator.write`
  - `system.run` / `system.run.prepare` / `system.which`：`operator.pairing` + `operator.admin`

## 远程节点主机（system.run）

当你的 Gateway 运行在一台机器上，而你希望命令
在另一台机器上执行时，请使用**节点主机**。模型仍然与 **gateway** 对话；
当选择 `host=node` 时，gateway 会将 `exec` 调用转发到**节点主机**。

### 哪些内容运行在哪里

- **Gateway 主机**：接收消息、运行模型、路由工具调用。
- **节点主机**：在节点机器上执行 `system.run`/`system.which`。
- **批准**：通过节点主机上的 `~/.openclaw/exec-approvals.json` 强制执行。

批准说明：

- 基于批准的节点运行会绑定精确的请求上下文。
- 对于直接的 shell/运行时文件执行，OpenClaw 还会尽力绑定一个具体的本地
  文件操作数；如果该文件在执行前发生变化，则拒绝执行。
- 如果 OpenClaw 无法为某个解释器/运行时命令识别出恰好一个具体本地文件，
  则基于批准的执行会被拒绝，而不是假装提供完整运行时覆盖。若需要更广泛的解释器语义，请使用沙箱隔离、
  独立主机，或显式受信任的 allowlist/full 工作流。

### 启动节点主机（前台）

在节点机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

### 通过 SSH 隧道连接远程 gateway（loopback 绑定）

如果 Gateway 绑定到 loopback（`gateway.bind=loopback`，本地模式下默认），
远程节点主机将无法直接连接。请创建一个 SSH 隧道，并让
节点主机指向隧道的本地端点。

示例（节点主机 -> gateway 主机）：

```bash
# 终端 A（保持运行）：将本地 18790 转发到 gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# 终端 B：导出 gateway token，并通过隧道连接
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node"
```

说明：

- `openclaw node run` 支持 token 或密码认证。
- 优先使用环境变量：`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 配置回退项为 `gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机会有意忽略 `gateway.remote.token` / `gateway.remote.password`。
- 在远程模式下，`gateway.remote.token` / `gateway.remote.password` 会按远程优先级规则参与解析。
- 如果配置了活动的本地 `gateway.auth.*` SecretRefs 但无法解析，则节点主机认证会失败关闭。
- 节点主机认证解析只会识别 `OPENCLAW_GATEWAY_*` 环境变量。

### 启动节点主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node restart
```

### 配对 + 命名

在 gateway 主机上：

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw nodes status
```

如果节点使用变更后的认证详情重试，请重新运行 `openclaw devices list`
并批准当前的 `requestId`。

命名选项：

- 在 `openclaw node run` / `openclaw node install` 上使用 `--display-name`（会持久化到节点上的 `~/.openclaw/node.json`）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（gateway 覆盖名称）。

### 将命令加入 allowlist

Exec 批准是**按节点主机**生效的。你可以从 gateway 添加 allowlist 条目：

```bash
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/uname"
openclaw approvals allowlist add --node <id|name|ip> "/usr/bin/sw_vers"
```

批准信息存储在节点主机上的 `~/.openclaw/exec-approvals.json`。

### 让 exec 指向节点

配置默认值（gateway 配置）：

```bash
openclaw config set tools.exec.host node
openclaw config set tools.exec.security allowlist
openclaw config set tools.exec.node "<id-or-name>"
```

或者按会话设置：

```
/exec host=node security=allowlist node=<id-or-name>
```

一旦设置完成，任何带有 `host=node` 的 `exec` 调用都会在节点主机上运行（受
节点 allowlist/批准机制约束）。

`host=auto` 不会自行隐式选择节点，但来自 `auto` 的显式逐调用 `host=node` 请求是允许的。如果你希望节点 exec 成为该会话的默认行为，请显式设置 `tools.exec.host=node` 或 `/exec host=node ...`。

相关内容：

- [节点主机 CLI](/cli/node)
- [Exec 工具](/tools/exec)
- [Exec approvals](/tools/exec-approvals)

## 调用命令

底层方式（原始 RPC）：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command canvas.eval --params '{"javaScript":"location.href"}'
```

对于常见的“给智能体提供一个 MEDIA 附件”工作流，也提供了更高层的辅助工具。

## 截图（canvas 快照）

如果节点正在显示 Canvas（WebView），`canvas.snapshot` 会返回 `{ format, base64 }`。

CLI 辅助工具（写入临时文件并打印 `MEDIA:<path>`）：

```bash
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format png
openclaw nodes canvas snapshot --node <idOrNameOrIp> --format jpg --max-width 1200 --quality 0.9
```

### Canvas 控制

```bash
openclaw nodes canvas present --node <idOrNameOrIp> --target https://example.com
openclaw nodes canvas hide --node <idOrNameOrIp>
openclaw nodes canvas navigate https://example.com --node <idOrNameOrIp>
openclaw nodes canvas eval --node <idOrNameOrIp> --js "document.title"
```

说明：

- `canvas present` 接受 URL 或本地文件路径（`--target`），并支持可选的 `--x/--y/--width/--height` 来控制位置。
- `canvas eval` 接受内联 JS（`--js`）或位置参数。

### A2UI（Canvas）

```bash
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --text "Hello"
openclaw nodes canvas a2ui push --node <idOrNameOrIp> --jsonl ./payload.jsonl
openclaw nodes canvas a2ui reset --node <idOrNameOrIp>
```

说明：

- 仅支持 A2UI v0.8 JSONL（会拒绝 v0.9/createSurface）。

## 照片 + 视频（节点相机）

照片（`jpg`）：

```bash
openclaw nodes camera list --node <idOrNameOrIp>
openclaw nodes camera snap --node <idOrNameOrIp>            # 默认：两个方向都拍（输出 2 行 MEDIA）
openclaw nodes camera snap --node <idOrNameOrIp> --facing front
```

视频片段（`mp4`）：

```bash
openclaw nodes camera clip --node <idOrNameOrIp> --duration 10s
openclaw nodes camera clip --node <idOrNameOrIp> --duration 3000 --no-audio
```

说明：

- 节点必须处于**前台**，`canvas.*` 和 `camera.*` 才可用（后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`）。
- 片段时长会被限制（当前为 `<= 60s`），以避免过大的 base64 负载。
- Android 会在可能时请求 `CAMERA`/`RECORD_AUDIO` 权限；若权限被拒绝，则会以 `*_PERMISSION_REQUIRED` 失败。

## 屏幕录制（节点）

受支持的节点会暴露 `screen.record`（`mp4`）。示例：

```bash
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10
openclaw nodes screen record --node <idOrNameOrIp> --duration 10s --fps 10 --no-audio
```

说明：

- `screen.record` 是否可用取决于节点平台。
- 屏幕录制会被限制为 `<= 60s`。
- `--no-audio` 会在受支持的平台上禁用麦克风采集。
- 当有多个屏幕可用时，可使用 `--screen <index>` 选择显示器。

## 位置（节点）

当在设置中启用位置功能时，节点会暴露 `location.get`。

CLI 辅助工具：

```bash
openclaw nodes location get --node <idOrNameOrIp>
openclaw nodes location get --node <idOrNameOrIp> --accuracy precise --max-age 15000 --location-timeout 10000
```

说明：

- 位置功能默认**关闭**。
- “始终允许”需要系统权限；后台获取为尽力而为。
- 返回值包含纬度/经度、精度（米）和时间戳。

## SMS（Android 节点）

当用户授予 **SMS** 权限且设备支持蜂窝通信时，Android 节点可以暴露 `sms.send`。

底层调用：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command sms.send --params '{"to":"+15555550123","message":"Hello from OpenClaw"}'
```

说明：

- 在节点宣告该能力之前，必须先在 Android 设备上接受权限提示。
- 没有蜂窝能力的纯 Wi‑Fi 设备不会宣告 `sms.send`。

## Android 设备 + 个人数据命令

当启用了相应能力时，Android 节点可以宣告额外的命令族。

可用命令族：

- `device.status`, `device.info`, `device.permissions`, `device.health`
- `notifications.list`, `notifications.actions`
- `photos.latest`
- `contacts.search`, `contacts.add`
- `calendar.events`, `calendar.add`
- `callLog.search`
- `sms.search`
- `motion.activity`, `motion.pedometer`

调用示例：

```bash
openclaw nodes invoke --node <idOrNameOrIp> --command device.status --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command notifications.list --params '{}'
openclaw nodes invoke --node <idOrNameOrIp> --command photos.latest --params '{"limit":1}'
```

说明：

- 运动类命令会根据可用传感器能力进行门控。

## 系统命令（节点主机 / mac 节点）

macOS 节点暴露 `system.run`、`system.notify` 和 `system.execApprovals.get/set`。
无头节点主机暴露 `system.run`、`system.which` 和 `system.execApprovals.get/set`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"name":"git"}'
```

说明：

- `system.run` 会在负载中返回 stdout/stderr/exit code。
- Shell 执行现在通过 `exec` 工具并使用 `host=node`；`nodes` 仍然是显式节点命令的直接 RPC 表面。
- `nodes invoke` 不暴露 `system.run` 或 `system.run.prepare`；它们只保留在 exec 路径上。
- exec 路径会在批准前准备规范化的 `systemRunPlan`。一旦
  批准授予，gateway 转发的是该已存储计划，而不是调用方后续修改过的
  command/cwd/session 字段。
- `system.notify` 会遵循 macOS 应用中的通知权限状态。
- 对于无法识别的节点 `platform` / `deviceFamily` 元数据，会使用保守的默认 allowlist，其中排除了 `system.run` 和 `system.which`。如果你确实需要为未知平台启用这些命令，请通过 `gateway.nodes.allowCommands` 显式添加。
- `system.run` 支持 `--cwd`、`--env KEY=VAL`、`--command-timeout` 和 `--needs-screen-recording`。
- 对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求级别的 `--env` 值会被收缩到一个显式 allowlist（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 在 allowlist 模式下，对于始终允许的决策，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化其内部可执行文件路径，而不是包装器路径。如果无法安全解包，则不会自动持久化任何 allowlist 条目。
- 在 Windows 节点主机的 allowlist 模式下，通过 `cmd.exe /c` 运行的 shell 包装器仍然需要批准（仅有 allowlist 条目并不会自动允许该包装器形式）。
- `system.notify` 支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 节点主机会忽略 `PATH` 覆盖，并剥离危险的启动/外壳键（`DYLD_*`、`LD_*`、`NODE_OPTIONS`、`PYTHON*`、`PERL*`、`RUBYOPT`、`SHELLOPTS`、`PS4`）。如果你需要额外的 PATH 条目，请改为配置节点主机服务环境（或将工具安装到标准位置），而不是通过 `--env` 传入 `PATH`。
- 在 macOS 节点模式下，`system.run` 会受到 macOS 应用中的 exec approvals 门控（设置 → Exec approvals）。
  ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示会返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受 exec approvals（`~/.openclaw/exec-approvals.json`）门控。

## Exec 节点绑定

当存在多个节点时，你可以将 exec 绑定到特定节点。
这会为 `exec host=node` 设置默认节点（也可以按智能体覆盖）。

全局默认值：

```bash
openclaw config set tools.exec.node "node-id-or-name"
```

按智能体覆盖：

```bash
openclaw config get agents.list
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
```

取消设置以允许任意节点：

```bash
openclaw config unset tools.exec.node
openclaw config unset agents.list[0].tools.exec.node
```

## 权限映射

节点可以在 `node.list` / `node.describe` 中包含一个 `permissions` 映射，键为权限名（例如 `screenRecording`、`accessibility`），值为布尔值（`true` = 已授予）。

## 无头节点主机（跨平台）

OpenClaw 可以运行一个**无头节点主机**（无 UI），它连接到 Gateway
WebSocket，并暴露 `system.run` / `system.which`。这在 Linux/Windows 上
很有用，也适合在服务器旁边运行一个最小化节点。

启动方式：

```bash
openclaw node run --host <gateway-host> --port 18789
```

说明：

- 仍然需要配对（Gateway 会显示设备配对提示）。
- 节点主机会将其节点 id、token、显示名称和 gateway 连接信息存储在 `~/.openclaw/node.json` 中。
- Exec approvals 会通过本地的 `~/.openclaw/exec-approvals.json`
  强制执行（参见 [Exec approvals](/tools/exec-approvals)）。
- 在 macOS 上，无头节点主机会默认在本地执行 `system.run`。设置
  `OPENCLAW_NODE_EXEC_HOST=app` 可将 `system.run` 路由到配套应用 exec 主机；再加上
  `OPENCLAW_NODE_EXEC_FALLBACK=0`，则会要求必须使用应用主机，并在其不可用时失败关闭。
- 当 Gateway WS 使用 TLS 时，请加上 `--tls` / `--tls-fingerprint`。

## Mac 节点模式

- macOS 菜单栏应用会以节点身份连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以针对这台 Mac 工作）。
- 在远程模式下，应用会为 Gateway 端口打开一个 SSH 隧道，并连接到 `localhost`。
