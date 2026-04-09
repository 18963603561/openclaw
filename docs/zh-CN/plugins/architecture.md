---
read_when:
    - 构建或调试原生 OpenClaw 插件
    - 理解插件能力模型或归属边界
    - 处理插件加载流水线或注册表
    - 实现提供商运行时 hook 或渠道插件
sidebarTitle: Internals
summary: 插件内部机制：能力模型、归属、契约、加载流水线和运行时辅助工具
title: 插件内部机制
x-i18n:
    generated_at: "2026-04-08T06:45:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: c40ecf14e2a0b2b8d332027aed939cd61fb4289a489f4cd4c076c96d707d1138
    source_path: plugins\architecture.md
    workflow: 15
---

# 插件内部机制

<Info>
  这是**深度架构参考**。如需实用指南，请参阅：
  - [安装和使用插件](/zh-CN/tools/plugin) —— 用户指南
  - [入门指南](/zh-CN/plugins/building-plugins) —— 第一个插件教程
  - [渠道插件](/zh-CN/plugins/sdk-channel-plugins) —— 构建消息渠道
  - [提供商插件](/zh-CN/plugins/sdk-provider-plugins) —— 构建模型提供商
  - [插件 SDK 概览](/zh-CN/plugins/sdk-overview) —— import map 和注册 API
</Info>

本页介绍 OpenClaw 插件系统的内部架构。

## 公共能力模型

能力是 OpenClaw 内部公开的**原生插件**模型。每个原生 OpenClaw 插件都会针对一个或多个能力类型进行注册：

| 能力 | 注册方法 | 示例插件 |
| ---------------------- | ------------------------------------------------ | ------------------------------------ |
| 文本推理 | `api.registerProvider(...)` | `openai`, `anthropic` |
| CLI 推理后端 | `api.registerCliBackend(...)` | `openai`, `anthropic` |
| Speech | `api.registerSpeechProvider(...)` | `elevenlabs`, `microsoft` |
| 实时转录 | `api.registerRealtimeTranscriptionProvider(...)` | `openai` |
| 实时语音 | `api.registerRealtimeVoiceProvider(...)` | `openai` |
| 媒体理解 | `api.registerMediaUnderstandingProvider(...)` | `openai`, `google` |
| 图像生成 | `api.registerImageGenerationProvider(...)` | `openai`, `google`, `fal`, `minimax` |
| 音乐生成 | `api.registerMusicGenerationProvider(...)` | `google`, `minimax` |
| 视频生成 | `api.registerVideoGenerationProvider(...)` | `qwen` |
| Web 抓取 | `api.registerWebFetchProvider(...)` | `firecrawl` |
| Web 搜索 | `api.registerWebSearchProvider(...)` | `google` |
| 渠道 / 消息 | `api.registerChannel(...)` | `msteams`, `matrix` |

一个注册了零个能力、但提供 hook、工具或服务的插件，属于**仅 hook 的旧式**插件。该模式目前仍然受到完整支持。

### 外部兼容性立场

能力模型已经落地到 core，并且当前已用于内置 / 原生插件，但外部插件兼容性仍需要比“它被导出了，因此它被冻结了”更严格的标准。

当前指导原则：

- **现有外部插件：** 保持基于 hook 的集成可用；将其视为兼容性的基线
- **新的内置 / 原生插件：** 优先使用显式能力注册，而不是面向厂商的内部穿透或新的仅 hook 设计
- **采用能力注册的外部插件：** 允许这样做，但除非文档明确将某个契约标记为稳定，否则应将能力专属辅助接口视为仍在演进中

实践规则：

- 能力注册 API 是预期的发展方向
- 在过渡期间，旧式 hook 仍是外部插件最安全、最不容易破坏的路径
- 并非所有导出的 helper 子路径都同等稳定；优先依赖文档化的狭窄契约，而不是偶然导出的 helper

### 插件形态

OpenClaw 会根据每个已加载插件的实际注册行为，将其分类为一种形态（而不只是依赖静态元数据）：

- **plain-capability** —— 恰好注册一种能力类型（例如仅提供商插件 `mistral`）
- **hybrid-capability** —— 注册多种能力类型（例如 `openai` 同时拥有文本推理、Speech、媒体理解和图像生成）
- **hook-only** —— 仅注册 hook（typed 或 custom），不注册能力、工具、命令或服务
- **non-capability** —— 注册工具、命令、服务或路由，但不注册能力

