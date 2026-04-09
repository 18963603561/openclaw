---
read_when:
    - 从 CLI 运行 Gateway 网关（开发或服务器场景）
    - 调试 Gateway 网关 认证、绑定模式和连接性
    - 通过 Bonjour 发现 Gateway 网关（本地 + 广域 DNS-SD）
summary: OpenClaw Gateway 网关 CLI（`openclaw gateway`）—— 运行、查询与发现 Gateway 网关
title: gateway
x-i18n:
    generated_at: "2026-04-08T03:52:56Z"
    model: gpt-5.4
    provider: openai
    source_hash: ada915c4e1369a75a9d7c4628dde9420ca4cbeb19e2c5b0eb00c06f5d99c2b18
    source_path: cli\gateway.md
    workflow: 15
---

# Gateway 网关 CLI

Gateway 网关 是 OpenClaw 的 WebSocket 服务器（渠道、节点、会话、hooks）。

本页中的子命令均位于 `openclaw gateway …` 之下。

相关文档：

- [Bonjour ????](/zh-CN/gateway/bonjour)
- [??](/zh-CN/gateway/discovery)
- [??](/zh-CN/gateway/configuration)

## 运行 Gateway 网关

运行一个本地 Gateway 网关 进程：

```bash
openclaw gateway
```

前台别名：

```bash
openclaw gateway run
```

说明：

- 默认情况下，除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则 Gateway 网关 会拒绝启动。对于临时/开发运行，请使用 `--allow-unconfigured`。
- 预期 `openclaw onboard --mode local` 和 `openclaw setup` 会写入 `gateway.mode=local`。如果文件存在但缺少 `gateway.mode`，应将其视为损坏或被覆盖的配置，并修复它，而不是隐式假定为 local 模式。
- 如果文件存在但缺少 `gateway.mode`，Gateway 网关 会将其视为可疑的配置损坏，并拒绝为你“猜测为 local”。
- 未启用认证时，禁止绑定到 loopback 以外的地址（安全护栏）。
- 在获得授权时，`SIGUSR1` 会触发进程内重启（`commands.restart` 默认启用；设置 `commands.restart: false` 可阻止手动重启，但 gateway 工具/配置应用与更新仍被允许）。
- `SIGINT`/`SIGTERM` 处理器会停止 Gateway 网关 进程，但不会恢复任何自定义终端状态。如果你使用 TUI 或 raw-mode 输入包装该 CLI，请在退出前恢复终端。

### 选项

- `--port <port>`：WebSocket 端口（默认值来自配置/环境变量；通常为 `18789`）。
- `--bind <loopback|lan|tailnet|auto|custom>`：监听器绑定模式。
- `--auth <token|password>`：认证模式覆盖。
- `--token <token>`：token 覆盖（同时为该进程设置 `OPENCLAW_GATEWAY_TOKEN`）。
- `--password <password>`：密码覆盖。警告：内联密码可能暴露在本地进程列表中。
- `--password-file <path>`：从文件读取 gateway 密码。
- `--tailscale <off|serve|funnel>`：通过 Tailscale 暴露 Gateway 网关。
- `--tailscale-reset-on-exit`：关闭时重置 Tailscale serve/funnel 配置。
- `--allow-unconfigured`：允许在配置中没有 `gateway.mode=local` 时启动 gateway。这只会绕过临时/开发引导场景下的启动保护；不会写入或修复配置文件。
- `--dev`：如果缺失，则创建开发配置 + 工作区（跳过 `BOOTSTRAP.md`）。
- `--reset`：重置开发配置 + 凭证 + 会话 + 工作区（需要 `--dev`）。
- `--force`：启动前杀掉所选端口上的现有监听进程。
- `--verbose`：详细日志。
- `--cli-backend-logs`：仅在控制台显示 CLI backend 日志（并启用 stdout/stderr）。
- `--ws-log <auto|full|compact>`：websocket 日志样式（默认 `auto`）。
- `--compact`：`--ws-log compact` 的别名。
- `--raw-stream`：将原始模型流事件记录到 jsonl。
- `--raw-stream-path <path>`：原始流 jsonl 路径。

## 查询运行中的 Gateway 网关

所有查询命令都使用 WebSocket RPC。

输出模式：

- 默认：人类可读（在 TTY 中带颜色）。
- `--json`：机器可读 JSON（无样式/无 spinner）。
- `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留人类可读布局。

共享选项（在支持的地方）：

- `--url <url>`：Gateway 网关 WebSocket URL。
- `--token <token>`：Gateway 网关 token。
- `--password <password>`：Gateway 网关 密码。
- `--timeout <ms>`：超时/预算（因命令而异）。
- `--expect-final`：等待 “final” 响应（智能体调用）。

注意：当你设置了 `--url` 时，CLI 不会回退到配置或环境变量凭证。
请显式传入 `--token` 或 `--password`。缺少显式凭证会报错。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
```

