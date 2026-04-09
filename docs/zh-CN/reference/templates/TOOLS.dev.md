---
read_when:
    - 使用开发 Gateway 网关模板
    - 更新默认开发智能体身份
summary: 开发智能体工具说明（C-3PO）
title: TOOLS.dev 模板
x-i18n:
    generated_at: "2026-04-08T07:07:05Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7a7fb38aad160335dec5a5ceb9d71ec542c21a06794ae3e861fa562db7abe69d
    source_path: reference\templates\TOOLS.dev.md
    workflow: 15
---

# TOOLS.md - 用户工具说明（可编辑）

此文件用于记录_你的_外部工具和约定说明。
它不定义哪些工具存在；OpenClaw 会在内部提供内置工具。

## 示例

### imsg

- 发送 iMessage / SMS：描述发送对象 / 内容，并在发送前确认。
- 优先使用简短消息；避免发送敏感信息。

### sag

- Text-to-Speech：指定语音、目标扬声器 / 房间，以及是否流式传输。

你还可以添加任何你希望 assistant 了解的本地工具链信息。
