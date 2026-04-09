---
read_when:
    - 实现或调整 Bonjour 发现 / 广播
    - 调整远程连接模式（直连与 SSH）
    - 为远程节点设计设备发现 + 配对
summary: 用于查找 Gateway 网关的节点发现与传输协议（Bonjour、Tailscale、SSH）
title: 设备发现 + 传输协议
x-i18n:
    generated_at: "2026-04-08T04:25:41Z"
    model: gpt-5.4
    provider: openai
    source_hash: e76cca9279ca77b55e30d6e746f6325e5644134ef06b9c58f2cf3d793d092685
    source_path: gateway\discovery.md
    workflow: 15
---

# 设备发现 + 传输协议

OpenClaw 有两个表面上看起来相似、但实际上不同的问题：

1. **操作员远程控制**：运行在 macOS 菜单栏中的应用控制运行在其他位置的 Gateway 网关。
2. **节点配对**：iOS/Android（以及未来的节点）查找 Gateway 网关并进行安全配对。

设计目标是将所有网络发现 / 广播都保留在 **Node Gateway**（`openclaw gateway`）中，并让客户端（macOS 应用、iOS）作为消费者使用。

## 术语

- **Gateway 网关**：单个长期运行的 Gateway 网关进程，负责持有状态（会话、配对、节点注册表）并运行各渠道。大多数设置每台主机只使用一个；也可以使用相互隔离的多 Gateway 网关设置。
- **Gateway WS（控制平面）**：默认位于 `127.0.0.1:18789` 的 WebSocket 端点；可通过 `gateway.bind` 绑定到局域网 / tailnet。
- **直连 WS 传输**：面向局域网 / tailnet 的 Gateway WS 端点（不使用 SSH）。
- **SSH 传输（回退）**：通过 SSH 转发 `127.0.0.1:18789` 实现远程控制。
- **旧版 TCP bridge（已移除）**：较早的节点传输方式（参见
  [Bridge protocol](/zh-CN/gateway/bridge-protocol)）；不再用于
  设备发现广播，也不再属于当前构建的一部分。

协议详情：

- [Gateway protocol](/zh-CN/gateway/protocol)
- [Bridge protocol（旧版）](/zh-CN/gateway/bridge-protocol)

## 为什么我们同时保留“直连”和 SSH

- **直连 WS** 在同一网络和 tailnet 内拥有最佳用户体验：
  - 通过 Bonjour 在局域网中自动发现
  - 配对令牌和 ACL 由 Gateway 网关持有
  - 不需要 shell 访问权限；协议暴露面可以保持紧凑且易于审计
- **SSH** 仍然是通用回退方案：
  - 只要你有 SSH 访问权限，它就几乎在任何地方都可用（即使跨越无关网络）
  - 能避开组播 / mDNS 问题
  - 除 SSH 外不需要开放新的入站端口

## 发现输入（客户端如何得知 Gateway 网关位置）

### 1）Bonjour / DNS-SD 发现

组播 Bonjour 是尽力而为的，并且不会跨越网络。OpenClaw 也可以通过已配置的广域 DNS-SD 域浏览同一个 Gateway 网关信标，因此设备发现可覆盖：

- 同一局域网中的 `local.`
- 用于跨网络发现的已配置单播 DNS-SD 域

目标方向：

- **Gateway 网关** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示“选择一个 Gateway 网关”的列表，然后保存所选端点。

故障排除和信标详情： [Bonjour](/zh-CN/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp`（Gateway 网关传输信标）
- TXT 键名（非秘密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>`（操作员配置的显示名称）
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789`（Gateway WS + HTTP）
  - `gatewayTls=1`（仅当启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅当启用 TLS 且指纹可用时）
  - `canvasPort=<port>`（canvas host 端口；当前在启用 canvas host 时与 `gatewayPort` 相同）
  - `tailnetDns=<magicdns>`（可选提示；当 Tailscale 可用时自动检测）
  - `sshPort=<port>`（仅限 mDNS 完整模式；广域 DNS-SD 可能省略此项，此时 SSH 默认仍为 `22`）
  - `cliPath=<path>`（仅限 mDNS 完整模式；广域 DNS-SD 仍会将其写入，作为远程安装提示）

安全说明：

- Bonjour / mDNS TXT 记录**未经身份验证**。客户端必须仅将 TXT 值视为用户体验提示。
- 路由（主机 / 端口）应优先使用**解析得到的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS pinning 绝不能允许广播出来的 `gatewayTlsSha256` 覆盖先前已存储的 pin。
- 对于 iOS/Android 节点，只要所选路径是安全 / 基于 TLS 的，就应在存储首次 pin 之前要求用户明确确认“信任此指纹”（带外验证）。

禁用 / 覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 可禁用广播。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway 网关绑定模式。
- `OPENCLAW_SSH_PORT` 会覆盖在发出 `sshPort` 时广播的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 会发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 会覆盖广播的 CLI 路径。

### 2）tailnet（跨网络）

对于 London / Vienna 风格的设置，Bonjour 不会有帮助。推荐的“直连”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果 Gateway 网关能检测到自己运行在 Tailscale 下，它会发布 `tailnetDns` 作为给客户端的可选提示（包括广域信标）。

macOS 应用现在在发现 Gateway 网关时会优先选择 MagicDNS 名称，而不是原始 Tailscale IP。这样在 tailnet IP 发生变化时（例如节点重启后或 CGNAT 重新分配之后）可靠性更高，因为 MagicDNS 名称会自动解析到当前 IP。

对于移动节点配对，发现提示不会放宽 tailnet / 公网路径上的传输安全要求：

- iOS/Android 仍然要求首次通过安全的 tailnet / 公网连接路径（`wss://` 或 Tailscale Serve / Funnel）进行连接。
- 发现到的原始 tailnet IP 只是路由提示，不代表可以使用明文远程 `ws://`。
- 私有局域网的直连 `ws://` 仍然受支持。
- 如果你想为移动节点使用最简单的 Tailscale 路径，请使用 Tailscale Serve，这样设备发现和设置代码都会解析到同一个安全的 MagicDNS 端点。

### 3）手动 / SSH 目标

当没有直连路径（或直连被禁用）时，客户端始终可以通过 SSH 转发 local loopback Gateway 网关端口进行连接。

请参阅 [远程访问](/zh-CN/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果已配置并且可访问已配对的直连端点，则使用它。
2. 否则，如果设备发现机制在 `local.` 或已配置的广域域中找到了 Gateway 网关，则提供“一键使用此 Gateway 网关”的选项，并将其保存为直连端点。
3. 否则，如果已配置 tailnet DNS / IP，则尝试直连。
   对于位于 tailnet / 公网路径上的移动节点，直连意味着安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直连传输）

Gateway 网关是节点 / 客户端准入的真实来源。

- 配对请求在 Gateway 网关中创建 / 批准 / 拒绝（参见 [Gateway pairing](/zh-CN/gateway/pairing)）。
- Gateway 网关强制执行：
  - 认证（token / keypair）
  - scope / ACL（Gateway 网关不是通向所有方法的原始代理）
  - 速率限制

## 各组件职责

- **Gateway 网关**：广播发现信标、负责配对决策，并托管 WS 端点。
- **macOS 应用**：帮助你选择 Gateway 网关、显示配对提示，并且仅在回退时使用 SSH。
- **iOS/Android 节点**：将 Bonjour 浏览作为一种便利能力，并连接到已配对的 Gateway WS。