### `gateway usage-cost`

从会话日志中获取 usage-cost 汇总。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --json
```

选项：

- `--days <days>`：包含的天数（默认 `30`）。

### `gateway status`

`gateway status` 会显示 Gateway 网关 服务（launchd/systemd/schtasks）以及一个可选的 RPC 探测。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
```

选项：

- `--url <url>`：添加一个显式探测目标。仍会探测已配置的 remote + localhost。
- `--token <token>`：用于探测的 token 认证。
- `--password <password>`：用于探测的密码认证。
- `--timeout <ms>`：探测超时（默认 `10000`）。
- `--no-probe`：跳过 RPC 探测（仅服务视图）。
- `--deep`：也扫描系统级服务。
- `--require-rpc`：当 RPC 探测失败时以非零状态退出。不能与 `--no-probe` 同时使用。

说明：

- 即使本地 CLI 配置缺失或无效，`gateway status` 仍可用于诊断。
- `gateway status` 会在可能时为探测认证解析已配置的 auth SecretRef。
- 如果此命令路径中某个必需的 auth SecretRef 无法解析，且探测连接/认证失败，则 `gateway status --json` 会报告 `rpc.authWarning`；请显式传入 `--token`/`--password`，或先修复 secret 来源。
- 如果探测成功，则会抑制无法解析的 auth-ref 警告，以避免误报。
- 当脚本和自动化场景中仅有监听服务还不够，而你需要确认 Gateway 网关 RPC 本身健康时，请使用 `--require-rpc`。
- `--deep` 会尽力额外扫描 launchd/systemd/schtasks 安装。当检测到多个 gateway 类服务时，人类可读输出会打印清理提示，并警告多数设置应当每台机器只运行一个 gateway。
- 人类可读输出会包含解析后的文件日志路径，以及 CLI 与服务之间的配置路径/有效性快照，以帮助诊断 profile 或 state-dir 漂移。
- 在 Linux systemd 安装中，服务认证漂移检查会同时读取 unit 中的 `Environment=` 和 `EnvironmentFile=` 值（包括 `%h`、带引号路径、多个文件以及可选的 `-` 文件）。
- 漂移检查会使用合并后的运行时环境解析 `gateway.auth.token` SecretRef（优先服务命令环境，然后回退到进程环境）。
- 如果 token 认证实际上未激活（显式 `gateway.auth.mode` 为 `password`/`none`/`trusted-proxy`，或 mode 未设置且 password 可能胜出且不存在可生效的 token 候选），则会跳过 config token 解析的漂移检查。

### `gateway probe`

`gateway probe` 是 “全面调试” 命令。它始终会探测：

- 你已配置的远程 gateway（如果有），以及
- localhost（local loopback）**即使已配置 remote 也会探测**。

如果传入 `--url`，则会在这两者之前额外加入该显式目标。人类可读输出会将
目标标记为：

- `URL（显式）`
- `Remote（已配置）` 或 `Remote（已配置，未激活）`
- `local loopback`

如果有多个 Gateway 网关 可达，它会全部打印出来。多个 gateway 在使用隔离 profile/端口时是受支持的（例如 rescue bot），但多数安装仍然只运行一个 gateway。

```bash
openclaw gateway probe
openclaw gateway probe --json
```

解释：

- `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
- `RPC: ok` 表示详细 RPC 调用（`health`/`status`/`system-presence`/`config.get`）也成功了。
- `RPC: limited - missing scope: operator.read` 表示连接成功，但详细 RPC 受 scope 限制。这会被报告为**降级**可达性，而不是完全失败。
- 仅当所有被探测目标都不可达时，退出码才为非零。

JSON 说明（`--json`）：

- 顶层：
  - `ok`：至少有一个目标可达。
  - `degraded`：至少有一个目标的详细 RPC 受 scope 限制。
  - `primaryTargetId`：按以下顺序选出的最佳活动目标：显式 URL、SSH tunnel、已配置 remote、然后是 local loopback。
  - `warnings[]`：尽力而为的警告记录，包含 `code`、`message` 和可选的 `targetIds`。
  - `network`：从当前配置和主机网络推导出的 local loopback/tailnet URL 提示。
  - `discovery.timeoutMs` 和 `discovery.count`：本次探测实际使用的发现预算/结果计数。
- 每个目标（`targets[].connect`）：
  - `ok`：连接后的可达性，含降级分类。
  - `rpcOk`：完整详细 RPC 成功。
  - `scopeLimited`：由于缺少 operator scope，详细 RPC 失败。

常见警告代码：

- `ssh_tunnel_failed`：SSH tunnel 建立失败；命令已回退为直接探测。
- `multiple_gateways`：多个目标可达；除非你有意运行隔离 profile，例如 rescue bot，否则这并不常见。
- `auth_secretref_unresolved`：为失败目标配置的 auth SecretRef 无法解析。
- `probe_scope_limited`：WebSocket 连接成功，但详细 RPC 因缺少 `operator.read` 而受限。

#### 通过 SSH 连接远程（与 Mac app 行为一致）

macOS app 的 “Remote over SSH” 模式使用本地端口转发，因此远程 gateway（可能仅绑定到 loopback）可以通过 `ws://127.0.0.1:<port>` 访问。