使用 `openclaw plugins inspect <id>` 可查看插件的形态和能力拆分。详情请参阅 [CLI 设置参考](/zh-CN/cli/plugins#inspect)。

### 旧式 hook

`before_agent_start` hook 仍然作为仅 hook 插件的兼容路径受到支持。现实中的旧插件仍依赖它。

方向如下：

- 保持其可用
- 将其文档化为旧式能力
- 对模型 / 提供商覆盖工作，优先使用 `before_model_resolve`
- 对提示词变更工作，优先使用 `before_prompt_build`
- 仅在真实使用量下降且 fixture 覆盖证明迁移安全后才移除

### 兼容性信号

当你运行 `openclaw doctor` 或 `openclaw plugins inspect <id>` 时，可能会看到以下标签之一：

| 信号 | 含义 |
| -------------------------- | ------------------------------------------------------------ |
| **config valid** | 配置解析正常且插件可解析 |
| **compatibility advisory** | 插件使用了受支持但较旧的模式（例如 `hook-only`） |
| **legacy warning** | 插件使用了 `before_agent_start`，该能力已被弃用 |
| **hard error** | 配置无效，或插件加载失败 |

当前 `hook-only` 和 `before_agent_start` 都不会导致你的插件失效——`hook-only` 是提示性信息，而 `before_agent_start` 只会触发警告。这些信号也会出现在 `openclaw status --all` 和 `openclaw plugins doctor` 中。

## 架构概览

OpenClaw 的插件系统有四层：

1. **清单 + 发现**
   OpenClaw 会从已配置路径、工作区根目录、全局扩展根目录以及内置扩展中寻找候选插件。发现阶段会优先读取原生 `openclaw.plugin.json` 清单以及受支持的 bundle 清单。
2. **启用 + 校验**
   Core 会决定某个已发现插件是启用、禁用、阻止，还是被选中填充某个独占槽位，例如 memory。
3. **运行时加载**
   原生 OpenClaw 插件会通过 jiti 在进程内加载，并将能力注册到中央注册表中。兼容 bundle 会被规范化为注册表记录，而无需导入运行时代码。
4. **能力暴露消费**
   OpenClaw 的其余部分读取注册表，以暴露工具、渠道、提供商设置、hook、HTTP 路由、CLI 命令和服务。

具体到插件 CLI，根命令发现被拆分为两个阶段：

- 解析期元数据来自 `registerCli(..., { descriptors: [...] })`
- 真实的插件 CLI 模块可以保持惰性，并在首次调用时注册

这样既能让插件拥有的 CLI 代码保留在插件内部，又能让 OpenClaw 在解析前预留根命令名。

重要的设计边界：

- 发现 + 配置校验应当根据**清单 / schema 元数据**工作，而无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种拆分使 OpenClaw 能够在完整运行时尚未激活前，就完成配置校验、解释缺失 / 已禁用插件，并构建 UI / schema 提示。

### 渠道插件与共享消息工具

对于普通聊天动作，渠道插件不需要单独注册发送 / 编辑 / 反应工具。OpenClaw 在 core 中保留了一个共享的 `message` 工具，而渠道插件负责其背后的渠道专属发现和执行。

当前边界如下：

- core 拥有共享 `message` 工具宿主、提示词接线、会话 / 线程记录以及执行派发
- 渠道插件拥有作用域动作发现、能力发现以及所有渠道专属 schema 片段
- 渠道插件拥有提供商专属会话对话语法，例如会话 id 如何编码线程 id 或从父会话继承
- 渠道插件通过自己的动作适配器执行最终动作

对于渠道插件，SDK 接口是 `ChannelMessageActionAdapter.describeMessageTool(...)`。这个统一的发现调用允许插件一起返回其可见动作、能力以及 schema 扩展，从而避免这些部分彼此漂移。

Core 会把运行时作用域传给这个发现步骤。重要字段包括：

- `accountId`
- `currentChannelId`
- `currentThreadTs`
- `currentMessageId`
- `sessionKey`
- `sessionId`
- `agentId`
- 受信任的入站 `requesterSenderId`

这对上下文敏感型插件很重要。渠道可以根据当前账号、当前房间 / 线程 / 消息，或受信任的请求方身份，决定隐藏或暴露哪些消息动作，而无需在 core 的 `message` 工具中硬编码渠道分支。

这也是为什么嵌入式 runner 路由变更仍然属于插件工作：runner 负责将当前聊天 / 会话身份转发到插件发现边界，这样共享的 `message` 工具才能为当前轮次暴露正确的渠道拥有能力。

对于由渠道拥有的执行 helper，内置插件应将执行运行时保留在自己的扩展模块内部。Core 不再拥有 `src/agents/tools` 下的 Discord、Slack、Telegram 或 WhatsApp 消息动作运行时。我们不会发布单独的 `plugin-sdk/*-action-runtime` 子路径，内置插件应直接从其扩展拥有的模块导入本地运行时代码。

同样的边界也适用于通常意义上的提供商命名 SDK 接缝：core 不应导入 Slack、Discord、Signal、WhatsApp 或类似扩展的渠道专属便捷 barrel。如果 core 需要某个行为，要么使用该内置插件自己的 `api.ts` / `runtime-api.ts` barrel，要么将该需求提升为共享 SDK 中一个狭窄而通用的能力。

具体到投票，有两条执行路径：

- `outbound.sendPoll` 是适用于符合通用投票模型渠道的共享基线
- `actions.handleAction("poll")` 是处理渠道专属投票语义或额外投票参数的首选路径

现在 core 会先让插件投票派发尝试处理动作，只有当其拒绝后，才回退到共享投票解析，因此插件拥有的投票处理器可以接受渠道专属投票字段，而不会先被通用投票解析器阻塞。

完整启动顺序请参阅 [加载流水线](#load-pipeline)。

## 能力归属模型

OpenClaw 将原生插件视为一个**公司**或一个**功能**的归属边界，而不是把无关集成胡乱塞在一起的集合。

这意味着：

- 公司插件通常应拥有该公司的所有 OpenClaw 对外能力
- 功能插件通常应拥有它引入的完整功能表面
- 渠道应消费共享 core 能力，而不是临时重新实现提供商行为

例如：

- 内置的 `openai` 插件拥有 OpenAI 模型提供商行为，以及 OpenAI Speech + 实时语音 + 媒体理解 + 图像生成行为
- 内置的 `elevenlabs` 插件拥有 ElevenLabs Speech 行为
- 内置的 `microsoft` 插件拥有 Microsoft Speech 行为
- 内置的 `google` 插件拥有 Google 模型提供商行为，以及 Google 媒体理解 + 图像生成 + Web 搜索行为
- 内置的 `firecrawl` 插件拥有 Firecrawl Web 抓取行为
- 内置的 `minimax`、`mistral`、`moonshot` 和 `zai` 插件拥有它们的媒体理解后端
- 内置的 `qwen` 插件拥有 Qwen 文本提供商行为，以及媒体理解和视频生成行为
- `voice-call` 插件是一个功能插件：它拥有通话传输、工具、CLI、路由和 Twilio 媒体流桥接，但它消费共享的 Speech、实时转录和实时语音能力，而不是直接导入厂商插件

预期的最终状态是：

- OpenAI 统一存在于一个插件中，即使它覆盖文本模型、Speech、图像和未来的视频
- 其他厂商也可以用同样方式统一承载自己的能力面
- 渠道不关心哪个厂商插件拥有提供商；它们只消费由 core 暴露的共享能力契约

这是关键区别：

- **plugin** = 归属边界
- **capability** = 可以被多个插件实现或消费的 core 契约

因此，如果 OpenClaw 新增一个视频之类的领域，首要问题不是“应由哪个提供商硬编码视频处理？”，而是“视频的 core 能力契约是什么？”。一旦该契约存在，厂商插件就可以针对它注册，渠道 / 功能插件也可以消费它。

如果该能力尚不存在，通常正确的做法是：

1. 在 core 中定义缺失的能力
2. 通过插件 API / 运行时以 typed 方式暴露它
3. 让渠道 / 功能对接该能力
4. 让厂商插件注册实现

这样可以在保持归属清晰的同时，避免 core 行为依赖单一厂商或某条临时的一次性插件路径。

### 能力分层

决定代码应该放在哪一层时，请使用以下心智模型：

- **core 能力层**：共享编排、策略、回退、配置合并规则、投递语义和 typed 契约
- **厂商插件层**：厂商专属 API、认证、模型目录、Speech 合成、图像生成、未来视频后端、用量端点
- **渠道 / 功能插件层**：Slack / Discord / voice-call 等集成，它们消费 core 能力并将其呈现在某个能力表面上

例如，TTS 遵循如下结构：

- core 拥有回复期 TTS 策略、回退顺序、偏好设置和渠道投递
- `openai`、`elevenlabs` 和 `microsoft` 拥有合成实现
- `voice-call` 消费电话场景的 TTS 运行时 helper

未来的新能力也应优先遵循同样模式。

### 多能力公司插件示例

从外部看，一个公司插件应当是连贯的。如果 OpenClaw 对模型、Speech、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 抓取和 Web 搜索拥有共享契约，那么一个厂商就可以在一个地方拥有自己全部的能力面：

```ts
import type { OpenClawPluginDefinition } from "openclaw/plugin-sdk/plugin-entry";
import {
  describeImageWithModel,
  transcribeOpenAiCompatibleAudio,
} from "openclaw/plugin-sdk/media-understanding";

const plugin: OpenClawPluginDefinition = {
  id: "exampleai",
  name: "ExampleAI",
  register(api) {
    api.registerProvider({
      id: "exampleai",
      // auth/model catalog/runtime hooks
    });

    api.registerSpeechProvider({
      id: "exampleai",
      // vendor speech config — implement the SpeechProviderPlugin interface directly
    });

    api.registerMediaUnderstandingProvider({
      id: "exampleai",
      capabilities: ["image", "audio", "video"],
      async describeImage(req) {
        return describeImageWithModel({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
      async transcribeAudio(req) {
        return transcribeOpenAiCompatibleAudio({
          provider: "exampleai",
          model: req.model,
          input: req.input,
        });
      },
    });

    api.registerWebSearchProvider(
      createPluginBackedWebSearchProvider({
        id: "exampleai-search",
        // credential + fetch logic
      }),
    );
  },
};

export default plugin;
```

重要的不在于 helper 的确切名称，而在于其结构：

- 一个插件拥有厂商能力面
- core 仍然拥有能力契约
- 渠道和功能插件消费 `api.runtime.*` helper，而不是厂商代码
- 契约测试可以断言该插件确实注册了它声称拥有的能力

### 能力示例：视频理解

OpenClaw 已经将图像 / 音频 / 视频理解视为一个共享能力。相同的归属模型同样适用于这里：

1. core 定义媒体理解契约
2. 厂商插件按需注册 `describeImage`、`transcribeAudio` 和 `describeVideo`
3. 渠道和功能插件消费共享 core 行为，而不是直接对接厂商代码

这样就不会把某个提供商对视频的假设固化进 core。插件拥有厂商能力面；core 拥有能力契约和回退行为。

视频生成也已经遵循同样顺序：core 拥有 typed 能力契约和运行时 helper，厂商插件针对 `api.registerVideoGenerationProvider(...)` 注册实现。

需要具体的推出清单？请参阅 [能力扩展手册](/zh-CN/plugins/architecture)。

## 契约与约束

插件 API 接口有意保持 typed，并集中定义在 `OpenClawPluginApi` 中。该契约定义了受支持的注册点，以及插件可以依赖的运行时 helper。

这很重要，因为：

- 插件作者可以获得统一而稳定的内部标准
- core 可以拒绝重复归属，例如两个插件注册相同 provider id
- 启动时可以为格式错误的注册提供可执行的诊断信息
- 契约测试可以约束内置插件归属，防止其悄悄漂移

存在两层约束：

1. **运行时注册约束**
   插件加载时，插件注册表会校验注册内容。例如重复 provider id、重复 Speech provider id，以及格式错误的注册，都会生成插件诊断，而不是导致未定义行为。
2. **契约测试**
   测试运行期间，内置插件会被捕获到契约注册表中，以便 OpenClaw 显式断言归属。目前这已用于模型提供商、Speech 提供商、Web 搜索提供商以及内置注册归属。

实际效果是，OpenClaw 会在一开始就知道哪个插件拥有哪一部分能力。这使 core 与渠道能自然组合，因为归属是被声明、typed 且可测试的，而不是隐式的。

### 什么应属于一个契约

好的插件契约应当具备这些特征：

- typed
- 小而精
- 聚焦某个能力
- 由 core 拥有
- 可被多个插件复用
- 可被渠道 / 功能消费，而无需了解厂商细节

糟糕的插件契约通常是：

- 把厂商专属策略藏在 core 中
- 一次性的插件逃生口，绕过注册表
- 渠道代码直接穿透到某个厂商实现
- 不属于 `OpenClawPluginApi` 或 `api.runtime` 的临时运行时对象

如果拿不准，请提升抽象层级：先定义能力，再让插件接入。

## 执行模型

原生 OpenClaw 插件与 Gateway 网关在**同一进程内**运行。它们没有经过沙箱隔离。一个已加载的原生插件，与 core 代码拥有相同的进程级信任边界。

这意味着：

- 原生插件可以注册工具、网络处理器、hook 和服务
- 原生插件的 bug 可能导致 Gateway 网关崩溃或不稳定
- 恶意原生插件等价于在 OpenClaw 进程内部执行任意代码

兼容 bundle 默认更安全，因为 OpenClaw 当前将它们视为元数据 / 内容包。在当前版本中，这主要意味着内置 Skills。

对于非内置插件，请使用 allowlist 和显式安装 / 加载路径。将工作区插件视为开发期代码，而不是生产默认值。

对于内置工作区包名，请让插件 id 锚定在 npm 名称中：默认使用 `@openclaw/<id>`，或使用受批准的 typed 后缀，例如 `-provider`、`-plugin`、`-speech`、`-sandbox` 或 `-media-understanding`，前提是该包有意暴露更窄的插件角色。

重要的信任说明：

- `plugins.allow` 信任的是**插件 id**，而不是源码来源
- 如果某个工作区插件与内置插件使用相同 id，那么在该工作区插件被启用 / allowlist 后，它会有意覆盖内置副本
- 这属于正常且有用的行为，适用于本地开发、补丁测试和热修复

## 导出边界

OpenClaw 导出的是能力，而不是实现便捷层。

应保持能力注册接口公开，同时收缩非契约 helper 导出：

- 内置插件专属 helper 子路径
- 不打算作为公共 API 的运行时 plumbing 子路径
- 厂商专属便捷 helper
- 属于实现细节的设置 / 新手引导 helper

某些内置插件 helper 子路径仍然保留在自动生成的 SDK 导出映射中，以兼容现有行为并便于维护内置插件。当前示例包括 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup`，以及若干 `plugin-sdk/matrix*` 接缝。应将它们视为保留的实现细节导出，而不是新第三方插件推荐使用的 SDK 模式。

## 加载流水线

在启动时，OpenClaw 大致会执行以下步骤：

1. 发现候选插件根目录
2. 读取原生或兼容 bundle 的清单与包元数据
3. 拒绝不安全的候选项
4. 规范化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、`slots`、`load.paths`）
5. 为每个候选项决定启用状态
6. 通过 jiti 加载已启用的原生模块
7. 调用原生 `register(api)`（或 `activate(api)` —— 一个旧式别名）hook，并将注册内容收集到插件注册表中
8. 将注册表暴露给命令 / 运行时能力面

<Note>
`activate` 是 `register` 的旧式别名——加载器会解析其一（`def.register ?? def.activate`）并在同一位置调用。所有内置插件都使用 `register`；新插件请优先使用 `register`。
</Note>

安全闸门会在运行时执行**之前**生效。如果入口逃逸出插件根目录、路径对所有人可写，或对非内置插件而言路径所有权可疑，这些候选项都会被阻止。

### 清单优先行为

清单是控制面的事实来源。OpenClaw 用它来：

- 标识插件
- 发现声明的渠道 / Skills / 配置 schema 或 bundle 能力
- 校验 `plugins.entries.<id>.config`
- 增强 Control UI 标签 / 占位提示
- 显示安装 / 目录元数据

对于原生插件，运行时模块是数据面部分。它会注册真实行为，例如 hook、工具、命令或提供商流程。

### 加载器会缓存什么

OpenClaw 会保留短生命周期的进程内缓存，用于：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存可减少突发启动成本和重复命令开销。可以将它们视为短期性能缓存，而不是持久化机制。

性能说明：

- 通过设置 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或 `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 可禁用这些缓存。
- 通过 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和 `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存窗口。

## 注册表模型

已加载插件不会直接修改随机的 core 全局状态。它们会注册到中央插件注册表中。

注册表会跟踪：

- 插件记录（身份、来源、出处、状态、诊断）
- 工具
- 旧式 hook 和 typed hook
- 渠道
- 提供商
- Gateway 网关 RPC 处理器
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

随后 core 功能再从该注册表读取，而不是直接与插件模块交互。这让加载保持单向：

- 插件模块 -> 注册表注册
- core 运行时 -> 注册表消费

这种分离对可维护性非常重要。它意味着大多数 core 能力面只需要一个集成点：“读取注册表”，而不是“为每个插件模块做特殊处理”。

## 会话绑定回调

绑定会话的插件可以在审批完成后作出反应。

使用 `api.onConversationBindingResolved(...)` 可在绑定请求获批或被拒后接收回调：

```ts
export default {
  id: "my-plugin",
  register(api) {
    api.onConversationBindingResolved(async (event) => {
      if (event.status === "approved") {
        // A binding now exists for this plugin + conversation.
        console.log(event.binding?.conversationId);
        return;
      }

      // The request was denied; clear any local pending state.
      console.log(event.request.conversation.conversationId);
    });
  },
};
```

回调载荷字段：

- `status`：`"approved"` 或 `"denied"`
- `decision`：`"allow-once"`、`"allow-always"` 或 `"deny"`
- `binding`：已批准请求对应的解析后绑定
- `request`：原始请求摘要、detach 提示、sender id 和会话元数据

该回调仅用于通知。它不会改变谁有权绑定会话，并且会在 core 完成审批处理之后运行。

## 提供商运行时 hook

提供商插件现在有两层：

- 清单元数据层：`providerAuthEnvVars` 用于在运行时加载前，以低成本查找 provider 环境变量认证；`channelEnvVars` 用于在运行时加载前，以低成本查找渠道环境变量 / 设置；`providerAuthChoices` 用于在运行时加载前，以低成本提供新手引导 / 认证选项标签和 CLI flag 元数据
- 配置期 hook：`catalog` / 旧式 `discovery`，以及 `applyConfigDefaults`
- 运行时 hook：`normalizeModelId`、`normalizeTransport`、
  `normalizeConfig`、
  `applyNativeStreamingUsageCompat`、`resolveConfigApiKey`、
  `resolveSyntheticAuth`、`resolveExternalAuthProfiles`、
  `shouldDeferSyntheticProfileAuth`、
  `resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、
  `contributeResolvedModelCompat`、`capabilities`、
  `normalizeToolSchemas`、`inspectToolSchemas`、
  `resolveReasoningOutputMode`、`prepareExtraParams`、`createStreamFn`、
  `wrapStreamFn`、`resolveTransportTurnState`、
  `resolveWebSocketSessionPolicy`、`formatApiKey`、`refreshOAuth`、
  `buildAuthDoctorHint`、`matchesContextOverflowError`、
  `classifyFailoverReason`、`isCacheTtlEligible`、
  `buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、
  `isBinaryThinking`、`supportsXHighThinking`、
  `resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`createEmbeddingProvider`、
  `buildReplayPolicy`、
  `sanitizeReplayHistory`、`validateReplayTurns`、`onModelSelected`

OpenClaw 仍然拥有通用智能体循环、故障切换、转录处理和工具策略。这些 hook 是提供商专属行为的扩展面，无需为此整套实现一个自定义推理传输层。

当提供商具备基于环境变量的凭证，并且通用认证 / 状态 / 模型选择路径应在不加载插件运行时的情况下看到这些凭证时，请使用清单中的 `providerAuthEnvVars`。当新手引导 / 认证选项 CLI 能力面应在不加载提供商运行时的情况下，知道提供商的 choice id、分组标签和简单的单 flag 认证接线时，请使用清单中的 `providerAuthChoices`。而提供商运行时中的 `envVars` 则应用于面向运维者的提示，例如新手引导标签或 OAuth client-id / client-secret 设置变量。

当某个渠道具备由环境变量驱动的认证或设置，并且通用 shell 环境变量回退、配置 / 状态检查或设置提示应在不加载渠道运行时的情况下看到这些信息时，请使用清单中的 `channelEnvVars`。

### Hook 顺序与使用场景

对于模型 / 提供商插件，OpenClaw 大致按如下顺序调用 hook。
“何时使用”列是快速决策指南。

| #   | Hook | 作用 | 何时使用 |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `catalog` | 在生成 `models.json` 时，将 provider 配置发布到 `models.providers` 中 | 提供商拥有模型目录或 base URL 默认值 |
| 2   | `applyConfigDefaults` | 在配置物化期间应用提供商拥有的全局默认值 | 默认值依赖认证模式、环境变量或提供商模型族语义 |
| --  | _(built-in model lookup)_ | OpenClaw 先尝试普通注册表 / 目录路径 | _(不是插件 hook)_ |
| 3   | `normalizeModelId` | 在查找前规范化旧式或预览版 model-id 别名 | 提供商拥有别名清理逻辑，应在规范模型解析前生效 |
| 4   | `normalizeTransport` | 在通用模型组装前规范化提供商族的 `api` / `baseUrl` | 提供商拥有相同传输族中自定义 provider id 的传输清理逻辑 |
| 5   | `normalizeConfig` | 在运行时 / 提供商解析前规范化 `models.providers.<id>` | 提供商需要应由插件拥有的配置清理逻辑；内置 Google 族 helper 也会为受支持的 Google 配置项兜底 |
| 6   | `applyNativeStreamingUsageCompat` | 对配置型 provider 应用原生流式用量兼容性重写 | 提供商需要修复由端点驱动的原生流式用量元数据 |
| 7   | `resolveConfigApiKey` | 在加载运行时认证之前，为配置型 provider 解析 env-marker 认证 | 提供商拥有 env-marker API key 解析逻辑；`amazon-bedrock` 也在这里内置了 AWS env-marker 解析器 |
| 8   | `resolveSyntheticAuth` | 在不持久化明文的情况下暴露本地 / 自托管或配置支持的认证 | 提供商可通过 synthetic / 本地凭证标记运行 |
| 9   | `resolveExternalAuthProfiles` | 覆盖提供商拥有的外部 auth profile；默认 `persistence` 为 `runtime-only`，适用于 CLI / app 拥有的凭证 | 提供商可复用外部认证凭证，而无需持久化复制出的 refresh token |
| 10  | `shouldDeferSyntheticProfileAuth` | 让已存储的 synthetic profile 占位符在优先级上低于 env / config 驱动认证 | 提供商存储了 synthetic 占位 profile，但它们不应拥有更高优先级 |
| 11  | `resolveDynamicModel` | 对本地注册表中尚不存在的提供商拥有 model id 做同步回退解析 | 提供商接受任意上游 model id |
| 12  | `prepareDynamicModel` | 先执行异步预热，然后再次运行 `resolveDynamicModel` | 提供商在解析未知 id 前需要网络元数据 |
| 13  | `normalizeResolvedModel` | 在嵌入式 runner 使用解析后的模型之前做最终重写 | 提供商需要传输层重写，但仍然使用 core 传输 |
| 14  | `contributeResolvedModelCompat` | 为通过另一兼容传输运行的厂商模型提供兼容标志 | 提供商可在不接管 provider 的情况下，在代理传输中识别自己的模型 |
| 15  | `capabilities` | 被共享 core 逻辑使用的提供商拥有转录 / 工具元数据 | 提供商需要转录 / provider-family 特殊处理 |
| 16  | `normalizeToolSchemas` | 在嵌入式 runner 看到工具 schema 之前先做规范化 | 提供商需要传输族 schema 清理 |
| 17  | `inspectToolSchemas` | 在规范化之后暴露提供商拥有的 schema 诊断 | 提供商希望给出关键字警告，而无需让 core 学习 provider 专属规则 |
| 18  | `resolveReasoningOutputMode` | 选择原生推理输出契约，还是加标签的推理输出契约 | 提供商需要使用加标签的 reasoning / final output，而不是原生字段 |
| 19  | `prepareExtraParams` | 在通用 stream 选项包装前对请求参数做规范化 | 提供商需要默认请求参数或按 provider 清理参数 |
| 20  | `createStreamFn` | 用自定义传输完全替换正常 stream 路径 | 提供商需要自定义线路协议，而不是简单包装 |
| 21  | `wrapStreamFn` | 在应用通用包装后再对 stream 进行包装 | 提供商需要请求头 / 请求体 / 模型兼容性包装，但不需要自定义传输 |
| 22  | `resolveTransportTurnState` | 附加原生的每轮传输头或元数据 | 提供商希望通用传输发送 provider 原生轮次身份 |
| 23  | `resolveWebSocketSessionPolicy` | 附加原生 WebSocket 头或会话冷却策略 | 提供商希望通用 WS 传输调优会话头或回退策略 |
| 24  | `formatApiKey` | auth-profile 格式化器：将已存储 profile 转换为运行时 `apiKey` 字符串 | 提供商会存储额外认证元数据，并需要自定义运行时 token 形态 |
| 25  | `refreshOAuth` | 为自定义刷新端点或刷新失败策略覆写 OAuth 刷新逻辑 | 提供商不适配共享 `pi-ai` 刷新器 |
| 26  | `buildAuthDoctorHint` | 当 OAuth 刷新失败时追加修复提示 | 提供商需要在刷新失败后给出 provider 拥有的认证修复指引 |
| 27  | `matchesContextOverflowError` | 提供商拥有的上下文窗口溢出错误匹配器 | 提供商存在通用启发式无法识别的原始溢出错误 |
| 28  | `classifyFailoverReason` | 提供商拥有的故障切换原因分类 | 提供商可将原始 API / 传输错误映射为限流 / 过载等原因 |
| 29  | `isCacheTtlEligible` | 面向代理 / 回传 provider 的提示缓存 TTL 策略 | 提供商需要代理专属缓存 TTL 门控 |
| 30  | `buildMissingAuthMessage` | 替换通用缺失认证恢复消息 | 提供商需要 provider 专属缺失认证恢复提示 |
| 31  | `suppressBuiltInModel` | 过时上游模型隐藏，以及可选的面向用户错误提示 | 提供商需要隐藏过时上游条目，或用厂商提示替换它们 |
| 32  | `augmentModelCatalog` | 在发现后附加 synthetic / 最终目录条目 | 提供商需要在 `models list` 和选择器中加入 synthetic 的前向兼容条目 |
| 33  | `isBinaryThinking` | 面向二元 thinking provider 的开 / 关推理切换 | 提供商只暴露二元 thinking 开关 |
| 34  | `supportsXHighThinking` | 指定模型上的 `xhigh` 推理支持 | 提供商希望仅在部分模型上支持 `xhigh` |
| 35  | `resolveDefaultThinkingLevel` | 为特定模型族定义默认 `/think` 级别 | 提供商拥有某个模型族的默认 `/think` 策略 |
| 36  | `isModernModelRef` | 用于 live profile 过滤和 smoke 选择的 modern-model 匹配器 | 提供商拥有 live / smoke 优先模型匹配逻辑 |
| 37  | `prepareRuntimeAuth` | 在推理前，将已配置凭证交换为真实运行时 token / key | 提供商需要 token 交换或短期请求凭证 |
| 38  | `resolveUsageAuth` | 为 `/usage` 及相关状态能力面解析用量 / 计费凭证 | 提供商需要自定义用量 / 配额 token 解析或不同的用量凭证 |
| 39  | `fetchUsageSnapshot` | 在认证解析后，获取并规范化 provider 专属用量 / 配额快照 | 提供商需要 provider 专属用量端点或载荷解析器 |
| 40  | `createEmbeddingProvider` | 为 memory / search 构建 provider 拥有的 embedding 适配器 | memory embedding 行为应属于 provider 插件 |
| 41  | `buildReplayPolicy` | 返回一个 replay 策略，用于控制该 provider 的转录处理 | 提供商需要自定义转录策略（例如剥离 thinking block） |
| 42  | `sanitizeReplayHistory` | 在通用转录清理之后重写 replay 历史 | 提供商需要超出共享压缩 helper 之外的 provider 专属 replay 重写 |
| 43  | `validateReplayTurns` | 在嵌入式 runner 执行前，对 replay turn 做最终校验或重塑 | provider 传输在通用净化后仍需要更严格的轮次校验 |
| 44  | `onModelSelected` | 在模型激活后运行 provider 拥有的后置副作用 | 提供商需要在模型变为活动状态时进行遥测或维护 provider 拥有状态 |

`normalizeModelId`、`normalizeTransport` 和 `normalizeConfig` 会先检查匹配到的 provider 插件，然后依次回退到其他具备相应 hook 的 provider 插件，直到某个插件真正修改了 model id 或 transport / config。这样，别名 / 兼容性 provider shim 就能继续工作，而无需调用方知道哪个内置插件拥有这次重写。如果没有 provider hook 重写受支持的 Google 族配置项，内置 Google 配置规范化器仍会执行该兼容性清理。

如果 provider 需要完全自定义的线路协议或自定义请求执行器，那属于另一类扩展。这些 hook 适用于仍运行在 OpenClaw 常规推理循环上的 provider 行为。

### Provider 示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "Example Proxy",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "Auto" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、
  `resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、
  `resolveDefaultThinkingLevel`、`applyConfigDefaults`、`isModernModelRef`，
  以及 `wrapStreamFn`，因为它拥有 Claude 4.6 前向兼容、
  provider-family 提示、认证修复指引、用量端点集成、
  prompt-cache 适用性、感知认证的配置默认值、Claude
  默认 / 自适应 thinking 策略，以及面向 beta headers、`/fast` / `serviceTier` 和 `context1m` 的 Anthropic 专属 stream 整形。
- Anthropic 的 Claude 专属 stream helper 目前仍保留在内置插件自己的公共 `api.ts` / `contract-api.ts` 接缝中。该包能力面导出 `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
  `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`，以及更底层的 Anthropic wrapper builder，而不是为了某个 provider 的 beta-header 规则扩大通用 SDK。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和
  `capabilities`，以及 `buildMissingAuthMessage`、`suppressBuiltInModel`、
  `augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，
  因为它拥有 GPT-5.4 前向兼容、直接的 OpenAI
  `openai-completions` -> `openai-responses` 规范化、面向 Codex 的认证提示、
  Spark 抑制、synthetic OpenAI 列表条目，以及 GPT-5 thinking /
  live-model 策略；`openai-responses-defaults` stream 家族则拥有共享的原生 OpenAI Responses 包装器，用于 attribution headers、
  `/fast` / `serviceTier`、文本详细度、原生 Codex Web 搜索、
  reasoning 兼容载荷整形以及 Responses 上下文管理。
- OpenRouter 使用 `catalog`，以及 `resolveDynamicModel` 和
  `prepareDynamicModel`，因为该 provider 是透传型的，可能在 OpenClaw 静态目录更新之前暴露新的 model id；它还使用
  `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`，以便将 provider 专属请求头、路由元数据、reasoning 补丁和 prompt-cache 策略留在 core 之外。其 replay 策略来自
  `passthrough-gemini` 家族，而 `openrouter-thinking` stream 家族则拥有代理 reasoning 注入，以及不受支持模型 / `auto` 跳过逻辑。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和
  `capabilities`，以及 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，
  因为它需要 provider 拥有的设备登录、模型回退行为、Claude 转录特殊处理、GitHub token -> Copilot token 交换，以及 provider 拥有的用量端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、
  `normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，以及
  `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它仍运行在 core 的 OpenAI 传输之上，但拥有自己的传输 / base URL 规范化、OAuth 刷新回退策略、默认传输选择、synthetic Codex 目录条目，以及 ChatGPT 用量端点集成；它与直连 OpenAI 共用同一个 `openai-responses-defaults` stream 家族。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel`、
  `buildReplayPolicy`、`sanitizeReplayHistory`、
  `resolveReasoningOutputMode`、`wrapStreamFn` 和 `isModernModelRef`，因为
  `google-gemini` replay 家族拥有 Gemini 3.1 前向兼容回退、
  原生 Gemini replay 校验、bootstrap replay 净化、带标签的
  reasoning 输出模式，以及 modern-model 匹配，而
  `google-thinking` stream 家族则拥有 Gemini thinking 载荷规范化；
  Gemini CLI OAuth 还使用 `formatApiKey`、`resolveUsageAuth` 和
  `fetchUsageSnapshot` 来处理 token 格式化、token 解析和配额端点接线。
- Anthropic Vertex 通过
  `anthropic-by-model` replay 家族使用 `buildReplayPolicy`，这样 Claude 专属 replay 清理就只会作用于 Claude id，而不是所有 `anthropic-messages` 传输。
- Amazon Bedrock 使用 `buildReplayPolicy`、`matchesContextOverflowError`、
  `classifyFailoverReason` 和 `resolveDefaultThinkingLevel`，因为它拥有
  Bedrock 专属的限流 / 未就绪 / 上下文溢出错误分类，适用于 Anthropic-on-Bedrock 流量；其 replay 策略仍共用同一个 Claude 专属 `anthropic-by-model` 防护。
- OpenRouter、Kilocode、Opencode 和 Opencode Go 通过 `passthrough-gemini` replay 家族使用 `buildReplayPolicy`，因为它们通过 OpenAI 兼容传输代理 Gemini 模型，并且需要 Gemini
  thought-signature 净化，但不需要原生 Gemini replay 校验或 bootstrap 重写。
- MiniMax 通过
  `hybrid-anthropic-openai` replay 家族使用 `buildReplayPolicy`，因为同一个 provider 同时拥有 Anthropic-message 和 OpenAI 兼容语义；它会在 Anthropic 一侧保留 Claude 专属 thinking block 丢弃，同时将 reasoning 输出模式改回原生，而 `minimax-fast-mode` stream 家族则拥有共享 stream 路径上的 fast-mode 模型重写。
- Moonshot 使用 `catalog` 加 `wrapStreamFn`，因为它仍使用共享 OpenAI 传输，但需要 provider 拥有的 thinking 载荷规范化；`moonshot-thinking` stream 家族会将配置和 `/think` 状态映射到其原生二元 thinking 载荷上。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和
  `isCacheTtlEligible`，因为它需要 provider 拥有的请求头、
  reasoning 载荷规范化、Gemini 转录提示以及 Anthropic
  cache-TTL 门控；`kilocode-thinking` stream 家族则在共享代理 stream 路径上保留 Kilo thinking 注入，同时跳过 `kilo/auto` 和其他不支持显式 reasoning 载荷的代理模型 id。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、
  `isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、
  `resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、
  `tool_stream` 默认值、二元 thinking UX、modern-model 匹配，以及用量认证 + 配额获取；`tool-stream-default-on` stream 家族则把默认开启的 `tool_stream` wrapper 保留在 provider 级手写 glue 之外。
- xAI 使用 `normalizeResolvedModel`、`normalizeTransport`、
  `contributeResolvedModelCompat`、`prepareExtraParams`、`wrapStreamFn`、
  `resolveSyntheticAuth`、`resolveDynamicModel` 和 `isModernModelRef`，
  因为它拥有原生 xAI Responses 传输规范化、Grok fast-mode 别名重写、默认 `tool_stream`、严格工具 / reasoning 载荷清理、用于插件拥有工具的回退认证复用、前向兼容 Grok 模型解析，以及 provider 拥有的兼容性补丁，例如 xAI 工具 schema profile、不受支持的 schema 关键字、原生 `web_search` 和 HTML entity 工具调用参数解码。
- Mistral、OpenCode Zen 和 OpenCode Go 只使用 `capabilities`，以便将转录 / 工具特殊处理逻辑保留在 core 之外。
- 仅目录型的内置 provider，例如 `byteplus`、`cloudflare-ai-gateway`、
  `huggingface`、`kimi-coding`、`nvidia`、`qianfan`、
  `synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine`，只使用 `catalog`。
- Qwen 对其文本提供商使用 `catalog`，同时对其多模态能力面使用共享的媒体理解和视频生成注册。
- MiniMax 和 Xiaomi 使用 `catalog` 加用量 hook，因为尽管推理仍通过共享传输运行，但它们的 `/usage` 行为由插件拥有。

## 运行时 helper

插件可以通过 `api.runtime` 访问部分 core helper。对于 TTS：

```ts
const clip = await api.runtime.tts.textToSpeech({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});

const voices = await api.runtime.tts.listVoices({
  provider: "elevenlabs",
  cfg: api.config,
});
```

说明：

- `textToSpeech` 返回常规 core TTS 输出载荷，适用于文件 / 语音便笺能力面。
- 使用 core 的 `messages.tts` 配置和 provider 选择。
- 返回 PCM 音频 buffer + 采样率。插件必须自行针对 provider 做重采样 / 编码。
- `listVoices` 对某些 provider 是可选的。请将其用于厂商拥有的语音选择器或设置流程。
- 语音列表可包含更丰富的元数据，例如 locale、gender 和 personality 标签，以支持 provider 感知型选择器。
- 当前 OpenAI 和 ElevenLabs 支持电话场景。Microsoft 不支持。

插件也可以通过 `api.registerSpeechProvider(...)` 注册 Speech 提供商。

```ts
api.registerSpeechProvider({
  id: "acme-speech",
  label: "Acme Speech",
  isConfigured: ({ config }) => Boolean(config.messages?.tts),
  synthesize: async (req) => {
    return {
      audioBuffer: Buffer.from([]),
      outputFormat: "mp3",
      fileExtension: ".mp3",
      voiceCompatible: false,
    };
  },
});
```

说明：

- 请将 TTS 策略、回退和回复投递保留在 core 中。
- 使用 Speech 提供商承载厂商拥有的合成行为。
- 旧式 Microsoft `edge` 输入会被规范化为 `microsoft` provider id。
- 推荐的归属模型是面向公司的：随着 OpenClaw 新增这些能力契约，一个厂商插件可以统一拥有文本、Speech、图像和未来媒体 provider。

对于图像 / 音频 / 视频理解，插件应注册一个 typed 的媒体理解 provider，而不是使用通用 key / value 包：

```ts
api.registerMediaUnderstandingProvider({
  id: "google",
  capabilities: ["image", "audio", "video"],
  describeImage: async (req) => ({ text: "..." }),
  transcribeAudio: async (req) => ({ text: "..." }),
  describeVideo: async (req) => ({ text: "..." }),
});
```

说明：

- 编排、回退、配置和渠道接线应保留在 core 中。
- 厂商行为应保留在 provider 插件中。
- 扩展应保持 typed 且是增量式的：新的可选方法、新的可选结果字段、新的可选能力。
- 视频生成已经遵循同样模式：
  - core 拥有能力契约和运行时 helper
  - 厂商插件注册 `api.registerVideoGenerationProvider(...)`
  - 功能 / 渠道插件消费 `api.runtime.videoGeneration.*`

对于媒体理解运行时 helper，插件可以调用：

```ts
const image = await api.runtime.mediaUnderstanding.describeImageFile({
  filePath: "/tmp/inbound-photo.jpg",
  cfg: api.config,
  agentDir: "/tmp/agent",
});

const video = await api.runtime.mediaUnderstanding.describeVideoFile({
  filePath: "/tmp/inbound-video.mp4",
  cfg: api.config,
});
```

对于音频转录，插件既可以使用媒体理解运行时，也可以使用较旧的 STT 别名：

```ts
const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // Optional when MIME cannot be inferred reliably:
  mime: "audio/ogg",
});
```

说明：

- `api.runtime.mediaUnderstanding.*` 是图像 / 音频 / 视频理解的首选共享能力面。
- 使用 core 的媒体理解音频配置（`tools.media.audio`）和 provider 回退顺序。
- 当未产生转录输出时（例如跳过 / 不支持的输入），返回 `{ text: undefined }`。
- `api.runtime.stt.transcribeAudioFile(...)` 仍保留为兼容性别名。

插件还可以通过 `api.runtime.subagent` 启动后台子智能体运行：

```ts
const result = await api.runtime.subagent.run({
  sessionKey: "agent:main:subagent:search-helper",
  message: "Expand this query into focused follow-up searches.",
  provider: "openai",
  model: "gpt-4.1-mini",
  deliver: false,
});
```

说明：

- `provider` 和 `model` 是每次运行的可选覆盖项，不会持久化修改会话。
- OpenClaw 仅对受信任调用方接受这些覆盖字段。
- 对于插件拥有的回退运行，运维者必须通过 `plugins.entries.<id>.subagent.allowModelOverride: true` 显式允许。
- 使用 `plugins.entries.<id>.subagent.allowedModels` 可将受信任插件限制在特定规范化 `provider/model` 目标上，或使用 `"*"` 以显式允许任意目标。
- 不受信任插件的子智能体运行仍可工作，但覆盖请求会被拒绝，而不是静默回退。

对于 Web 搜索，插件可以消费共享运行时 helper，而不是穿透到智能体工具接线中：

```ts
const providers = api.runtime.webSearch.listProviders({
  config: api.config,
});

const result = await api.runtime.webSearch.search({
  config: api.config,
  args: {
    query: "OpenClaw plugin runtime helpers",
    count: 5,
  },
});
```

插件也可以通过 `api.registerWebSearchProvider(...)` 注册 Web 搜索提供商。

说明：

- provider 选择、凭证解析和共享请求语义应保留在 core 中。
- 使用 Web 搜索 provider 承载厂商专属搜索传输。
- `api.runtime.webSearch.*` 是功能 / 渠道插件在不依赖智能体工具包装器的情况下获取搜索能力的首选共享能力面。

### `api.runtime.imageGeneration`

```ts
const result = await api.runtime.imageGeneration.generate({
  config: api.config,
  args: { prompt: "A friendly lobster mascot", size: "1024x1024" },
});

const providers = api.runtime.imageGeneration.listProviders({
  config: api.config,
});
```

- `generate(...)`：使用已配置的图像生成 provider 链生成图像。
- `listProviders(...)`：列出可用图像生成 provider 及其能力。

## Gateway 网关 HTTP 路由

插件可以通过 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`：Gateway 网关 HTTP 服务器下的路由路径。
- `auth`：必填。使用 `"gateway"` 表示要求正常 Gateway 网关认证，或使用 `"plugin"` 表示插件自主管理认证 / webhook 校验。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同一插件替换其自己已有的路由注册。
- `handler`：当路由处理了请求时返回 `true`。

说明：

- `api.registerHttpHandler(...)` 已移除，并会导致插件加载错误。请改用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 除非设置了 `replaceExisting: true`，否则完全相同的 `path + match` 冲突会被拒绝，并且一个插件不能替换另一个插件的路由。
- 不同 `auth` 级别的重叠路由会被拒绝。请仅在相同 auth 级别内使用 `exact` / `prefix` 回退链。
- `auth: "plugin"` 路由**不会**自动获得运维者运行时作用域。它们用于插件自管 webhook / 签名校验，而不是特权 Gateway 网关 helper 调用。
- `auth: "gateway"` 路由会在 Gateway 网关请求运行时作用域内执行，但该作用域被有意设计得较为保守：
  - 共享密钥 bearer 认证（`gateway.auth.mode = "token"` / `"password"`）会将插件路由运行时作用域固定为 `operator.write`，即使调用方发送了 `x-openclaw-scopes`
  - 受信任、携带身份的 HTTP 模式（例如 `trusted-proxy` 或私有入口上的 `gateway.auth.mode = "none"`）仅在显式存在该 header 时才接受 `x-openclaw-scopes`
  - 如果在这些携带身份的插件路由请求中缺少 `x-openclaw-scopes`，运行时作用域会回退为 `operator.write`
- 实践规则：不要把经过 Gateway 网关认证的插件路由默认视为隐式管理员能力面。如果你的路由需要仅管理员可用的行为，请要求使用携带身份的认证模式，并文档化显式的 `x-openclaw-scopes` header 契约。

## 插件 SDK 导入路径

在编写插件时，请使用 SDK 子路径，而不是单体式的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/plugin-entry` 用于插件注册原语。
- `openclaw/plugin-sdk/core` 用于通用共享的插件面向契约。
- `openclaw/plugin-sdk/config-schema` 用于根 `openclaw.json` Zod schema 导出（`OpenClawSchema`）。
- 稳定的渠道原语包括 `openclaw/plugin-sdk/channel-setup`、
  `openclaw/plugin-sdk/setup-runtime`、
  `openclaw/plugin-sdk/setup-adapter-runtime`、
  `openclaw/plugin-sdk/setup-tools`、
  `openclaw/plugin-sdk/channel-pairing`、
  `openclaw/plugin-sdk/channel-contract`、
  `openclaw/plugin-sdk/channel-feedback`、
  `openclaw/plugin-sdk/channel-inbound`、
  `openclaw/plugin-sdk/channel-lifecycle`、
  `openclaw/plugin-sdk/channel-reply-pipeline`、
  `openclaw/plugin-sdk/command-auth`、
  `openclaw/plugin-sdk/secret-input`，以及
  `openclaw/plugin-sdk/webhook-ingress`，用于共享的设置 / 认证 / 回复 / webhook 接线。
  `channel-inbound` 是防抖、提及匹配、入站提及策略 helper、envelope 格式化和入站 envelope 上下文 helper 的共享归属地。
  `channel-setup` 是狭窄的可选安装设置接缝。
  `setup-runtime` 是 `setupEntry` / 延迟启动使用的运行时安全设置能力面，其中包括可安全导入的设置补丁适配器。
  `setup-adapter-runtime` 是感知环境变量的账号设置适配器接缝。
  `setup-tools` 是小型 CLI / archive / docs helper 接缝（`formatCliCommand`、
  `detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、
  `CONFIG_DIR`）。
- 领域子路径，例如 `openclaw/plugin-sdk/channel-config-helpers`、
  `openclaw/plugin-sdk/allow-from`、
  `openclaw/plugin-sdk/channel-config-schema`、
  `openclaw/plugin-sdk/telegram-command-config`、
  `openclaw/plugin-sdk/channel-policy`、
  `openclaw/plugin-sdk/approval-gateway-runtime`、
  `openclaw/plugin-sdk/approval-handler-adapter-runtime`、
  `openclaw/plugin-sdk/approval-handler-runtime`、
  `openclaw/plugin-sdk/approval-runtime`、
  `openclaw/plugin-sdk/config-runtime`、
  `openclaw/plugin-sdk/infra-runtime`、
  `openclaw/plugin-sdk/agent-runtime`、
  `openclaw/plugin-sdk/lazy-runtime`、
  `openclaw/plugin-sdk/reply-history`、
  `openclaw/plugin-sdk/routing`、
  `openclaw/plugin-sdk/status-helpers`、
  `openclaw/plugin-sdk/text-runtime`、
  `openclaw/plugin-sdk/runtime-store`，以及
  `openclaw/plugin-sdk/directory-runtime`，用于共享运行时 / 配置 helper。
  `telegram-command-config` 是 Telegram 自定义命令规范化 / 校验的狭窄公共接缝，即使内置 Telegram 契约能力面暂时不可用，也会保留。
  `text-runtime` 是共享的文本 / markdown / 日志接缝，其中包括面向 assistant 的可见文本剥离、markdown 渲染 / 分块 helper、脱敏 helper、directive-tag helper 和安全文本工具。
- 对于审批专属渠道接缝，优先在插件上定义一个 `approvalCapability` 契约。随后 core 将通过这一项能力读取审批认证、投递、渲染、原生路由和惰性原生处理器行为，而不是把审批行为混入不相关的插件字段。
- `openclaw/plugin-sdk/channel-runtime` 已弃用，当前仅作为旧插件的兼容性 shim 保留。新代码应导入更窄的通用原语，仓库代码也不应新增对这个 shim 的导入。
- 内置扩展内部实现应保持私有。外部插件只能使用 `openclaw/plugin-sdk/*` 子路径。OpenClaw core / test 代码可使用插件包根目录下的仓库公共入口点，例如 `index.js`、`api.js`、`runtime-api.js`、`setup-entry.js` 以及像 `login-qr-api.js` 这样的狭窄文件。绝不要从 core 或其他扩展中导入某个插件包的 `src/*`。
- 仓库入口点拆分：
  `<plugin-package-root>/api.js` 是 helper / types barrel，
  `<plugin-package-root>/runtime-api.js` 是仅运行时 barrel，
  `<plugin-package-root>/index.js` 是内置插件入口，
  `<plugin-package-root>/setup-entry.js` 是设置插件入口。
- 当前内置 provider 示例：
  - Anthropic 使用 `api.js` / `contract-api.js` 提供 Claude stream helper，例如 `wrapAnthropicProviderStream`、beta-header helper 和 `service_tier` 解析。
  - OpenAI 使用 `api.js` 提供 provider builder、默认模型 helper 和实时 provider builder。
  - OpenRouter 使用 `api.js` 提供 provider builder 以及新手引导 / 配置 helper，而 `register.runtime.js` 仍可为仓库本地用途重新导出通用 `plugin-sdk/provider-stream` helper。
- 使用 facade 加载的公共入口点会优先使用当前活动的运行时配置快照；如果 OpenClaw 尚未提供运行时快照，则回退到磁盘上的已解析配置文件。
- 通用共享原语仍然是首选的公共 SDK 契约。当前仍存在一小组保留的、与内置渠道品牌相关的兼容性 helper 接缝。应将它们视为内置维护 / 兼容性接缝，而不是新的第三方导入目标；新的跨渠道契约仍应落在通用 `plugin-sdk/*` 子路径，或插件本地 `api.js` /
  `runtime-api.js` barrel 上。

兼容性说明：

- 新代码请避免使用根 `openclaw/plugin-sdk` barrel。
- 优先使用更窄且稳定的原语。较新的 setup / pairing / reply /
  feedback / contract / inbound / threading / command / secret-input / webhook / infra /
  allowlist / status / message-tool 子路径，才是新内置和外部插件开发的预期契约。
  目标解析 / 匹配应放在 `openclaw/plugin-sdk/channel-targets`。
  消息动作 gate 和 reaction message-id helper 应放在
  `openclaw/plugin-sdk/channel-actions`。
- 内置扩展专属 helper barrel 默认不稳定。如果某个 helper 只被内置扩展使用，请将其保留在该扩展本地的 `api.js` 或 `runtime-api.js` 接缝中，而不要提升到 `openclaw/plugin-sdk/<extension>`。
- 新的共享 helper 接缝应当是通用的，而不是渠道品牌化的。共享目标解析应位于 `openclaw/plugin-sdk/channel-targets`；渠道专属内部实现则保留在拥有它的插件本地 `api.js` 或 `runtime-api.js` 接缝后面。
- 像 `image-generation`、
  `media-understanding` 和 `speech` 这样的能力专属子路径之所以存在，是因为当前内置 / 原生插件正在使用它们。但这并不自动意味着其中导出的每个 helper 都是长期冻结的外部契约。

## 消息工具 schema

插件应拥有渠道专属的 `describeMessageTool(...)` schema 扩展。请将 provider 专属字段保留在插件中，而不是放进共享 core。

对于可移植的共享 schema 片段，请复用
`openclaw/plugin-sdk/channel-actions` 导出的通用 helper：

- `createMessageToolButtonsSchema()` 用于按钮网格式载荷
- `createMessageToolCardSchema()` 用于结构化卡片载荷

如果某个 schema 形态只适用于一个 provider，请把它定义在该插件自己的源码中，而不要提升到共享 SDK 中。

## 渠道目标解析

渠道插件应拥有渠道专属的目标语义。请保持共享 outbound 宿主的通用性，并使用消息适配器能力面来承载 provider 规则：

- `messaging.inferTargetChatType({ to })` 在目录查找前，决定规范化目标应被视为 `direct`、`group` 还是 `channel`。
- `messaging.targetResolver.looksLikeId(raw, normalized)` 告诉 core 某个输入是否应跳过目录搜索，直接进入类似 id 的解析流程。
- `messaging.targetResolver.resolveTarget(...)` 是 core 在规范化之后或目录未命中之后所调用的插件回退，用于执行最终的 provider 拥有解析。
- `messaging.resolveOutboundSessionRoute(...)` 在目标解析完成后拥有 provider 专属会话路由构造逻辑。

推荐拆分方式：

- 使用 `inferTargetChatType` 处理目录搜索前的类型决策。
- 使用 `looksLikeId` 处理“将其视为显式 / 原生目标 id”的判断。
- 使用 `resolveTarget` 处理 provider 专属的规范化回退，而不是进行大范围目录搜索。
- 将 provider 原生 id，例如 chat id、thread id、JID、handle 和 room id，保留在 `target` 值或 provider 专属参数中，而不要放进通用 SDK 字段。

## 配置支持的目录

对于从配置推导目录条目的插件，请将逻辑保留在插件中，并复用
`openclaw/plugin-sdk/directory-runtime` 中的共享 helper。

这适用于渠道需要配置支持的 peers / groups 的场景，例如：

- 基于 allowlist 的私信 peers
- 已配置的 channel / group 映射
- 按账号划分的静态目录回退

`directory-runtime` 中的共享 helper 只处理通用操作：

- 查询过滤
- limit 应用
- 去重 / 规范化 helper
- 构建 `ChannelDirectoryEntry[]`

渠道专属的账号检查和 id 规范化仍应保留在插件实现中。

## 提供商目录

提供商插件可以通过
`registerProvider({ catalog: { run(...) { ... } } })` 定义推理用模型目录。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 时相同的结构：

- `{ provider }` 表示一个 provider 条目
- `{ providers }` 表示多个 provider 条目

当插件拥有 provider 专属 model id、base URL 默认值或受认证门控的模型元数据时，请使用 `catalog`。

`catalog.order` 控制插件目录相对于 OpenClaw 内置隐式 provider 的合并时机：

- `simple`：普通 API key 或环境变量驱动 provider
- `profile`：存在 auth profile 时出现的 provider
- `paired`：会合成多个相关 provider 条目的 provider
- `late`：最后一轮，在其他隐式 provider 之后

后面的 provider 会在键冲突时胜出，因此插件可以有意用相同 provider id 覆盖某个内置 provider 条目。

兼容性：

- `discovery` 仍然作为旧式别名可用
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 会使用 `catalog`

## 只读渠道检查

如果你的插件注册了一个渠道，建议同时实现
`plugin.config.inspectAccount(cfg, accountId)` 和 `resolveAccount(...)`。

原因：

- `resolveAccount(...)` 是运行时路径。它可以假定凭证已经完全物化，并且在缺少必需 secret 时快速失败。
- 像 `openclaw status`、`openclaw status --all`、`openclaw channels status`、
  `openclaw channels resolve` 以及 doctor / 配置修复流程这样的只读命令路径，不应为了描述配置就去物化运行时凭证。

推荐的 `inspectAccount(...)` 行为：

- 仅返回描述性账号状态。
- 保留 `enabled` 和 `configured`。
- 在相关时包含凭证来源 / 状态字段，例如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 你不需要返回原始 token 值，也能报告只读可用性。返回 `tokenStatus: "available"`（以及对应的 source 字段）就足以满足状态类命令。
- 当凭证通过 SecretRef 配置，但在当前命令路径中不可用时，请使用 `configured_unavailable`。

这样，只读命令就能报告“已配置，但在当前命令路径中不可用”，而不是崩溃或误报为未配置。

## 包组合包

一个插件目录可以包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

其中每个条目都会变成一个插件。如果该组合包列出了多个扩展，插件 id 会变成 `name/<fileBase>`。

如果你的插件导入 npm 依赖，请在该目录中安装这些依赖，以便 `node_modules` 可用（`npm install` / `pnpm install`）。

安全护栏：每个 `openclaw.extensions` 条目在解析符号链接后都必须仍位于插件目录内部。任何逃逸出包目录的条目都会被拒绝。

安全说明：`openclaw plugins install` 会用
`npm install --omit=dev --ignore-scripts` 安装插件依赖（运行时不安装生命周期脚本，也不安装 dev 依赖）。请保持插件依赖树为“纯 JS / TS”，并避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向一个轻量级、仅设置用的模块。当 OpenClaw 需要为一个已禁用的渠道插件，或一个已启用但尚未配置的渠道插件提供设置能力面时，它会加载 `setupEntry`，而不是完整插件入口。这样当你的主插件入口还会接入工具、hook 或其他仅运行时代码时，可以让启动和设置更加轻量。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可以让某个渠道插件在 Gateway 网关监听前的启动阶段，即使该渠道已配置，也优先走同一个 `setupEntry` 路径。

只有当 `setupEntry` 能完整覆盖启动前必须存在的能力面时，才应使用它。实际上，这意味着设置入口必须注册启动依赖的每一项渠道拥有能力，例如：

- 渠道注册本身
- 在 Gateway 网关开始监听前必须可用的任何 HTTP 路由
- 在同一时间窗口内必须存在的任何 Gateway 网关方法、工具或服务

如果完整入口仍然拥有任何必需的启动能力，就不要启用这个标志。请保持默认行为，让 OpenClaw 在启动期间加载完整入口。

内置渠道还可以发布仅设置期的契约能力面 helper，供 core 在完整渠道运行时加载前查询。当前的设置提升能力面包括：

- `singleAccountKeysToMove`
- `namedAccountPromotionKeys`
- `resolveSingleAccountPromotionTarget(...)`

当 core 需要将旧式单账号渠道配置提升为 `channels.<id>.accounts.*`，而又不加载完整插件入口时，就会使用这部分能力面。Matrix 是当前的内置示例：当已存在命名账号时，它只会把认证 / bootstrap key 移动到一个命名提升账号中，并且可以保留一个已配置的、非规范默认账号 key，而不是总是创建 `accounts.default`。

这些设置补丁适配器让内置契约能力面的发现保持惰性。导入时保持轻量；提升能力面只会在首次使用时加载，而不会在模块导入时重新进入内置渠道启动流程。

如果这些启动能力面包含 Gateway 网关 RPC 方法，请将它们放在插件专属前缀下。Core 管理命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）始终保留，并且总会解析为 `operator.admin`，即使某个插件请求了更窄的作用域。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 渠道目录元数据

渠道插件可以通过 `openclaw.channel` 广播设置 / 发现元数据，并通过 `openclaw.install` 广播安装提示。这样 core 目录就可以保持无数据状态。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (self-hosted)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "Self-hosted chat via Nextcloud Talk webhook bots.",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "<bundled-plugin-local-path>",
      "defaultChoice": "npm"
    }
  }
}
```

除了最小示例之外，其他有用的 `openclaw.channel` 字段包括：

- `detailLabel`：用于更丰富目录 / 状态能力面的次级标签
- `docsLabel`：覆盖 docs 链接文本
- `preferOver`：该目录条目应优先于哪些低优先级插件 / 渠道 id
- `selectionDocsPrefix`、`selectionDocsOmitLabel`、`selectionExtras`：选择能力面的文案控制项
- `markdownCapable`：将该渠道标记为支持 markdown，用于 outbound 格式决策
- `exposure.configured`：设为 `false` 时，在已配置渠道列表能力面中隐藏该渠道
- `exposure.setup`：设为 `false` 时，在交互式设置 / 配置选择器中隐藏该渠道
- `exposure.docs`：在 docs 导航能力面中将该渠道标记为内部 / 私有
- `showConfigured` / `showInSetup`：仍接受的旧式兼容别名；优先使用 `exposure`
- `quickstartAllowFrom`：使该渠道接入标准快速开始 `allowFrom` 流程
- `forceAccountBinding`：即使只存在一个账号，也要求显式账号绑定
- `preferSessionLookupForAnnounceTarget`：在解析 announce 目标时优先使用会话查找

OpenClaw 还可以合并**外部渠道目录**（例如某个 MPM
注册表导出）。将 JSON 文件放到以下任一路径：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或者让 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（以逗号 / 分号 / `PATH` 分隔）。每个文件应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。解析器也接受 `"packages"` 或 `"plugins"` 作为 `"entries"` 键的旧式别名。

## 上下文引擎插件

上下文引擎插件拥有会话上下文的摄取、组装和压缩编排。请在插件中使用
`api.registerContextEngine(id, factory)` 注册它们，然后通过
`plugins.slots.contextEngine` 选择活动引擎。

当你的插件需要替换或扩展默认上下文流水线，而不是仅仅增加 memory search 或 hook 时，请使用它。

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

如果你的引擎**不**拥有压缩算法本身，请保留 `compact()`
实现，并显式委托：

```ts
import {
  buildMemorySystemPromptAddition,
  delegateCompactionToRuntime,
} from "openclaw/plugin-sdk/core";

export default function (api) {
  api.registerContextEngine("my-memory-engine", () => ({
    info: {
      id: "my-memory-engine",
      name: "My Memory Engine",
      ownsCompaction: false,
    },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages, availableTools, citationsMode }) {
      return {
        messages,
        estimatedTokens: 0,
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },
    async compact(params) {
      return await delegateCompactionToRuntime(params);
    },
  }));
}
```

## 添加新能力

当插件需要当前 API 无法表达的行为时，不要通过私有穿透绕过插件系统。应添加缺失的能力。

推荐顺序：

1. 定义 core 契约
   明确 core 应拥有哪些共享行为：策略、回退、配置合并、
   生命周期、面向渠道的语义以及运行时 helper 形态。
2. 添加 typed 的插件注册 / 运行时能力面
   以最小而有用的 typed 能力面扩展 `OpenClawPluginApi` 和 / 或 `api.runtime`。
3. 接入 core 与渠道 / 功能消费者
   渠道和功能插件应通过 core 消费新能力，而不是直接导入某个厂商实现。
4. 注册厂商实现
   然后让厂商插件针对该能力注册它们的后端实现。
5. 添加契约覆盖
   添加测试，让归属和注册形态能够长期保持显式。

这正是 OpenClaw 保持有主见、又不被某个提供商世界观硬编码绑死的方式。具体的文件清单和示例请参阅 [能力扩展手册](/zh-CN/plugins/architecture)。

### 能力清单

当你添加一个新能力时，实现通常应同时涉及以下能力面：

- `src/<capability>/types.ts` 中的 core 契约类型
- `src/<capability>/runtime.ts` 中的 core runner / 运行时 helper
- `src/plugins/types.ts` 中的插件 API 注册能力面
- `src/plugins/registry.ts` 中的插件注册表接线
- 当功能 / 渠道插件需要消费该能力时，位于 `src/plugins/runtime/*` 中的插件运行时暴露
- `src/test-utils/plugin-registration.ts` 中的捕获 / 测试 helper
- `src/plugins/contracts/registry.ts` 中的归属 / 契约断言
- `docs/` 中的运维者 / 插件文档

如果这些能力面中缺了某一个，通常说明该能力尚未真正完整接入。

### 能力模板

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "openai",
  label: "OpenAI",
  async generateVideo(req) {
    return await generateOpenAiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契约测试模式：

```ts
expect(findVideoGenerationProviderIdsForPlugin("openai")).toEqual(["openai"]);
```

这样规则就很简单：

- core 拥有能力契约 + 编排
- 厂商插件拥有厂商实现
- 功能 / 渠道插件消费运行时 helper
- 契约测试让归属保持显式
