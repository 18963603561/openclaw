---
read_when:
    - 你想要计划任务和唤醒
    - 你正在调试 cron 执行和日志
summary: '`openclaw cron` 的 CLI 参考（调度和运行后台任务）'
title: cron
x-i18n:
    generated_at: "2026-04-08T03:51:26Z"
    model: gpt-5.4
    provider: openai
    source_hash: f74ec8847835f24b3970f1b260feeb69c7ab6c6ec7e41615cbb73f37f14a8112
    source_path: cli\cron.md
    workflow: 15
---

# `openclaw cron`

管理 Gateway 网关调度器的 cron 任务。

相关内容：

- Cron 任务：[????](/zh-CN/automation/cron-jobs)

提示：运行 `openclaw cron --help` 查看完整命令界面。

注意：隔离的 `cron add` 任务默认使用 `--announce` 交付。使用 `--no-deliver` 可让输出仅保留在内部。
`--deliver` 仍作为 `--announce` 的弃用别名保留。

注意：由 cron 拥有的隔离运行期望返回纯文本摘要，并且运行器拥有最终发送路径。
`--no-deliver` 会让运行保持在内部；它不会将交付权交还给智能体的 message 工具。

注意：一次性（`--at`）任务默认会在成功后删除。使用 `--keep-after-run` 可保留它们。

注意：`--session` 支持 `main`、`isolated`、`current` 和 `session:<id>`。
使用 `current` 可在创建时绑定到当前活动会话，或使用 `session:<id>` 指定一个显式的持久化会话键。

注意：对于一次性 CLI 任务，不带偏移量的 `--at` 日期时间会被视为 UTC，除非你同时传入
`--tz <iana>`，此时会将该本地墙上时间按给定时区解释。

注意：循环任务现在会在连续错误后使用指数重试退避（30 秒 → 1 分钟 → 5 分钟 → 15 分钟 → 60 分钟），然后在下一次成功运行后返回正常调度。

注意：`openclaw cron run` 现在会在手动运行被排队执行后立即返回。成功响应包含 `{ ok: true, enqueued: true, runId }`；使用 `openclaw cron runs --id <job-id>` 跟踪最终结果。

注意：`openclaw cron run <job-id>` 默认会强制运行。使用 `--due` 可保留
旧的“仅在到期时运行”行为。

注意：隔离的 cron 轮次会抑制仅用于确认的过时回复。如果第一个结果只是中间状态更新，且没有任何后代子智能体运行负责最终答案，cron 会在交付前再次提示一次以获取真实结果。

注意：如果隔离的 cron 运行只返回静默 token（`NO_REPLY` /
`no_reply`），cron 会同时抑制直接对外交付和回退的排队摘要路径，因此不会有任何内容回发到聊天中。

注意：`cron add|edit --model ...` 会让该任务使用那个所选的允许模型。
如果该模型不被允许，cron 会发出警告，并回退到任务的智能体/默认模型选择。
已配置的回退链仍然适用，但仅有模型覆盖且没有显式的按任务回退列表时，不再把智能体主模型作为隐藏的额外重试目标附加进去。

注意：隔离 cron 的模型优先级首先是 Gmail hook 覆盖，然后是按任务的
`--model`，再然后是任何已存储的 cron 会话模型覆盖，最后才是常规的
智能体/默认选择。

注意：隔离 cron 的快速模式会遵循解析后的实时模型选择。模型
配置中的 `params.fastMode` 默认会生效，但已存储的会话 `fastMode`
覆盖仍然优先于配置。

注意：如果隔离运行抛出 `LiveSessionModelSwitchError`，cron 会在
重试前持久化切换后的提供商/模型（以及在存在时切换后的凭证配置覆盖）。
外层重试循环有上限：在初始尝试之后最多再进行 2 次切换重试，
然后中止，而不是无限循环。

注意：失败通知会优先使用 `delivery.failureDestination`，然后是
全局 `cron.failureDestination`，最后在未配置显式失败目标时回退到任务的主
announce 目标。

注意：保留/裁剪由配置控制：

- `cron.sessionRetention`（默认 `24h`）会清理已完成的隔离运行会话。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 会裁剪 `~/.openclaw/cron/runs/<jobId>.jsonl`。

升级说明：如果你有当前交付/存储格式之前创建的旧 cron 任务，请运行
`openclaw doctor --fix`。Doctor 现在会规范化旧版 cron 字段（`jobId`、`schedule.cron`、
顶层交付字段，包括旧版 `threadId`、载荷 `provider` 交付别名），并在
配置了 `cron.webhook` 时，将简单的 `notify: true` webhook 回退任务迁移为显式 webhook 交付。

## 常见编辑

在不更改消息的情况下更新交付设置：

```bash
openclaw cron edit <job-id> --announce --channel telegram --to "123456789"
```

为隔离任务禁用交付：

```bash
openclaw cron edit <job-id> --no-deliver
```

为隔离任务启用轻量级引导上下文：

```bash
openclaw cron edit <job-id> --light-context
```

发布到特定渠道：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
```

创建一个使用轻量级引导上下文的隔离任务：

```bash
openclaw cron add \
  --name "Lightweight morning brief" \
  --cron "0 7 * * *" \
  --session isolated \
  --message "Summarize overnight updates." \
  --light-context \
  --no-deliver
```

`--light-context` 仅适用于隔离的智能体轮次任务。对于 cron 运行，轻量模式会让引导上下文保持为空，而不是注入完整的工作区引导集合。

交付归属说明：

- 由 cron 拥有的隔离任务始终通过 cron 运行器路由最终用户可见的交付（`announce`、`webhook` 或仅内部的 `none`）。
- 如果任务提到要向某个外部接收者发送消息，智能体应在其结果中描述预期目标，而不是尝试直接发送。

## 常见管理命令

手动运行：

```bash
openclaw cron run <job-id>
openclaw cron run <job-id> --due
openclaw cron runs --id <job-id> --limit 50
```

智能体/会话重定向：

```bash
openclaw cron edit <job-id> --agent ops
openclaw cron edit <job-id> --clear-agent
openclaw cron edit <job-id> --session current
openclaw cron edit <job-id> --session "session:daily-brief"
```

交付调整：

```bash
openclaw cron edit <job-id> --announce --channel slack --to "channel:C1234567890"
openclaw cron edit <job-id> --best-effort-deliver
openclaw cron edit <job-id> --no-best-effort-deliver
openclaw cron edit <job-id> --no-deliver
```

失败交付说明：

- `delivery.failureDestination` 适用于隔离任务。
- 主会话任务仅在主交付模式为 `webhook` 时才可使用 `delivery.failureDestination`。
- 如果你没有设置任何失败目标，而该任务已经向某个渠道发布，则失败通知会复用同一个 announce 目标。
