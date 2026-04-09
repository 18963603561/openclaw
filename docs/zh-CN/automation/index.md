---
read_when:
    - 决定如何使用 OpenClaw 自动化工作
    - 在 heartbeat、cron、hooks 和 standing orders 之间进行选择
    - 寻找合适的自动化入口点
summary: 自动化机制概览：任务、cron、hooks、standing orders 和任务流
title: 自动化与任务
x-i18n:
    generated_at: "2026-04-08T03:38:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: 13cd05dcd2f38737f7bb19243ad1136978bfd727006fd65226daa3590f823afe
    source_path: automation\index.md
    workflow: 15
---

# 自动化与任务

OpenClaw 通过任务、计划作业、事件 hooks 和常驻指令在后台运行工作。本页将帮助你选择合适的机制，并理解它们如何协同工作。

## 快速决策指南

```mermaid
flowchart TD
    START([你需要什么？]) --> Q1{安排工作？}
    START --> Q2{跟踪脱离当前会话的工作？}
    START --> Q3{编排多步骤流程？}
    START --> Q4{对生命周期事件作出反应？}
    START --> Q5{为智能体提供持久指令？}

    Q1 -->|是| Q1a{精确时间还是灵活时间？}
    Q1a -->|精确| CRON["计划任务（Cron）"]
    Q1a -->|灵活| HEARTBEAT[Heartbeat]

    Q2 -->|是| TASKS[后台任务]
    Q3 -->|是| FLOW[任务流]
    Q4 -->|是| HOOKS[Hooks]
    Q5 -->|是| SO[Standing Orders]
```

| 使用场景 | 推荐方案 | 原因 |
| --------------------------------------- | ---------------------- | ------------------------------------------------ |
| 每天上午 9 点准时发送日报 | 计划任务（Cron） | 时间精确，执行隔离 |
| 20 分钟后提醒我 | 计划任务（Cron） | 一次性任务且时间精确（`--at`） |
| 每周运行一次深度分析 | 计划任务（Cron） | 独立任务，可使用不同模型 |
| 每 30 分钟检查一次收件箱 | Heartbeat | 可与其他检查批量执行，具备上下文感知 |
| 监控日历中的即将到来事件 | Heartbeat | 非常适合周期性感知 |
| 检查子智能体或 ACP 运行的状态 | 后台任务 | 任务台账会跟踪所有脱离当前会话的工作 |
| 审计运行了什么以及运行时间 | 后台任务 | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步骤研究后再总结 | 任务流 | 具备修订跟踪的持久化编排 |
| 在会话重置时运行脚本 | Hooks | 事件驱动，在生命周期事件上触发 |
| 在每次工具调用时执行代码 | Hooks | Hooks 可按事件类型进行过滤 |
| 在回复前始终检查合规性 | Standing Orders | 自动注入到每个会话中 |

### 计划任务（Cron）与 Heartbeat 的比较

| 维度 | 计划任务（Cron） | Heartbeat |
| --------------- | ----------------------------------- | ------------------------------------- |
| 时间控制 | 精确（cron 表达式、一次性任务） | 近似（默认每 30 分钟一次） |
| 会话上下文 | 全新（隔离）或共享 | 完整主会话上下文 |
| 任务记录 | 始终创建 | 从不创建 |
| 交付方式 | 渠道、webhook 或静默 | 主会话内联 |
| 最适合 | 报告、提醒、后台作业 | 收件箱检查、日历、通知 |

当你需要精确时间控制或隔离执行时，请使用计划任务（Cron）。当工作受益于完整会话上下文且可接受近似时间控制时，请使用 Heartbeat。

## 核心概念

### 计划任务（cron）

Cron 是 Gateway 网关内置的精确定时调度器。它会持久化作业，在正确的时间唤醒智能体，并可将输出发送到聊天渠道或 webhook 端点。支持一次性提醒、周期性表达式以及入站 webhook 触发器。

参见 [计划任务](/zh-CN/automation/cron-jobs)。

### 任务

后台任务台账会跟踪所有脱离当前会话的工作：ACP 运行、子智能体生成、隔离的 cron 执行以及 CLI 操作。任务是记录，不是调度器。使用 `openclaw tasks list` 和 `openclaw tasks audit` 进行检查。

参见 [后台任务](/zh-CN/automation/tasks)。

### 任务流

任务流是位于后台任务之上的流程编排底层。它管理持久化的多步骤流程，支持托管和镜像同步模式、修订跟踪，以及用于检查的 `openclaw tasks flow list|show|cancel`。

参见 [任务流](/zh-CN/automation/taskflow)。

### 常驻指令

Standing orders 为智能体授予已定义程序的永久操作权限。它们存储在工作区文件中（通常为 `AGENTS.md`），并会注入到每个会话中。可与 cron 结合使用以实现基于时间的强制执行。

参见 [Standing Orders](/zh-CN/automation/standing-orders)。

### Hooks

Hooks 是由智能体生命周期事件（`/new`、`/reset`、`/stop`）、会话压缩、Gateway 网关启动、消息流以及工具调用触发的事件驱动脚本。Hooks 会从目录中自动发现，也可以通过 `openclaw hooks` 进行管理。

参见 [Hooks](/zh-CN/automation/hooks)。

### Heartbeat

Heartbeat 是周期性的主会话轮次（默认每 30 分钟一次）。它会在一次具备完整会话上下文的智能体轮次中批量执行多项检查（收件箱、日历、通知）。Heartbeat 轮次不会创建任务记录。若只需一个小型检查清单，请使用 `HEARTBEAT.md`；若你希望在 heartbeat 内部仅在到期时执行周期性检查，请使用 `tasks:` 代码块。空的 heartbeat 文件会以 `empty-heartbeat-file` 跳过；仅到期任务模式会以 `no-tasks-due` 跳过。

参见 [Heartbeat](/zh-CN/gateway/heartbeat)。

## 它们如何协同工作

- **Cron** 处理精确定时计划（每日报告、每周回顾）和一次性提醒。所有 cron 执行都会创建任务记录。
- **Heartbeat** 每 30 分钟以一次批处理轮次执行常规监控（收件箱、日历、通知）。
- **Hooks** 通过自定义脚本对特定事件（工具调用、会话重置、压缩）作出响应。
- **Standing orders** 为智能体提供持久上下文和权限边界。
- **任务流** 在单个任务之上协调多步骤流程。
- **Tasks** 会自动跟踪所有脱离当前会话的工作，以便你检查和审计。

## 相关内容

- [计划任务](/zh-CN/automation/cron-jobs) — 精确定时调度和一次性提醒
- [后台任务](/zh-CN/automation/tasks) — 所有脱离当前会话工作的任务台账
- [任务流](/zh-CN/automation/taskflow) — 持久化多步骤流程编排
- [Hooks](/zh-CN/automation/hooks) — 事件驱动的生命周期脚本
- [Standing Orders](/zh-CN/automation/standing-orders) — 持久化智能体指令
- [Heartbeat](/zh-CN/gateway/heartbeat) — 周期性主会话轮次
- [配置参考](/zh-CN/gateway/configuration-reference) — 所有配置键
