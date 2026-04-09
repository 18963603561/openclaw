---
read_when:
    - 编辑 IPC 协议或菜单栏应用 IPC
summary: OpenClaw 应用、Gateway 网关节点传输与 PeekabooBridge 的 macOS IPC 架构
title: macOS IPC
x-i18n:
    generated_at: "2026-04-08T06:39:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: d0211c334a4a59b71afb29dd7b024778172e529fa618985632d3d11d795ced92
    source_path: platforms\mac\xpc.md
    workflow: 15
---

# OpenClaw macOS IPC 架构

**当前模型：**本地 Unix socket 将**节点宿主服务**连接到 **macOS 应用**，用于 exec 审批和 `system.run`。还存在一个 `openclaw-mac` 调试 CLI，用于发现 / 连接检查；智能体操作仍通过 Gateway 网关 WebSocket 和 `node.invoke` 流转。UI 自动化使用 PeekabooBridge。

## 目标

- 单一 GUI 应用实例，负责所有面向 TCC 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 面向自动化的小型接口：Gateway 网关 + 节点命令，以及用于 UI 自动化的 PeekabooBridge。
- 可预测的权限：始终使用同一个已签名 bundle ID，并由 launchd 启动，因此 TCC 授权能够持续生效。

## 工作原理

### Gateway 网关 + 节点传输

- 应用运行 Gateway 网关（本地模式），并作为一个节点连接到它。
- 智能体操作通过 `node.invoke` 执行（例如 `system.run`、`system.notify`、`canvas.*`）。

### 节点服务 + 应用 IPC

- 一个无头节点宿主服务连接到 Gateway 网关 WebSocket。
- `system.run` 请求会通过本地 Unix socket 转发到 macOS 应用。
- 应用在 UI 上下文中执行 exec，必要时进行提示，并返回输出。

图示（SCI）：

```
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### PeekabooBridge（UI 自动化）

- UI 自动化使用一个名为 `bridge.sock` 的独立 UNIX socket，以及 PeekabooBridge JSON 协议。
- host 偏好顺序（客户端侧）：Peekaboo.app → Claude.app → OpenClaw.app → 本地执行。
- 安全性：bridge host 要求使用允许的 TeamID；仅限 DEBUG 的同 UID 逃生通道由 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 保护（Peekaboo 约定）。
- 详见：[PeekabooBridge 用法](/zh-CN/platforms/mac/peekaboo)。

## 运行流程

- 重启 / 重建：`SIGN_IDENTITY="Apple Development: <Developer Name> (<TEAMID>)" scripts/restart-mac.sh`
  - 杀掉现有实例
  - Swift 构建 + 打包
  - 写入 / 引导 / kickstart LaunchAgent
- 单实例：如果另一个具有相同 bundle ID 的实例正在运行，应用会提前退出。

## 加固说明

- 对所有特权接口，优先要求 TeamID 匹配。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅限 DEBUG）在本地开发时可能允许同 UID 调用方。
- 所有通信始终仅限本地；不暴露任何网络 socket。
- TCC 提示仅来自 GUI 应用 bundle；在重建过程中保持已签名 bundle ID 稳定。
- IPC 加固：socket 模式 `0600`、token、对等端 UID 检查、HMAC challenge/response、短 TTL。
