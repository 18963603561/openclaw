---
read_when:
    - 你需要网络架构 + 安全概览
    - 你正在排查 local loopback 与 tailnet 访问或配对问题
    - 你想查看规范的网络文档列表
summary: 网络中心：Gateway 网关暴露面、配对、设备发现与安全
title: 网络
x-i18n:
    generated_at: "2026-04-08T06:08:07Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4a5f39d4f40ad19646d372000c85b663770eae412af91e1c175eb27b22208118
    source_path: network.md
    workflow: 15
---

# 网络中心

本中心页链接了 OpenClaw 在 localhost、LAN 和 tailnet 中如何连接、配对并保护
设备的核心文档。

## 核心模型

大多数操作都通过 Gateway 网关（`openclaw gateway`）流转。它是一个长期运行的单一进程，负责持有渠道连接和 WebSocket 控制平面。

- **Loopback 优先**：Gateway 网关 WS 默认为 `ws://127.0.0.1:18789`。
  非 loopback 绑定需要有效的 Gateway 网关认证路径：共享密钥
  token/password 认证，或已正确配置的非 loopback
  `trusted-proxy` 部署。
- 建议**每台主机只运行一个 Gateway 网关**。如需隔离，请使用隔离的配置文件和端口运行多个 Gateway 网关（[多个 Gateway 网关](/zh-CN/gateway/multiple-gateways)）。
- **Canvas host** 通过与 Gateway 网关相同的端口提供服务（`/__openclaw__/canvas/`、`/__openclaw__/a2ui/`），当绑定超出 loopback 范围时，会受 Gateway 网关认证保护。
- **远程访问**通常通过 SSH 隧道或 Tailscale VPN 实现（[远程访问](/zh-CN/gateway/remote)）。

关键参考：

- [Gateway 架构](/zh-CN/concepts/architecture)
- [Gateway 协议](/zh-CN/gateway/protocol)
- [Gateway 操作手册](/zh-CN/gateway)
- [Web 暴露面 + 绑定模式](/web)

## 配对 + 身份

- [配对概览（私信 + nodes）](/zh-CN/channels/pairing)
- [由 Gateway 网关管理的节点配对](/zh-CN/gateway/pairing)
- [Devices CLI（配对 + token 轮换）](/cli/devices)
- [Pairing CLI（私信审批）](/cli/pairing)

本地信任：

- 直接的本地 local loopback 连接可自动获批配对，以保持
  同主机 UX 流畅。
- OpenClaw 还提供了一条狭义的后端/容器本地自连接路径，
  用于受信任的共享密钥辅助流程。
- tailnet 和 LAN 客户端，包括同主机的 tailnet 绑定，仍然需要
  显式配对审批。

## 设备发现 + 传输协议

- [设备发现 + 传输协议](/zh-CN/gateway/discovery)
- [Bonjour / mDNS](/zh-CN/gateway/bonjour)
- [远程访问（SSH）](/zh-CN/gateway/remote)
- [Tailscale](/zh-CN/gateway/tailscale)

## 节点 + 传输协议

- [Nodes 概览](/zh-CN/nodes)
- [Bridge protocol（旧版节点，历史参考）](/zh-CN/gateway/bridge-protocol)
- [节点操作手册：iOS](/zh-CN/platforms/ios)
- [节点操作手册：Android](/zh-CN/platforms/android)

## 安全

- [安全概览](/zh-CN/gateway/security)
- [Gateway 配置参考](/zh-CN/gateway/configuration)
- [故障排除](/zh-CN/gateway/troubleshooting)
- [Doctor](/zh-CN/gateway/doctor)
