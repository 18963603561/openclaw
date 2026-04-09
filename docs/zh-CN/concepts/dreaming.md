---
read_when:
    - 你希望 memory 提升能够自动运行
    - 你想了解每个 dreaming 阶段的作用
    - 你想在不污染 `MEMORY.md` 的前提下调优 consolidation
summary: 带有 light、deep 和 REM 阶段及 Dream Diary 的后台 memory consolidation
title: Dreaming（实验性）
x-i18n:
    generated_at: "2026-04-08T03:59:17Z"
    model: gpt-5.4
    provider: openai
    source_hash: 36c4b1e70801d662090dc8ce20608c2f141c23cd7ce53c54e3dcf332c801fd4e
    source_path: concepts\dreaming.md
    workflow: 15
---

# Dreaming（实验性）

Dreaming 是 `memory-core` 中的后台 memory consolidation 系统。
它帮助 OpenClaw 将强烈的短期信号转移到持久 memory 中，同时
保持整个过程可解释、可审查。

Dreaming 为**选择启用**功能，默认关闭。

## Dreaming 会写入什么

Dreaming 会保留两类输出：

- **机器状态**，位于 `memory/.dreams/`（recall store、phase signals、ingestion checkpoints、locks）。
- **人类可读输出**，位于 `DREAMS.md`（或已有的 `dreams.md`）以及可选的阶段报告文件 `memory/dreaming/<phase>/YYYY-MM-DD.md`。

长期提升仍然只会写入 `MEMORY.md`。

## 阶段模型

Dreaming 使用三个协作阶段：

| 阶段 | 目的 | 持久写入 |
| ----- | ----------------------------------------- | ----------------- |
| Light | 对近期短期材料进行整理和暂存 | 否 |
| Deep  | 对持久候选进行评分和提升 | 是（`MEMORY.md`） |
| REM   | 反思主题和重复出现的想法 | 否 |

这些阶段是内部实现细节，不是单独面向用户配置的
“模式”。

### Light 阶段

Light 阶段会摄取近期每日 memory 信号和 recall traces，对其去重，
并暂存候选行。

- 从短期 recall 状态和近期每日 memory 文件读取。
- 当存储包含内联输出时，会写入一个受管的 `## Light Sleep` 块。
- 记录 reinforcement signals，以供后续 deep 排名使用。
- 绝不会写入 `MEMORY.md`。

### Deep 阶段

Deep 阶段决定哪些内容会变成长期 memory。

- 使用加权评分和阈值门控对候选进行排序。
- 需要通过 `minScore`、`minRecallCount` 和 `minUniqueQueries`。
- 在写入前会从实时每日文件中重新提取 snippet，因此过期/已删除的 snippet 会被跳过。
- 将提升后的条目追加到 `MEMORY.md`。
- 将 `## Deep Sleep` 摘要写入 `DREAMS.md`，并可选写入 `memory/dreaming/deep/YYYY-MM-DD.md`。

### REM 阶段

REM 阶段提取模式和反思性信号。

- 根据近期短期 traces 构建主题和反思摘要。
- 当存储包含内联输出时，会写入一个受管的 `## REM Sleep` 块。
- 记录供 deep 排名使用的 REM reinforcement signals。
- 绝不会写入 `MEMORY.md`。

## Dream Diary

Dreaming 还会在 `DREAMS.md` 中维护一份叙事性的 **Dream Diary**。
当每个阶段积累到足够材料后，`memory-core` 会运行一次尽力而为的后台
子智能体轮次（使用默认运行时模型），并追加一条简短的 diary 条目。

这份 diary 供人在 Dreams UI 中阅读，不是提升来源。

## Deep 排名信号

Deep 排名使用六个加权基础信号，再加上阶段 reinforcement：

| 信号 | 权重 | 说明 |
| ------------------- | ------ | ------------------------------------------------- |
| Frequency | 0.24 | 条目积累了多少短期信号 |
| Relevance | 0.30 | 条目的平均检索质量 |
| Query diversity | 0.15 | 使其浮现的不同 query/日期上下文 |
| Recency | 0.15 | 经过时间衰减的新鲜度分数 |
| Consolidation | 0.10 | 跨多日重复出现的强度 |
| Conceptual richness | 0.06 | 来自 snippet/path 的概念标签密度 |

Light 和 REM 阶段命中会从
`memory/.dreams/phase-signals.json` 增加一个小幅、按时间衰减的加成。

## 调度

启用后，`memory-core` 会为一次完整的 dreaming
sweep 自动管理一个 cron job。每次 sweep 会按顺序运行各阶段：light -> REM -> deep。

默认 cadence 行为：

| 设置 | 默认值 |
| -------------------- | ----------- |
| `dreaming.frequency` | `0 3 * * *` |

## 快速开始

启用 dreaming：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true
          }
        }
      }
    }
  }
}
```

使用自定义 sweep cadence 启用 dreaming：

```json
{
  "plugins": {
    "entries": {
      "memory-core": {
        "config": {
          "dreaming": {
            "enabled": true,
            "timezone": "America/Los_Angeles",
            "frequency": "0 */6 * * *"
          }
        }
      }
    }
  }
}
```

## Slash 命令

```
/dreaming status
/dreaming on
/dreaming off
/dreaming help
```

## CLI 工作流

使用 CLI 提升进行预览或手动应用：

```bash
openclaw memory promote
openclaw memory promote --apply
openclaw memory promote --limit 5
openclaw memory status --deep
```

手动 `memory promote` 默认使用 deep 阶段阈值，除非你通过
CLI flags 覆盖。

解释某个特定候选为何会或不会被提升：

```bash
openclaw memory promote-explain "router vlan"
openclaw memory promote-explain "router vlan" --json
```

预览 REM 反思、候选事实和 deep 提升输出，而不写入任何内容：

```bash
openclaw memory rem-harness
openclaw memory rem-harness --json
```

## 关键默认值

所有设置都位于 `plugins.entries.memory-core.config.dreaming` 之下。

| 键 | 默认值 |
| ----------- | ----------- |
| `enabled` | `false` |
| `frequency` | `0 3 * * *` |

阶段策略、阈值和存储行为属于内部实现
细节（不是面向用户的配置）。

完整键列表请参见[Memory 配置参考](/reference/memory-config#dreaming-experimental)。

## Dreams UI

启用后，Gateway 网关 的 **Dreams** 标签页会显示：

- 当前 dreaming 启用状态
- 阶段级状态和受管 sweep 存在情况
- 短期、长期和今日提升数量
- 下一次计划运行时间
- 一个基于 `doctor.memory.dreamDiary` 的可展开 Dream Diary 阅读器

## 相关内容

- [Memory](/concepts/memory)
- [Memory Search](/concepts/memory-search)
- [memory CLI](/cli/memory)
- [Memory 配置参考](/reference/memory-config)
