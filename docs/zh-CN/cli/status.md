---
read_when:
    - 你想快速诊断渠道健康状态 + 最近会话收件人时
    - 你想获取可直接粘贴用于调试的 “all” 状态时
summary: '`openclaw status` 的 CLI 参考（诊断、探测、用量快照）'
title: status
x-i18n:
    generated_at: "2026-04-08T03:57:10Z"
    model: gpt-5.4
    provider: openai
    source_hash: fbe9d94fbe9938cd946ee6f293b5bd3b464b75e1ade2eacdd851788c3bffe94e
    source_path: cli\status.md
    workflow: 15
---

# `openclaw status`

用于渠道 + 会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

说明：

- `--deep` 会运行实时探测（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- `--usage` 会将标准化的 provider 用量窗口打印为 `X% left`。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示的是剩余额度，因此 OpenClaw 会在显示前对其取反；当存在基于计数的字段时，这些字段优先生效。`model_remains` 响应会优先选择 chat-model 条目，在需要时从时间戳推导窗口标签，并在套餐标签中包含模型名称。
- 当当前会话快照信息较少时，`/status` 可以从最近的 transcript 用量日志回填 token 和缓存计数器。现有的非零实时值仍然优先于 transcript 回填值。
- Transcript 回填还可以在实时会话条目缺失时恢复活动运行时模型标签。如果该 transcript 模型与已选模型不同，status 会基于恢复出的运行时模型，而不是已选模型，来解析上下文窗口。
- 对于提示词大小统计，当会话元数据缺失或更小时，transcript 回填会优先使用更大的、面向提示词的总量值，因此自定义 provider 会话不会退化为显示 `0` token。
- 当配置了多个智能体时，输出会包含按智能体划分的会话存储。
- 概览在可用时会包含 Gateway 网关 + 节点主机服务的安装/运行状态。
- 概览会包含更新渠道 + git SHA（针对源码检出）。
- 更新信息会显示在概览中；如果有可用更新，status 会打印运行 `openclaw update` 的提示（参见 [更新](/zh-CN/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会在可能时为目标配置路径解析受支持的 SecretRef。
- 如果某个受支持的渠道 SecretRef 已配置，但在当前命令路径中不可用，status 会保持只读，并输出降级结果，而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”之类的警告，JSON 输出则包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 会优先使用已解析快照，并清除最终输出中临时的“secret unavailable”渠道标记。
- `status --all` 会包含一行 Secrets 概览以及一个诊断部分，用于汇总 secret 诊断信息（为便于阅读会进行截断），且不会中断报告生成。
