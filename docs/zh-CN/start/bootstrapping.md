---
read_when:
    - 了解首次智能体运行时会发生什么
    - 解释引导文件位于哪里
    - 调试新手引导身份设置
sidebarTitle: Bootstrapping
summary: 为工作区和身份文件建立初始内容的智能体引导仪式
title: 智能体引导
x-i18n:
    generated_at: "2026-04-08T07:10:14Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4a08b5102f25c6c4bcdbbdd44384252a9e537b245a7b070c4961a72b4c6c6601
    source_path: start\bootstrapping.md
    workflow: 15
---

# 智能体引导

引导是一次**首次运行**仪式，用于准备智能体工作区并收集身份信息。它发生在新手引导之后，也就是智能体第一次启动时。

## 引导会做什么

在智能体首次运行时，OpenClaw 会对工作区（默认
`~/.openclaw/workspace`）执行引导：

- 写入初始的 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行一个简短的问答仪式（一次只问一个问题）。
- 将身份信息和偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，以确保它只运行一次。

## 它运行在哪里

引导始终运行在**Gateway 网关宿主**上。如果 macOS 应用连接到
远程 Gateway 网关，那么工作区和引导文件都位于那台远程机器上。

<Note>
当 Gateway 网关运行在另一台机器上时，请在 Gateway 网关宿主上编辑工作区文件
（例如 `user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用新手引导： [新手引导](/zh-CN/start/onboarding)
- 工作区布局： [智能体工作区](/zh-CN/concepts/agent-workspace)
