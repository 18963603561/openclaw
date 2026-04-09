---
x-i18n:
    generated_at: "2026-04-08T07:02:25Z"
    model: gpt-5.4
    provider: openai
    source_hash: 3a13a050574d3fbd7a9a935aa57aa260a92975029b64418633df55159fd7cb29
    source_path: refactor\qa.md
    workflow: 15
---

# QA 重构

状态：基础迁移已落地。

## 目标

将 OpenClaw QA 从分离定义模型迁移为单一事实来源：

- 场景元数据
- 发送给模型的提示词
- 设置与清理
- harness 逻辑
- 断言与成功标准
- 制品与报告提示

目标最终状态是：使用功能强大的场景定义文件来驱动一个通用 QA harness，而不是把大多数行为硬编码在 TypeScript 中。

## 当前状态

当前的主要事实来源位于 `qa/scenarios.md`。

已实现：

- `qa/scenarios.md`
  - 规范 QA 包
  - 操作员身份
  - 启动任务
  - 场景元数据
  - handler 绑定
- `extensions/qa-lab/src/scenario-catalog.ts`
  - markdown 包解析器 + zod 校验
- `extensions/qa-lab/src/qa-agent-bootstrap.ts`
  - 从 markdown 包渲染计划
- `extensions/qa-lab/src/qa-agent-workspace.ts`
  - 生成兼容性文件种子，以及 `QA_SCENARIOS.md`
- `extensions/qa-lab/src/suite.ts`
  - 通过 markdown 定义的 handler 绑定选择可执行场景
- QA bus 协议 + UI
  - 用于图像 / 视频 / 音频 / 文件渲染的通用内联附件

仍然分裂的界面：

- `extensions/qa-lab/src/suite.ts`
  - 仍然承载了大部分可执行自定义 handler 逻辑
- `extensions/qa-lab/src/report.ts`
  - 仍然从运行时输出推导报告结构

所以，事实来源分裂的问题已经修复，但执行仍然主要依赖 handler，而不是完全声明式。

## 真实的场景界面是什么样的

阅读当前 suite 可以看出几类不同的场景。

### 简单交互

- 渠道基线
- 私信基线
- 线程后续跟进
- 模型切换
- 审批继续执行
- reaction / 编辑 / 删除

### 配置与运行时变更

- config patch skill disable
- config apply restart wake-up
- config restart capability flip
- runtime inventory drift check

### 文件系统与仓库断言

- source / docs discovery report
- 构建 Lobster Invaders
- 生成图像制品查找

### 记忆编排

- 记忆召回
- 渠道上下文中的记忆工具
- 记忆失败回退
- 会话记忆排序
- 线程记忆隔离
- 记忆 dreaming sweep

### 工具与插件集成

- MCP plugin-tools call
- skill 可见性
- skill 热安装
- 原生图像生成
- 图像往返
- 基于附件的图像理解

### 多轮与多角色

- subagent handoff
- subagent fanout synthesis
- restart recovery 风格流程

这些类别很重要，因为它们决定了 DSL 需求。仅有“提示词 + 预期文本”的平面列表是不够的。

## 方向

### 单一事实来源

使用 `qa/scenarios.md` 作为编写时的单一事实来源。

这个包应保持：

- 在评审中便于人类阅读
- 可供机器解析
- 足够丰富，能够驱动：
  - suite 执行
  - QA 工作区引导
  - QA Lab UI 元数据
  - docs / discovery 提示词
  - 报告生成

### 首选编写格式

使用 markdown 作为顶层格式，内部嵌入结构化 YAML。

推荐结构：

- YAML frontmatter
  - id
  - title
  - surface
  - tags
  - docs refs
  - code refs
  - model / provider overrides
  - prerequisites
- prose sections
  - objective
  - notes
  - debugging hints
- fenced YAML blocks
  - setup
  - steps
  - assertions
  - cleanup

这样可以得到：

- 比巨大的 JSON 更好的 PR 可读性
- 比纯 YAML 更丰富的上下文
- 严格解析和 zod 校验

原始 JSON 仅应作为中间生成形式接受。

## 提议的场景文件结构

示例：

````md
---
id: image-generation-roundtrip
title: Image generation roundtrip
surface: image
tags: [media, image, roundtrip]
models:
  primary: openai/gpt-5.4
requires:
  tools: [image_generate]
  plugins: [openai, qa-channel]
