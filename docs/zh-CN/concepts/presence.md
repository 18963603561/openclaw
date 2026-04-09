---
read_when:
    - 调试 Instances 标签页
    - 调查重复或过期的实例行
    - 更改 Gateway 网关 WebSocket 连接或 system-event 信标
summary: OpenClaw 的 presence 条目如何产生、合并与显示
title: Presence
x-i18n:
    generated_at: "2026-04-08T04:04:12Z"
    model: gpt-5.4
    provider: openai
    source_hash: a004a1f87be08699c1b2cba97cad8678ce5e27baa425f59eaa18006fdcff26e7
    source_path: concepts\presence.md
    workflow: 15
---

# Presence

OpenClaw 的 “presence” 是一种轻量级、尽力而为的视图，用于展示：

- **Gateway 网关** 本身，以及
- **连接到 Gateway 网关的客户端**（mac 应用、WebChat、CLI 等）

Presence 主要用于渲染 macOS 应用的 **Instances** 标签页，并为运维人员提供快速可见性。

## Presence 字段（会显示什么）

Presence 条目是结构化对象，包含以下字段：

- `instanceId`（可选，但强烈建议提供）：稳定的客户端身份（通常为 `connect.client.instanceId`）
- `host`：易读的主机名
- `ip`：尽力而为的 IP 地址
- `version`：客户端版本字符串
- `deviceFamily` / `modelIdentifier`：硬件提示信息
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node` 等
- `lastInputSeconds`：”距上次用户输入的秒数“（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic` 等
- `ts`：最后更新时间戳（自 Unix 纪元以来的毫秒数）

## 生产者（presence 来自哪里）

Presence 条目由多个来源生成，并会被**合并**。

### 1）Gateway 网关自身条目

Gateway 网关会在启动时始终写入一条 “self” 条目，这样即使还没有客户端连接，UI 也能显示 Gateway 网关主机。

### 2）WebSocket 连接

每个 WS 客户端都会从一个 `connect` 请求开始。握手成功后，Gateway 网关会为该连接插入或更新一条 presence 条目。

#### 为什么一次性的 CLI 命令不会显示出来

CLI 通常会为短暂的一次性命令建立连接。为了避免刷屏 Instances 列表，`client.mode === "cli"` **不会**被转换为 presence 条目。

### 3）`system-event` 信标

客户端可以通过 `system-event` 方法发送更丰富的周期性信标。mac 应用会用它来上报主机名、IP 和 `lastInputSeconds`。

### 4）节点连接（role: node）

当节点通过 Gateway 网关 WebSocket 并以 `role: node` 连接时，Gateway 网关会为该节点插入或更新一条 presence 条目（流程与其他 WS 客户端相同）。

## 合并 + 去重规则（为什么 `instanceId` 很重要）

Presence 条目存储在单个内存映射中：

- 条目通过一个 **presence key** 作为键。
- 最佳键是稳定的 `instanceId`（来自 `connect.client.instanceId`），它在重启后仍能保持不变。
- 键不区分大小写。

如果客户端重新连接时没有稳定的 `instanceId`，它可能会显示为**重复**行。

## TTL 和有界大小

Presence 本身就是有意设计为临时性的：

- **TTL：** 超过 5 分钟的条目会被清理
- **最大条目数：** 200（最旧的优先被丢弃）

这样可以保持列表内容新鲜，并避免内存无限增长。

## 远程/隧道注意事项（loopback IP）

当客户端通过 SSH 隧道 / 本地端口转发连接时，Gateway 网关看到的远端地址可能是 `127.0.0.1`。为避免覆盖客户端已上报的有效 IP，loopback 远端地址会被忽略。

## 使用方

### macOS Instances 标签页

macOS 应用会渲染 `system-presence` 的输出，并根据最后更新时间的时效性应用一个小型状态指示器（Active/Idle/Stale）。

## 调试提示

- 如需查看原始列表，请对 Gateway 网关调用 `system-presence`。
- 如果你看到重复项：
  - 确认客户端在握手时发送了稳定的 `client.instanceId`
  - 确认周期性信标使用相同的 `instanceId`
  - 检查基于连接派生的条目是否缺少 `instanceId`（这种情况下出现重复是预期行为）
