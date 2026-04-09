---
read_when:
    - 添加新的核心能力和插件注册入口
    - 判断代码应属于核心、供应商插件还是功能插件
    - 为渠道或工具接入新的运行时辅助能力
sidebarTitle: Adding Capabilities
summary: 为 OpenClaw 插件系统添加新的共享能力的贡献者指南
title: 添加能力（贡献者指南）
x-i18n:
    generated_at: "2026-04-09T00:52:30Z"
    model: gpt-5.4
    provider: openai
    source_hash: 29604d88e6df5205b835d71f3078b6223c58b6294135c3e201756c1bcac33ea3
    source_path: tools\capability-cookbook.md
    workflow: 15
---

# 添加能力

<Info>
  这是面向 OpenClaw 核心开发者的**贡献者指南**。如果你正在
  构建外部插件，请改看 [Building Plugins](/zh-CN/plugins/building-plugins)。
</Info>

当 OpenClaw 需要一个新的领域能力时使用本文，例如图像生成、视频
生成，或未来某个由供应商支持的功能领域。

规则是：

- plugin = 所有权边界
- capability = 共享核心契约

这意味着，你不应该一开始就把某个供应商直接接入到渠道或工具中。
应先定义能力。

## 何时创建一个能力

当以下条件全部满足时，创建一个新的能力：

1. 不止一个供应商有可能实现它
2. 渠道、工具或功能插件应该在不关心供应商的情况下使用它
3. 核心需要负责回退、策略、配置或交付行为

如果这项工作只属于单一供应商，且目前还没有共享契约，那就先停下，
先定义契约。

## 标准顺序

1. 定义带类型的核心契约。
2. 为该契约添加插件注册。
3. 添加共享的运行时辅助能力。
4. 接入一个真实的供应商插件作为证明。
5. 将功能 / 渠道使用方迁移到运行时辅助能力上。
6. 添加契约测试。
7. 记录面向操作者的配置和所有权模型。

## 各部分应放在哪里

核心：

- 请求 / 响应类型
- provider 注册表 + 解析
- 回退行为
- 配置 schema，以及在嵌套对象、通配节点、数组项和组合节点上传播的 `title` / `description` 文档元数据
- 运行时辅助能力入口

供应商插件：

- 供应商 API 调用
- 供应商认证处理
- 供应商特定的请求规范化
- 该能力实现的注册

功能 / 渠道插件：

- 调用 `api.runtime.*` 或对应的 `plugin-sdk/*-runtime` 辅助能力
- 绝不直接调用供应商实现

## 文件检查清单

对于一个新能力，通常需要修改这些区域：

- `src/<capability>/types.ts`
- `src/<capability>/...registry/runtime.ts`
- `src/plugins/types.ts`
- `src/plugins/registry.ts`
- `src/plugins/captured-registration.ts`
- `src/plugins/contracts/registry.ts`
- `src/plugins/runtime/types-core.ts`
- `src/plugins/runtime/index.ts`
- `src/plugin-sdk/<capability>.ts`
- `src/plugin-sdk/<capability>-runtime.ts`
- 一个或多个内置插件包
- config / docs / tests

## 示例：图像生成

图像生成遵循标准结构：

1. 核心定义 `ImageGenerationProvider`
2. 核心暴露 `registerImageGenerationProvider(...)`
3. 核心暴露 `runtime.imageGeneration.generate(...)`
4. `openai`、`google`、`fal` 和 `minimax` 插件注册由供应商支持的实现
5. 未来其他供应商可以注册同一契约，而无需更改渠道 / 工具

这个配置键与视觉分析路由是分开的：

- `agents.defaults.imageModel` = 分析图像
- `agents.defaults.imageGenerationModel` = 生成图像

请保持二者分离，这样回退和策略才能保持明确。

## 评审检查清单

在发布一个新能力之前，请确认：

- 没有任何渠道 / 工具直接导入供应商代码
- 运行时辅助能力是共享路径
- 至少有一个契约测试断言了内置所有权
- 配置文档写明了新的 model / config 键
- 插件文档解释清楚了所有权边界

如果某个 PR 跳过了能力层，直接把供应商行为硬编码进某个
渠道 / 工具中，请将其打回，并先定义契约。