docsRefs:
  - docs/help/testing.md
  - docs/concepts/model-providers.md
codeRefs:
  - extensions/qa-lab/src/suite.ts
  - src/gateway/chat-attachments.ts
---

# Objective

Verify generated media is reattached on the follow-up turn.

# Setup

```yaml scenario.setup
- action: config.patch
  patch:
    agents:
      defaults:
        imageGenerationModel:
          primary: openai/gpt-image-1
- action: session.create
  key: agent:qa:image-roundtrip
```
````

# Steps

```yaml scenario.steps
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Image generation check: generate a QA lighthouse image and summarize it in one short sentence.
- action: artifact.capture
  kind: generated-image
  promptSnippet: Image generation check
  saveAs: lighthouseImage
- action: agent.send
  session: agent:qa:image-roundtrip
  message: |
    Roundtrip image inspection check: describe the generated lighthouse attachment in one short sentence.
  attachments:
    - fromArtifact: lighthouseImage
```

# Expect

```yaml scenario.expect
- assert: outbound.textIncludes
  value: lighthouse
- assert: requestLog.matches
  where:
    promptIncludes: Roundtrip image inspection check
  imageInputCountGte: 1
- assert: artifact.exists
  ref: lighthouseImage
```

````

## 运行器能力：DSL 必须覆盖的内容

基于当前 suite，通用运行器需要的不只是提示词执行。

### 环境与设置操作

- `bus.reset`
- `gateway.waitHealthy`
- `channel.waitReady`
- `session.create`
- `thread.create`
- `workspace.writeSkill`

### 智能体轮次操作

- `agent.send`
- `agent.wait`
- `bus.injectInbound`
- `bus.injectOutbound`

### 配置与运行时操作

- `config.get`
- `config.patch`
- `config.apply`
- `gateway.restart`
- `tools.effective`
- `skills.status`

### 文件与制品操作

- `file.write`
- `file.read`
- `file.delete`
- `file.touchTime`
- `artifact.captureGeneratedImage`
- `artifact.capturePath`

### 记忆与 cron 操作

- `memory.indexForce`
- `memory.searchCli`
- `doctor.memory.status`
- `cron.list`
- `cron.run`
- `cron.waitCompletion`
- `sessionTranscript.write`

### MCP 操作

- `mcp.callTool`

### 断言

- `outbound.textIncludes`
- `outbound.inThread`
- `outbound.notInRoot`
- `tool.called`
- `tool.notPresent`
- `skill.visible`
- `skill.disabled`
- `file.contains`
- `memory.contains`
- `requestLog.matches`
- `sessionStore.matches`
- `cron.managedPresent`
- `artifact.exists`

## 变量与制品引用

DSL 必须支持保存输出并在后续引用。

当前 suite 中的例子：

- 创建线程，然后复用 `threadId`
- 创建会话，然后复用 `sessionKey`
- 生成图像，然后在下一轮中附加该文件
- 生成一个 wake marker 字符串，然后断言它稍后会出现

需要的能力：

- `saveAs`
- `${vars.name}`
- `${artifacts.name}`
- 用于路径、会话键、线程 id、marker、工具输出的类型化引用

如果没有变量支持，harness 逻辑仍会不断泄漏回 TypeScript 中。

## 哪些内容应该保留为逃生口

在第 1 阶段，实现一个完全纯粹的声明式运行器并不现实。

有些场景天然更偏向编排：

- memory dreaming sweep
- config apply restart wake-up
- config restart capability flip
- 通过时间戳 / 路径解析生成图像制品
- discovery-report 评估

这些场景目前应继续使用显式自定义 handler。

推荐规则：

- 85 - 90% 声明式
- 对剩余难点使用显式 `customHandler` 步骤
- 只允许具名且有文档的自定义 handler
- 场景文件中不允许匿名内联代码

这样既能保持通用引擎整洁，也能继续推进工作。

## 架构变更

### 当前

场景 markdown 已经是以下内容的事实来源：

- suite 执行
- 工作区引导文件
- QA Lab UI 场景目录
- 报告元数据
- discovery 提示词

生成的兼容性内容：

- 种子工作区仍包含 `QA_KICKOFF_TASK.md`
- 种子工作区仍包含 `QA_SCENARIO_PLAN.md`
- 种子工作区现在还包含 `QA_SCENARIOS.md`

## 重构计划

