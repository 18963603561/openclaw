---
read_when:
    - 你想要能够跨会话和渠道工作的持久记忆
    - 你想要由 AI 驱动的回忆能力和用户建模
summary: 通过 Honcho 插件提供 AI 原生的跨会话记忆
title: Honcho 记忆
x-i18n:
    generated_at: "2026-04-08T04:01:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: 83ae3561152519a23589f754e0625f1e49c43e38f85de07686b963170a6cf229
    source_path: concepts\memory-honcho.md
    workflow: 15
---

# Honcho 记忆

[Honcho](https://honcho.dev) 为 OpenClaw 增加了 AI 原生记忆。它会将对话持久化到专用服务中，并随着时间推移构建用户和智能体模型，为你的智能体提供超越工作区 Markdown 文件的跨会话上下文。

## 它提供的功能

- **跨会话记忆** —— 每一轮对话结束后都会持久化保存，因此上下文可以跨越会话重置、压缩和渠道切换而延续。
- **用户建模** —— Honcho 会为每个用户维护一份档案（偏好、事实、沟通风格），也会为智能体维护档案（个性、学习到的行为）。
- **语义搜索** —— 可搜索过往对话中的观察结果，而不只是当前会话。
- **多智能体感知** —— 父智能体会自动跟踪已生成的子智能体，并将父智能体作为观察者加入子会话中。

## 可用工具

Honcho 会注册一些工具，供智能体在对话期间使用：

**数据检索（快速，无需 LLM 调用）：**

| 工具                        | 作用                                 |
| --------------------------- | ------------------------------------ |
| `honcho_context`            | 跨会话的完整用户表示                 |
| `honcho_search_conclusions` | 对已存储结论执行语义搜索             |
| `honcho_search_messages`    | 跨会话查找消息（可按发送者、日期筛选） |
| `honcho_session`            | 当前会话历史和摘要                   |

**问答（LLM 驱动）：**

| 工具         | 作用                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| `honcho_ask` | 就用户相关内容提问。`depth='quick'` 用于事实查询，`'thorough'` 用于综合分析 |

## 入门指南

安装插件并运行设置：

```bash
openclaw plugins install @honcho-ai/openclaw-honcho
openclaw honcho setup
openclaw gateway --force
```

设置命令会提示你输入 API 凭证、写入配置，并可选择迁移现有工作区记忆文件。

<Info>
Honcho 可以完全在本地运行（自托管），也可以通过托管 API `api.honcho.dev` 运行。自托管选项不需要任何外部依赖。
</Info>

## 配置

设置位于 `plugins.entries["openclaw-honcho"].config` 下：

```json5
{
  plugins: {
    entries: {
      "openclaw-honcho": {
        config: {
          apiKey: "your-api-key", // omit for self-hosted
          workspaceId: "openclaw", // memory isolation
          baseUrl: "https://api.honcho.dev",
        },
      },
    },
  },
}
```

对于自托管实例，请将 `baseUrl` 指向你的本地服务器（例如 `http://localhost:8000`），并省略 API 密钥。

## 迁移现有记忆

如果你已有工作区记忆文件（`USER.md`、`MEMORY.md`、`IDENTITY.md`、`memory/`、`canvas/`），`openclaw honcho setup` 会检测到它们并提供迁移选项。

<Info>
迁移是非破坏性的 —— 文件会上传到 Honcho。原始文件绝不会被删除或移动。
</Info>

## 工作原理

每次 AI 轮次结束后，对话都会被持久化到 Honcho。用户消息和智能体消息都会被观察，从而使 Honcho 能够随着时间推移构建并完善其模型。

在对话期间，Honcho 工具会在 `before_prompt_build` 阶段查询服务，在模型看到提示词之前注入相关上下文。这可确保轮次边界准确，并实现相关内容的有效回忆。

## Honcho 与内置记忆对比

|                   | 内置 / QMD                    | Honcho                              |
| ----------------- | ----------------------------- | ----------------------------------- |
| **存储**          | 工作区 Markdown 文件          | 专用服务（本地或托管）              |
| **跨会话**        | 通过记忆文件实现              | 自动，内置支持                      |
| **用户建模**      | 手动（写入 `MEMORY.md`）      | 自动档案                            |
| **搜索**          | 向量 + 关键词（混合）         | 基于观察结果的语义搜索              |
| **多智能体**      | 不跟踪                        | 感知父子关系                        |
| **依赖**          | 无（内置）或 QMD 二进制文件   | 安装插件                            |

Honcho 可以与内置记忆系统协同工作。配置了 QMD 后，还会额外提供工具，用于在 Honcho 的跨会话记忆之外，同时搜索本地 Markdown 文件。

## CLI 命令

```bash
openclaw honcho setup                        # Configure API key and migrate files
openclaw honcho status                       # Check connection status
openclaw honcho ask <question>               # Query Honcho about the user
openclaw honcho search <query> [-k N] [-d D] # Semantic search over memory
```

## 延伸阅读

- [插件源代码](https://github.com/plastic-labs/openclaw-honcho)
- [Honcho 文档](https://docs.honcho.dev)
- [Honcho OpenClaw 集成指南](https://docs.honcho.dev/v3/guides/integrations/openclaw)
- [记忆](/zh-CN/concepts/memory) —— OpenClaw 记忆概览
- [上下文引擎](/zh-CN/concepts/context-engine) —— 插件上下文引擎的工作方式
