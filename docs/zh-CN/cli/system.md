---
read_when:
    - 你想在不创建 cron 作业的情况下排入一个系统事件
    - 你需要启用或禁用 heartbeats
    - 你想检查系统 presence 条目
summary: '`openclaw system` 的 CLI 参考（系统事件、heartbeat、presence）'
title: system
x-i18n:
    generated_at: "2026-04-08T03:56:42Z"
    model: gpt-5.4
    provider: openai
    source_hash: a7d19afde9d9cde8a79b0bb8cec6e5673466f4cb9b575fb40111fc32f4eee5d7
    source_path: cli\system.md
    workflow: 15
---

# `openclaw system`

用于 Gateway 网关的系统级辅助命令：排入系统事件、控制 heartbeats，
以及查看 presence。

所有 `system` 子命令都使用 Gateway 网关 RPC，并接受共享客户端标志：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## 常用命令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在**主**会话上排入一个系统事件。下一次 heartbeat 会将
它作为提示词中的一行 `System:` 注入。使用 `--mode now` 可立即触发 heartbeat；
`next-heartbeat` 则会等待下一次计划触发。

标志：

- `--text <text>`：必填，系统事件文本。
- `--mode <mode>`：`now` 或 `next-heartbeat`（默认）。
- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享 Gateway 网关 RPC 标志。

## `system heartbeat last|enable|disable`

Heartbeat 控制：

- `last`：显示最后一次 heartbeat 事件。
- `enable`：重新开启 heartbeats（如果它们曾被禁用，请使用此命令）。
- `disable`：暂停 heartbeats。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享 Gateway 网关 RPC 标志。

## `system presence`

列出 Gateway 网关当前已知的系统 presence 条目（节点、
实例以及类似状态行）。

标志：

- `--json`：机器可读输出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共享 Gateway 网关 RPC 标志。

## 说明

- 需要一个正在运行的 Gateway 网关，并且该 Gateway 网关可通过你当前配置（本地或远程）访问。
- 系统事件是临时性的，不会在重启后持久保留。
