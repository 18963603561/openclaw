---
read_when:
    - 添加 BOOT.md 检查清单
summary: 用于 BOOT.md 的工作区模板
title: BOOT.md 模板
x-i18n:
    generated_at: "2026-04-08T07:05:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: 694e836d2c4010bf723d0e64f40e98800d3c135ca4c4124d42f96f5e050936f8
    source_path: reference\templates\BOOT.md
    workflow: 15
---

# BOOT.md

为 OpenClaw 在启动时应执行的操作添加简短、明确的说明（启用 `hooks.internal.enabled`）。
如果任务会发送消息，请使用 message 工具，然后以精确的静默 token `NO_REPLY` / `no_reply` 进行回复。
