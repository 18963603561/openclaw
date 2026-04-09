---
read_when:
    - 你想了解 OpenClaw 如何组装模型上下文
    - 你正在旧版引擎和插件引擎之间切换
    - 你正在构建一个上下文引擎插件
summary: 上下文引擎：可插拔的上下文组装、压缩和子智能体生命周期
title: 上下文引擎
x-i18n:
    generated_at: "2026-04-08T03:59:11Z"
    model: gpt-5.4
    provider: openai
    source_hash: e8290ac73272eee275bce8e481ac7959b65386752caa68044d0c6f3e450acfb1
    source_path: concepts\context-engine.md
    workflow: 15
---

# 上下文引擎

**上下文引擎**控制 OpenClaw 在每次运行时如何构建模型上下文。
它决定包含哪些消息、如何总结较旧的历史，以及如何跨子智能体边界管理上下文。

OpenClaw 内置了一个 `legacy` 引擎。插件可以注册
替代引擎，以替换活动上下文引擎生命周期。

## 快速开始

检查当前活动的是哪个引擎：

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### 安装上下文引擎插件

上下文引擎插件的安装方式与其他 OpenClaw 插件相同。先安装，
再在 slot 中选择该引擎：

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

然后在配置中启用该插件，并将其选为活动引擎：

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // must match the plugin's registered engine id
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // Plugin-specific config goes here (see the plugin's docs)
      },
    },
  },
}
```

安装并配置后，重启 Gateway 网关。

如果要切回内置引擎，将 `contextEngine` 设为 `"legacy"`（或者
直接移除该键 —— `"legacy"` 是默认值）。

## 工作原理

每次 OpenClaw 运行模型提示时，上下文引擎都会参与
四个生命周期节点：

1. **摄取** —— 当有新消息加入会话时调用。引擎
   可以将消息存储或索引到自己的数据存储中。
2. **组装** —— 在每次模型运行前调用。引擎返回一组有序
   消息（以及可选的 `systemPromptAddition`），这些内容能够适配
   token 预算。
3. **压缩** —— 当上下文窗口已满，或用户运行
   `/compact` 时调用。引擎会总结较旧的历史以释放空间。
4. **轮次后处理** —— 在一次运行完成后调用。引擎可以持久化状态、
   触发后台压缩或更新索引。

### 子智能体生命周期（可选）

OpenClaw 当前会调用一个子智能体生命周期钩子：

- **onSubagentEnded** —— 当子智能体会话完成或被清扫时执行清理。

`prepareSubagentSpawn` 钩子属于接口的一部分，供未来使用，但
运行时目前尚不会调用它。

### system prompt 补充

`assemble` 方法可以返回一个 `systemPromptAddition` 字符串。OpenClaw
会将其前置到本次运行的 system prompt 中。这使引擎能够注入动态召回指导、
检索说明或上下文感知提示，而无需依赖静态工作区文件。

## legacy 引擎

内置的 `legacy` 引擎保留了 OpenClaw 的原始行为：

- **摄取**：空操作（消息持久化直接由会话管理器处理）。
- **组装**：透传（运行时中现有的 sanitize → validate → limit 流水线
  负责上下文组装）。
- **压缩**：委托给内置的总结式压缩，它会对较旧消息生成
  一个汇总，并保留最近消息不变。
- **轮次后处理**：空操作。

legacy 引擎不会注册工具，也不会提供 `systemPromptAddition`。

当未设置 `plugins.slots.contextEngine`（或其值为 `"legacy"`）时，
会自动使用此引擎。

## 插件引擎

插件可以使用插件 API 注册一个上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

然后在配置中启用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### ContextEngine 接口

必需成员：

| 成员 | 类型 | 用途 |
| ------------------ | -------- | -------------------------------------------------------- |
| `info` | 属性 | 引擎 ID、名称、版本，以及它是否拥有压缩控制权 |
| `ingest(params)` | 方法 | 存储单条消息 |
| `assemble(params)` | 方法 | 为模型运行构建上下文（返回 `AssembleResult`） |
| `compact(params)` | 方法 | 总结/缩减上下文 |

`assemble` 返回一个 `AssembleResult`，包含：

- `messages` —— 要发送给模型的有序消息。
- `estimatedTokens`（必填，`number`）—— 引擎对已组装上下文中
  token 总数的估算。OpenClaw 会用它来做压缩阈值决策
  和诊断报告。
- `systemPromptAddition`（可选，`string`）—— 前置到 system prompt 中。

可选成员：

| 成员 | 类型 | 用途 |
| ------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------- |
| `bootstrap(params)` | 方法 | 为会话初始化引擎状态。当引擎首次看到某个会话时调用一次（例如导入历史）。 |
| `ingestBatch(params)` | 方法 | 以批次方式摄取一个完整轮次。在一次运行完成后调用，并一次性传入该轮次的全部消息。 |
| `afterTurn(params)` | 方法 | 运行后生命周期处理（持久化状态、触发后台压缩）。 |
| `prepareSubagentSpawn(params)` | 方法 | 为子会话设置共享状态。 |
| `onSubagentEnded(params)` | 方法 | 在子智能体结束后执行清理。 |
| `dispose()` | 方法 | 释放资源。在 Gateway 网关关闭或插件重载期间调用 —— 不是按会话调用。 |

### ownsCompaction

`ownsCompaction` 控制 Pi 的内置尝试中自动压缩是否仍在本次运行中启用：

- `true` —— 该引擎拥有压缩行为。OpenClaw 会为本次运行禁用 Pi 的内置
  自动压缩，而引擎的 `compact()` 实现需要负责 `/compact`、溢出恢复压缩，
  以及它希望在 `afterTurn()` 中执行的任何主动压缩。
- `false` 或未设置 —— Pi 的内置自动压缩在提示执行期间仍可能运行，
  但对于 `/compact` 和溢出恢复，仍会调用活动引擎的 `compact()` 方法。

`ownsCompaction: false` **并不**意味着 OpenClaw 会自动回退到
legacy 引擎的压缩路径。

这意味着插件有两种有效模式：

- **自主管理模式** —— 实现你自己的压缩算法，并设置
  `ownsCompaction: true`。
- **委托模式** —— 设置 `ownsCompaction: false`，并让 `compact()` 调用
  `openclaw/plugin-sdk/core` 中的 `delegateCompactionToRuntime(...)` 来使用
  OpenClaw 的内置压缩行为。

对于一个活动的非自主管理引擎来说，空操作 `compact()` 是不安全的，因为它
会禁用该引擎 slot 的正常 `/compact` 和溢出恢复压缩路径。

## 配置参考

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

该 slot 在运行时是互斥的 —— 对于某次运行或压缩操作，
只会解析一个已注册的上下文引擎。其他已启用的
`kind: "context-engine"` 插件仍然可以加载并运行其注册代码；
`plugins.slots.contextEngine` 只决定在 OpenClaw 需要上下文引擎时，
解析哪个已注册引擎 ID。

## 与压缩和记忆的关系

- **压缩** 是上下文引擎的一项职责。legacy 引擎
  会委托给 OpenClaw 的内置总结逻辑。插件引擎则可以实现
  任意压缩策略（DAG 汇总、向量检索等）。
- **记忆插件**（`plugins.slots.memory`）与上下文引擎是分开的。
  记忆插件提供搜索/检索；上下文引擎控制模型
  最终看到什么。它们可以协同工作 —— 上下文引擎
  可能会在组装阶段使用记忆插件数据。希望使用活动记忆
  prompt 路径的插件引擎，应优先使用 `openclaw/plugin-sdk/core` 中的
  `buildMemorySystemPromptAddition(...)`，它会将活动记忆 prompt 区段
  转换为可直接前置的 `systemPromptAddition`。如果引擎需要更底层的
  控制，它仍然可以通过
  `openclaw/plugin-sdk/memory-host-core` 中的
  `buildActiveMemoryPromptSection(...)` 拉取原始行。
- **会话裁剪**（在内存中修剪旧工具结果）仍然会执行，
  无论当前活动的是哪个上下文引擎。

## 提示

- 使用 `openclaw doctor` 验证你的引擎是否正确加载。
- 如果切换引擎，现有会话会继续保留其当前历史。
  新引擎将接管后续运行。
- 引擎错误会被记录并显示在诊断中。如果插件引擎
  注册失败，或选定的引擎 ID 无法解析，OpenClaw
  不会自动回退；在你修复插件或
  将 `plugins.slots.contextEngine` 切回 `"legacy"` 之前，运行会失败。
- 开发时，使用 `openclaw plugins install -l ./my-engine` 来链接
  本地插件目录，而无需复制。

另请参见： [??](/zh-CN/concepts/compaction)、[???](/zh-CN/concepts/context)、
[??](/zh-CN/tools/plugin)、[插件清单](/zh-CN/plugins/manifest)。

## 相关内容

- [上下文](/zh-CN/concepts/context) — 智能体轮次如何构建上下文
- [插件架构](/zh-CN/plugins/architecture) — 注册上下文引擎插件
- [??](/zh-CN/concepts/compaction) — 总结长对话
