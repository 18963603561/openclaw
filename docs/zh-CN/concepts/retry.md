---
read_when:
    - 更新提供商重试行为或默认值
    - 调试提供商发送错误或速率限制
summary: 出站提供商调用的重试策略
title: 重试策略
x-i18n:
    generated_at: "2026-04-08T04:04:49Z"
    model: gpt-5.4
    provider: openai
    source_hash: 55bb261ff567f46ce447be9c0ee0c5b5e6d2776287d7662762656c14108dd607
    source_path: concepts\retry.md
    workflow: 15
---

# 重试策略

## 目标

- 按每个 HTTP 请求重试，而不是按多步骤流程重试。
- 仅重试当前步骤，以保持顺序。
- 避免重复执行非幂等操作。

## 默认值

- 尝试次数：3
- 最大延迟上限：30000 ms
- 抖动：0.1（10%）
- 提供商默认值：
  - Telegram 最小延迟：400 ms
  - Discord 最小延迟：500 ms

## 行为

### Discord

- 仅在速率限制错误（HTTP 429）时重试。
- 可用时使用 Discord 的 `retry_after`，否则使用指数退避。

### Telegram

- 在瞬时错误时重试（429、超时、connect/reset/closed、temporarily unavailable）。
- 可用时使用 `retry_after`，否则使用指数退避。
- Markdown 解析错误不会重试；它们会回退为纯文本。

## 配置

在 `~/.openclaw/openclaw.json` 中为每个提供商设置重试策略：

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## 说明

- 重试按每个请求生效（消息发送、媒体上传、反应、投票、贴纸）。
- 复合流程不会重试已经完成的步骤。
