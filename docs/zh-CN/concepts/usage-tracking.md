---
read_when:
    - 你正在接入提供商用量/配额界面
    - 你需要解释用量跟踪行为或身份凭证要求
summary: 用量跟踪界面和凭证要求
title: 用量跟踪
x-i18n:
    generated_at: "2026-04-08T04:06:44Z"
    model: gpt-5.4
    provider: openai
    source_hash: 62164492c61a8d602e3b73879c13ce3e14ce35964b7f2ffd389a4e6a7ec7e9c0
    source_path: concepts\usage-tracking.md
    workflow: 15
---

# 用量跟踪

## 它是什么

- 直接从提供商的用量端点拉取提供商用量/配额。
- 不估算成本；只使用提供商报告的时间窗口。
- 面向人的状态输出会统一规范化为 `X% left`，即使上游 API 报告的是已用配额、剩余配额，或仅有原始计数。
- 会话级 `/status` 和 `session_status` 在实时会话快照信息稀疏时，可以回退到最新的转录用量条目。该回退会补全缺失的 token/缓存计数器，能够恢复当前活动运行时模型标签，并且当会话元数据缺失或更小时，会优先采用更大的面向提示词的总量。已有的非零实时值仍然优先。

## 它显示在哪里

- 聊天中的 `/status`：带丰富 emoji 的状态卡片，显示会话 token + 预估成本（仅 API 密钥）。当可用时，会显示**当前模型提供商**的提供商用量，并规范化为 `X% left` 时间窗口。
- 聊天中的 `/usage off|tokens|full`：每次回复的用量页脚（OAuth 仅显示 token）。
- 聊天中的 `/usage cost`：基于 OpenClaw 会话日志聚合得到的本地成本汇总。
- CLI：`openclaw status --usage` 会打印完整的按提供商划分的明细。
- CLI：`openclaw channels list` 会在提供商配置旁打印同样的用量快照（使用 `--no-usage` 可跳过）。
- macOS 菜单栏：Context 下的 “Usage” 部分（仅在可用时显示）。

## 提供商 + 凭证

- **Anthropic（Claude）**：存储在身份凭证配置档案中的 OAuth 令牌。
- **GitHub Copilot**：存储在身份凭证配置档案中的 OAuth 令牌。
- **Gemini CLI**：存储在身份凭证配置档案中的 OAuth 令牌。
  - JSON 用量会回退到 `stats`；`stats.cached` 会被规范化为 `cacheRead`。
- **OpenAI Codex**：存储在身份凭证配置档案中的 OAuth 令牌（存在时会使用 accountId）。
- **MiniMax**：API 密钥或 MiniMax OAuth 身份凭证配置档案。OpenClaw 会将 `minimax`、`minimax-cn` 和 `minimax-portal` 视为同一个 MiniMax 配额界面，优先使用已存储的 MiniMax OAuth；如果不存在，则回退到 `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`。
  MiniMax 原始的 `usage_percent` / `usagePercent` 字段表示的是**剩余**配额，因此 OpenClaw 会在显示前将其反转；如果存在基于计数的字段，则优先使用计数字段。
  - 编码套餐的时间窗口标签会优先来自提供商返回的小时/分钟字段；如果不存在，再回退到 `start_time` / `end_time` 时间跨度。
  - 如果编码套餐端点返回 `model_remains`，OpenClaw 会优先选择聊天模型条目，在缺少显式 `window_hours` / `window_minutes` 字段时根据时间戳推导窗口标签，并在套餐标签中包含模型名称。
- **Xiaomi MiMo**：通过环境变量/配置/身份凭证存储提供 API 密钥（`XIAOMI_API_KEY`）。
- **z.ai**：通过环境变量/配置/身份凭证存储提供 API 密钥。

当无法解析出可用的提供商用量身份凭证时，用量会被隐藏。提供商可以提供插件特定的用量身份凭证逻辑；否则，OpenClaw 会回退到从身份凭证配置档案、环境变量或配置中匹配 OAuth/API 密钥凭证。
