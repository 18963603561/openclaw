---
read_when:
    - 你想通过 CLI 编辑 exec 审批
    - 你需要管理 Gateway 网关或节点宿主机上的允许列表
summary: '`openclaw approvals` 的 CLI 参考（用于 gateway 或节点宿主机的 exec 审批）'
title: approvals
x-i18n:
    generated_at: "2026-04-08T03:50:07Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7b2532bfd3e6e6ce43c96a2807df2dd00cb7b4320b77a7dfd09bee0531da610e
    source_path: cli\approvals.md
    workflow: 15
---

# `openclaw approvals`

管理 **本地宿主机**、**Gateway 网关宿主机** 或 **节点宿主机** 的 exec 审批。
默认情况下，命令会以磁盘上的本地审批文件为目标。使用 `--gateway` 以 Gateway 网关为目标，或使用 `--node` 以特定节点为目标。

别名：`openclaw exec-approvals`

相关内容：

- Exec 审批：[Exec ??](/zh-CN/tools/exec-approvals)
- 节点：[??](/zh-CN/nodes)

## 常用命令

```bash
openclaw approvals get
openclaw approvals get --node <id|name|ip>
openclaw approvals get --gateway
```

`openclaw approvals get` 现在会显示本地、Gateway 网关和节点目标的生效 exec 策略：

- 请求的 `tools.exec` 策略
- 宿主机审批文件策略
- 应用优先级规则后的生效结果

这种优先级是有意设计的：

- 宿主机审批文件是可执行的事实来源
- 请求的 `tools.exec` 策略可以收紧或放宽意图，但生效结果仍然由宿主机规则推导得出
- `--node` 会将节点宿主机审批文件与 Gateway 网关 `tools.exec` 策略组合起来，因为运行时两者都会生效
- 如果 Gateway 网关配置不可用，CLI 会回退到节点审批快照，并注明无法计算最终运行时策略

## 用文件替换审批配置

```bash
openclaw approvals set --file ./exec-approvals.json
openclaw approvals set --stdin <<'EOF'
{ version: 1, defaults: { security: "full", ask: "off" } }
EOF
openclaw approvals set --node <id|name|ip> --file ./exec-approvals.json
openclaw approvals set --gateway --file ./exec-approvals.json
```

`set` 接受 JSON5，而不仅仅是严格 JSON。使用 `--file` 或 `--stdin` 其中之一，不要同时使用两者。

## “永不提示” / YOLO 示例

对于一个不应因 exec 审批而中断的宿主机，将宿主机审批默认值设为 `full` + `off`：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

节点变体：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

这只会更改**宿主机审批文件**。如需让请求的 OpenClaw 策略也保持一致，还应设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
```

本示例中为什么使用 `tools.exec.host=gateway`：

- `host=auto` 仍然表示“如果可用则使用沙箱，否则使用 gateway”。
- YOLO 讨论的是审批，而不是路由。
- 如果你希望即使配置了沙箱也仍使用宿主机 exec，请通过 `gateway` 或 `/exec host=gateway` 显式指定宿主机选择。

这与当前宿主机默认 YOLO 行为一致。如果你需要审批，请收紧它。

## 允许列表辅助命令

```bash
openclaw approvals allowlist add "~/Projects/**/bin/rg"
openclaw approvals allowlist add --agent main --node <id|name|ip> "/usr/bin/uptime"
openclaw approvals allowlist add --agent "*" "/usr/bin/uname"

openclaw approvals allowlist remove "~/Projects/**/bin/rg"
```

## 常用选项

`get`、`set` 和 `allowlist add|remove` 都支持：

- `--node <id|name|ip>`
- `--gateway`
- 共享节点 RPC 选项：`--url`、`--token`、`--timeout`、`--json`

目标说明：

- 不带目标标志表示使用磁盘上的本地审批文件
- `--gateway` 以 Gateway 网关宿主机审批文件为目标
- `--node` 会在解析 id、名称、IP 或 id 前缀后，以某个节点宿主机为目标

`allowlist add|remove` 还支持：

- `--agent <id>`（默认值为 `*`）

## 说明

- `--node` 使用与 `openclaw nodes` 相同的解析器（id、名称、ip 或 id 前缀）。
- `--agent` 默认是 `"*"`，适用于所有智能体。
- 节点宿主机必须声明 `system.execApprovals.get/set`（macOS 应用或无头节点宿主机）。
- 审批文件按宿主机存储在 `~/.openclaw/exec-approvals.json`。
