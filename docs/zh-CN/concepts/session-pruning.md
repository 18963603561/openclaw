---
read_when:
    - 你想减少工具输出带来的上下文膨胀
    - 你想了解 Anthropic prompt cache 优化机制
summary: 修剪旧工具结果，以保持上下文精简并提升缓存效率
title: 会话修剪
x-i18n:
    generated_at: "2026-04-08T04:05:10Z"
    model: gpt-5.4
    provider: openai
    source_hash: 1569a50e0018cca3e3ceefbdddaf093843df50cdf2f7bf62fe925299875cb487
    source_path: concepts\session-pruning.md
    workflow: 15
---

# 会话修剪

会话修剪会在每次 LLM 调用之前，从上下文中裁剪**旧的工具结果**。
它可以减少累积的工具输出（exec 结果、文件读取结果、搜索结果）带来的上下文膨胀，同时不会改写正常的对话文本。

<Info>
修剪仅发生在内存中——不会修改磁盘上的会话记录。
你的完整历史始终会被保留。
</Info>

## 为什么这很重要

长会话会不断累积工具输出，从而撑大上下文窗口。
这会增加成本，并可能迫使系统比预期更早触发 [??](/zh-CN/concepts/compaction)。

对于 **Anthropic prompt caching**，修剪尤其有价值。缓存 TTL 过期后，下一次请求会重新缓存完整 prompt。修剪可以减少缓存写入大小，从而直接降低成本。

## 工作原理

1. 等待缓存 TTL 过期（默认 5 分钟）。
2. 找到用于常规修剪的旧工具结果（对话文本保持不变）。
3. 对过大的结果执行**软裁剪**——保留开头和结尾，并插入 `...`。
4. 对其余内容执行**硬清除**——替换为占位符。
5. 重置 TTL，使后续请求复用新的缓存。

## 旧版图像清理

OpenClaw 还会对较旧的遗留会话执行一套独立的幂等清理逻辑，这些会话会在历史记录中持久化原始图像块。

- 它会逐字节保留**最近 3 个已完成轮次**，以确保最近后续请求的 prompt cache 前缀保持稳定。
- 在 `user` 或 `toolResult` 历史中，较早且已处理过的图像块可能会被替换为 `[image data removed - already processed by model]`。
- 这与常规的缓存 TTL 修剪是分开的。它的存在是为了防止重复的图像负载在后续轮次中破坏 prompt cache。

## 智能默认值

OpenClaw 会为 Anthropic 配置自动启用修剪：

| 配置类型 | 已启用修剪 | Heartbeat |
| ------------------------------------------------------- | --------------- | --------- |
| Anthropic OAuth/token 认证（包括 Claude CLI 复用） | 是 | 1 小时 |
| API 密钥 | 是 | 30 分钟 |

如果你设置了显式值，OpenClaw 不会覆盖这些设置。

## 启用或禁用

对于非 Anthropic 提供商，修剪默认关闭。要启用：

```json5
{
  agents: {
    defaults: {
      contextPruning: { mode: "cache-ttl", ttl: "5m" },
    },
  },
}
```

要禁用：设置 `mode: "off"`。

## 修剪与 compaction

|            | 修剪 | Compaction |
| ---------- | ------------------ | ----------------------- |
| **内容**   | 裁剪工具结果 | 总结对话 |
| **是否保存？** | 否（按请求） | 是（保存到记录中） |
| **范围**  | 仅工具结果 | 整个对话 |

两者相辅相成——修剪可以在多次 compaction 周期之间保持工具输出精简。

## 延伸阅读

- [??](/zh-CN/concepts/compaction) —— 基于摘要的上下文压缩
- [??](/zh-CN/gateway/configuration) —— 所有修剪配置项
  （`contextPruning.*`）
