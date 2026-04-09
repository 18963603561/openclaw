---
read_when:
    - 你想了解 Task Flow 与后台任务之间的关系
    - 你在发行说明或文档中遇到 Task Flow 或 openclaw tasks flow
    - 你想检查或管理持久化流程状态
summary: 位于后台任务之上的任务流流程编排层
title: 任务流
x-i18n:
    generated_at: "2026-04-08T03:39:17Z"
    model: gpt-5.4
    provider: openai
    source_hash: 172871206b839845db807d9c627015890f7733b862e276853d5dbfbe29e03883
    source_path: automation\taskflow.md
    workflow: 15
---

# 任务流

Task Flow 是位于[后台任务](/zh-CN/automation/tasks)之上的流程编排底层。它管理具备自身状态、修订跟踪和同步语义的持久化多步骤流程，而单个任务仍然是脱离当前会话工作的基本单位。

## 何时使用任务流

当工作跨越多个顺序步骤或分支步骤，并且你需要在 Gateway 网关重启后仍能持续跟踪进度时，请使用 Task Flow。对于单个后台操作，普通的[任务](/zh-CN/automation/tasks)就已足够。

| 场景 | 用法 |
| ------------------------------------- | -------------------- |
| 单个后台作业 | 普通任务 |
| 多步骤流水线（A 然后 B 然后 C） | Task Flow（托管模式） |
| 观察外部创建的任务 | Task Flow（镜像模式） |
| 一次性提醒 | Cron 作业 |

## 同步模式

### 托管模式

Task Flow 端到端拥有整个生命周期。它将流程步骤创建为任务，推动其完成，并自动推进流程状态。

示例：一个每周报告流程，它会（1）收集数据，（2）生成报告，以及（3）发送报告。Task Flow 会将每个步骤创建为后台任务，等待完成，然后进入下一步。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 镜像模式

Task Flow 会观察外部创建的任务，并在不接管任务创建的情况下保持流程状态同步。当任务来自 cron 作业、CLI 命令或其他来源，而你希望以流程形式统一查看其进度时，这种方式非常有用。

示例：三个彼此独立的 cron 作业共同构成一个“morning ops”例行流程。镜像流程会跟踪它们的整体进度，但不控制它们何时运行或如何运行。

## 持久化状态与修订跟踪

每个流程都会持久化其自身状态，并跟踪修订，因此即使 Gateway 网关重启，进度也不会丢失。修订跟踪支持在多个来源同时尝试推进同一流程时进行冲突检测。

## 取消行为

`openclaw tasks flow cancel` 会在流程上设置一个粘性取消意图。流程中的活动任务会被取消，并且不会启动任何新步骤。该取消意图会在重启后继续保留，因此即使 Gateway 网关在所有子任务终止前重启，被取消的流程仍会保持取消状态。

## CLI 命令

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| 命令 | 说明 |
| --------------------------------- | --------------------------------------------- |
| `openclaw tasks flow list` | 显示已跟踪流程的状态和同步模式 |
| `openclaw tasks flow show <id>` | 按流程 id 或查找键检查单个流程 |
| `openclaw tasks flow cancel <id>` | 取消一个正在运行的流程及其活动任务 |

## 流程与任务的关系

流程协调任务，而不是替代任务。单个流程在其生命周期内可能会驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查编排这些任务的流程。

## 相关内容

- [后台任务](/zh-CN/automation/tasks) — 流程所协调的脱离当前会话工作台账
- [CLI???](/zh-CN/cli/index#tasks) — `openclaw tasks flow` 的 CLI 命令参考
- [自动化概览](/zh-CN/automation) — 所有自动化机制一览
- [????](/zh-CN/automation/cron-jobs) — 可能会接入流程的计划作业