对应的 CLI：

```bash
openclaw gateway probe --ssh user@gateway-host
```

选项：

- `--ssh <target>`：`user@host` 或 `user@host:port`（端口默认 `22`）。
- `--ssh-identity <path>`：身份文件。
- `--ssh-auto`：从解析后的发现端点中选择第一个发现到的 gateway 主机作为 SSH 目标（`local.` 加上已配置的广域域名（如有））。仅 TXT 的提示会被忽略。

配置（可选，用作默认值）：

- `gateway.remote.sshTarget`
- `gateway.remote.sshIdentity`

### `gateway call <method>`

底层 RPC 辅助命令。

```bash
openclaw gateway call status
openclaw gateway call logs.tail --params '{"sinceMs": 60000}'
```

选项：

- `--params <json>`：参数的 JSON 对象字符串（默认 `{}`）
- `--url <url>`
- `--token <token>`
- `--password <password>`
- `--timeout <ms>`
- `--expect-final`
- `--json`

说明：

- `--params` 必须是合法 JSON。
- `--expect-final` 主要用于那些会在最终负载之前流式传输中间事件的智能体风格 RPC。

## 管理 Gateway 网关 服务

```bash
openclaw gateway install
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway uninstall
```

命令选项：

- `gateway status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `gateway install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- `gateway uninstall|start|stop|restart`：`--json`

说明：

- `gateway install` 支持 `--port`、`--runtime`、`--token`、`--force`、`--json`。
- 当 token 认证需要 token，且 `gateway.auth.token` 由 SecretRef 管理时，`gateway install` 会验证该 SecretRef 可解析，但不会将解析后的 token 持久化到服务环境元数据中。
- 如果 token 认证需要 token，且已配置的 token SecretRef 无法解析，则安装会以失败关闭，而不是持久化回退明文。
- 对于 `gateway run` 的密码认证，优先使用 `OPENCLAW_GATEWAY_PASSWORD`、`--password-file` 或由 SecretRef 支撑的 `gateway.auth.password`，而不是内联 `--password`。
- 在推断认证模式下，仅 shell 中存在的 `OPENCLAW_GATEWAY_PASSWORD` 不会放宽安装时的 token 要求；安装受管服务时，请使用持久配置（`gateway.auth.password` 或配置中的 `env`）。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，但 `gateway.auth.mode` 未设置，则安装会被阻止，直到显式设置 mode。
- 生命周期命令支持 `--json`，便于脚本使用。

## 发现 Gateway 网关（Bonjour）

`gateway discover` 会扫描 Gateway 网关 信标（`_openclaw-gw._tcp`）。

- 组播 DNS-SD：`local.`
- 单播 DNS-SD（广域 Bonjour）：选择一个域（示例：`openclaw.internal.`），并设置 split DNS + DNS 服务器；参见 [Bonjour ????](/zh-CN/gateway/bonjour)

只有启用了 Bonjour 设备发现（默认启用）的 Gateway 网关 才会广播信标。

广域发现记录包含（TXT）：

- `role`（gateway 角色提示）
- `transport`（传输提示，例如 `gateway`）
- `gatewayPort`（WebSocket 端口，通常为 `18789`）
- `sshPort`（可选；缺省时客户端默认 SSH 目标端口为 `22`）
- `tailnetDns`（可用时的 MagicDNS 主机名）
- `gatewayTls` / `gatewayTlsSha256`（TLS 是否启用 + 证书指纹）
- `cliPath`（写入广域区域的远程安装提示）

### `gateway discover`

```bash
openclaw gateway discover
```

选项：

- `--timeout <ms>`：每条命令超时（browse/resolve）；默认 `2000`。
- `--json`：机器可读输出（也会禁用样式/spinner）。

示例：

```bash
openclaw gateway discover --timeout 4000
openclaw gateway discover --json | jq '.beacons[].wsUrl'
```

说明：

- CLI 会扫描 `local.` 以及已配置的广域域名（如果启用）。
- JSON 输出中的 `wsUrl` 来自已解析的服务端点，而不是来自仅 TXT 的
  提示，例如 `lanHost` 或 `tailnetDns`。
- 在 `local.` mDNS 上，仅当
  `discovery.mdns.mode` 为 `full` 时，才会广播 `sshPort` 和 `cliPath`。广域 DNS-SD 仍会写入 `cliPath`；`sshPort`
  在那里同样仍为可选项。
