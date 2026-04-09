---
read_when:
    - 调整 mac 菜单 UI 或状态逻辑时
summary: 菜单栏状态逻辑以及向用户展示的内容
title: 菜单栏
x-i18n:
    generated_at: "2026-04-08T06:37:45Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8eb73c0e671a76aae4ebb653c65147610bf3e6d3c9c0943d150e292e7761d16d
    source_path: platforms\mac\menu-bar.md
    workflow: 15
---

# 菜单栏状态逻辑

## 显示内容

- 我们会在菜单栏图标以及菜单中的第一行状态行中展示当前智能体工作状态。
- 当工作处于活动状态时，健康状态会被隐藏；当所有会话都空闲时，它会重新显示。
- 菜单中的 “Nodes” 区块仅列出**设备**（通过 `node.list` 配对的节点），不包括客户端 / 在线状态条目。
- 当提供商用量快照可用时，会在 Context 下显示一个 “Usage” 部分。

## 状态模型

- 会话：事件到达时会携带 `runId`（每次运行唯一）以及负载中的 `sessionKey`。`main` 会话对应的键是 `main`；如果不存在，则回退到最近一次更新的会话。
- 优先级：main 始终优先。如果 main 处于活动状态，则立即显示其状态。如果 main 处于空闲状态，则显示最近一次处于活动状态的非 main 会话。我们不会在活动期间来回切换；只有当当前会话变为空闲，或 main 变为活动状态时，才会切换。
- 活动类型：
  - `job`：高层级命令执行（`state: started|streaming|done|error`）。
  - `tool`：`phase: start|result`，带有 `toolName` 和 `meta/args`。

## `IconState` 枚举（Swift）

- `idle`
- `workingMain(ActivityKind)`
- `workingOther(ActivityKind)`
- `overridden(ActivityKind)`（调试覆盖）

### `ActivityKind` → 图标符号

- `exec` → 💻
- `read` → 📄
- `write` → ✍️
- `edit` → 📝
- `attach` → 📎
- 默认 → 🛠️

### 视觉映射

- `idle`：正常生物图标。
- `workingMain`：带图标符号徽标、完整着色、腿部“工作中”动画。
- `workingOther`：带图标符号徽标、弱化着色、不做奔移动画。
- `overridden`：无论活动状态如何，都使用所选的图标符号 / 着色。

## 状态行文本（菜单）

- 当工作处于活动状态时：`<会话角色> · <活动标签>`
  - 示例：`Main · exec: pnpm test`、`Other · read: apps/macos/Sources/OpenClaw/AppState.swift`。
- 当处于空闲状态时：回退为健康状态摘要。

## 事件摄取

- 来源：控制渠道 `agent` 事件（`ControlChannel.handleAgentEvent`）。
- 解析字段：
  - `stream: "job"`，使用 `data.state` 表示开始 / 停止。
  - `stream: "tool"`，使用 `data.phase`、`name`，以及可选的 `meta` / `args`。
- 标签：
  - `exec`：`args.command` 的第一行。
  - `read` / `write`：缩短后的路径。
  - `edit`：路径，加上根据 `meta` / diff 计数推断出的变更类型。
  - 回退：工具名称。

## 调试覆盖

- 设置 ▸ 调试 ▸ “图标覆盖” 选择器：
  - `System (auto)`（默认）
  - `Working: main`（按各工具类型）
  - `Working: other`（按各工具类型）
  - `Idle`
- 通过 `@AppStorage("iconOverride")` 存储；映射到 `IconState.overridden`。

## 测试检查清单

- 触发 main 会话 job：验证图标立即切换，且状态行显示 main 标签。
- 在 main 空闲时触发非 main 会话 job：图标 / 状态显示非 main；在其完成前保持稳定。
- 当其他会话处于活动状态时启动 main：图标立即切换为 main。
- 快速工具突发：确保徽标不会闪烁（对工具结果应用 TTL 宽限）。
- 一旦所有会话都空闲，健康状态行会重新出现。