### 第 1 阶段：加载器与 schema

已完成。

- 添加了 `qa/scenarios.md`
- 添加了用于命名 markdown YAML 包内容的解析器
- 使用 zod 完成校验
- 将使用方切换到已解析的包
- 移除了仓库级 `qa/seed-scenarios.json` 和 `qa/QA_KICKOFF_TASK.md`

### 第 2 阶段：通用引擎

- 将 `extensions/qa-lab/src/suite.ts` 拆分为：
  - loader
  - engine
  - action registry
  - assertion registry
  - custom handlers
- 保留现有辅助函数，作为引擎操作

交付物：

- 引擎可执行简单的声明式场景

从那些主要是 prompt + wait + assert 的场景开始：

- threaded follow-up
- image understanding from attachment
- skill visibility and invocation
- channel baseline

交付物：

- 首批真正由 markdown 定义的场景通过通用引擎上线

### 第 4 阶段：迁移中等复杂度场景

- image generation roundtrip
- memory tools in channel context
- session memory ranking
- subagent handoff
- subagent fanout synthesis

交付物：

- 变量、制品、工具断言、request-log 断言得到验证

### 第 5 阶段：将困难场景保留在自定义 handler 中

- memory dreaming sweep
- config apply restart wake-up
- config restart capability flip
- runtime inventory drift

交付物：

- 相同的编写格式，但在需要时使用显式 custom-step 区块

### 第 6 阶段：删除硬编码场景映射

一旦包覆盖率足够高：

- 移除 `extensions/qa-lab/src/suite.ts` 中大部分针对具体场景的 TypeScript 分支

## 假 Slack / 富媒体支持

当前 QA bus 以文本优先。

相关文件：

- `extensions/qa-channel/src/protocol.ts`
- `extensions/qa-lab/src/bus-state.ts`
- `extensions/qa-lab/src/bus-queries.ts`
- `extensions/qa-lab/src/bus-server.ts`
- `extensions/qa-lab/web/src/ui-render.ts`

当前 QA bus 支持：

- 文本
- reactions
- 线程

它尚未建模内联媒体附件。

### 所需的传输契约

添加一个通用 QA bus 附件模型：

```ts
type QaBusAttachment = {
  id: string;
  kind: "image" | "video" | "audio" | "file";
  mimeType: string;
  fileName?: string;
  inline?: boolean;
  url?: string;
  contentBase64?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  transcript?: string;
};
````

然后将 `attachments?: QaBusAttachment[]` 添加到：

- `QaBusMessage`
- `QaBusInboundMessageInput`
- `QaBusOutboundMessageInput`

### 为什么要先做通用模型

不要构建一个仅限 Slack 的媒体模型。

而应该采用：

- 一个通用 QA 传输模型
- 在其之上的多个渲染器
  - 当前 QA Lab 聊天
  - 未来的假 Slack Web
  - 任何其他假传输视图

这样可以避免重复逻辑，并让媒体场景保持与传输层无关。

### 需要的 UI 工作

更新 QA UI，以渲染：

- 内联图像预览
- 内联音频播放器
- 内联视频播放器
- 文件附件 chip

当前 UI 已经可以渲染线程和 reactions，因此附件渲染应能叠加到相同的消息卡片模型之上。

### 媒体传输将启用的场景工作

一旦附件可以通过 QA bus 流转，我们就能加入更丰富的假聊天场景：

- 假 Slack 中的内联图像回复
- 音频附件理解
- 视频附件理解
- 混合附件排序
- 保留媒体的线程回复

## 建议

下一个实现块应当是：

1. 添加 markdown 场景加载器 + zod schema
2. 从 markdown 生成当前目录
3. 先迁移几个简单场景
4. 添加通用 QA bus 附件支持
5. 在 QA UI 中渲染内联图像
6. 然后扩展到音频和视频

这是能够同时验证两个目标的最小路径：

- 通用的 markdown 定义 QA
- 更丰富的假消息界面

## 开放问题

- 场景文件是否应允许带变量插值的嵌入式 markdown 提示词模板
- setup / cleanup 应该是具名区段，还是只是有序操作列表
- 制品引用在 schema 中应是强类型，还是基于字符串
- 自定义 handler 应放在一个 registry 中，还是按 surface 分 registry
- 在迁移期间，生成的 JSON 兼容性文件是否应继续纳入版本控制
