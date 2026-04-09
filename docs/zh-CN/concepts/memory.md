---
read_when:
    - 你想了解 memory 的工作方式
    - 你想知道应该写入哪些 memory 文件
summary: OpenClaw 如何跨会话记住内容
title: Memory 概览
x-i18n:
    generated_at: "2026-04-08T04:01:36Z"
    model: gpt-5.4
    provider: openai
    source_hash: d19d4fa9c4b3232b7a97f7a382311d2a375b562040de15e9fe4a0b1990b825e7
    source_path: concepts\memory.md
    workflow: 15
---

# Memory 概览

OpenClaw 通过在你的智能体工作区中写入**纯 Markdown 文件**来记住内容。
模型只会“记住”被保存到磁盘上的内容——不存在隐藏状态。

## 工作原理

你的智能体有三个与 memory 相关的文件：

- **`MEMORY.md`** —— 长期记忆。持久化的事实、偏好和决策。
  会在每次私信会话开始时加载。
- **`memory/YYYY-MM-DD.md`** —— 每日笔记。持续记录的上下文和观察。
  今天和昨天的笔记会自动加载。
- **`DREAMS.md`**（实验性，可选）—— Dream Diary 和 dreaming sweep
  摘要，供人工审阅。

这些文件位于智能体工作区中（默认是 `~/.openclaw/workspace`）。

<Tip>
如果你希望智能体记住某件事，直接告诉它即可：“Remember that I
prefer TypeScript.” 它会将内容写入合适的文件。
</Tip>

## Memory 工具

智能体有两个用于处理 memory 的工具：

- **`memory_search`** —— 使用语义搜索查找相关笔记，即使措辞与原文不同也可以找到。
- **`memory_get`** —— 读取指定的 memory 文件或行范围。

这两个工具都由当前启用的 memory 插件提供（默认：`memory-core`）。

## Memory 搜索

配置好 embedding 提供商后，`memory_search` 会使用**混合搜索**——结合向量相似度（语义含义）与关键词匹配（如 ID 和代码符号等精确术语）。只要你为任意受支持的提供商配置了 API 密钥，它就能开箱即用。

<Info>
OpenClaw 会根据可用的 API 密钥自动检测你的 embedding 提供商。
如果你已配置 OpenAI、Gemini、Voyage 或 Mistral 的密钥，memory 搜索将自动启用。
</Info>

有关搜索工作原理、调优选项以及提供商设置的详细信息，请参见
[Memory Search](/zh-CN/concepts/memory-search)。

## Memory 后端

<CardGroup cols={3}>
<Card title="内置（默认）" icon="database" href="/zh-CN/concepts/memory-builtin">
基于 SQLite。开箱即用，支持关键词搜索、向量相似度和混合搜索。
无需额外依赖。
</Card>
<Card title="QMD" icon="search" href="/zh-CN/concepts/memory-qmd">
本地优先的 sidecar，支持重排序、查询扩展，以及为工作区外目录建立索引。
</Card>
<Card title="Honcho" icon="brain" href="/zh-CN/concepts/memory-honcho">
AI 原生的跨会话 memory，支持用户建模、语义搜索和多智能体感知。
需要安装插件。
</Card>
</CardGroup>

## 自动 memory flush

在 [compaction](/zh-CN/concepts/compaction) 对你的对话进行总结之前，OpenClaw
会运行一个静默轮次，提醒智能体将重要上下文保存到 memory 文件中。
此功能默认开启——你无需进行任何配置。

<Tip>
memory flush 可防止在 compaction 期间丢失上下文。如果你的智能体在对话中有尚未写入文件的重要事实，这些内容会在生成摘要之前自动保存。
</Tip>

## Dreaming（实验性）

Dreaming 是一种可选的后台 memory 整合流程。它会收集短期信号、为候选项打分，并只将符合条件的条目提升到长期记忆（`MEMORY.md`）中。

其设计目标是让长期记忆保持高信噪比：

- **选择启用**：默认关闭。
- **按计划执行**：启用后，`memory-core` 会自动管理一个用于完整 dreaming sweep 的周期性 cron job。
- **阈值控制**：晋升必须通过分数、回忆频率和查询多样性门槛。
- **可审查**：阶段摘要和 diary 条目会写入 `DREAMS.md`，供人工审阅。

有关各阶段行为、评分信号以及 Dream Diary 细节，请参见
[Dreaming (experimental)](/zh-CN/concepts/dreaming)。

## CLI

```bash
openclaw memory status          # 检查索引状态和提供商
openclaw memory search "query"  # 从命令行搜索
openclaw memory index --force   # 重建索引
```

## 延伸阅读

- [Builtin Memory Engine](/zh-CN/concepts/memory-builtin) —— 默认的 SQLite 后端
- [QMD Memory Engine](/zh-CN/concepts/memory-qmd) —— 高级本地优先 sidecar
- [Honcho Memory](/zh-CN/concepts/memory-honcho) —— AI 原生跨会话 memory
- [Memory Search](/zh-CN/concepts/memory-search) —— 搜索流水线、提供商与调优
- [Dreaming (experimental)](/zh-CN/concepts/dreaming) —— 将短期回溯内容在后台提升到长期记忆
- [Memory configuration reference](/reference/memory-config) —— 所有配置项
- [Compaction](/zh-CN/concepts/compaction) —— compaction 如何与 memory 交互
