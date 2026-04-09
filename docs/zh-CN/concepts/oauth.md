---
read_when:
    - 你想端到端了解 OpenClaw OAuth
    - 你遇到了令牌失效 / 登出问题
    - 你想了解 Claude CLI 或 OAuth 身份凭证流程
    - 你想使用多个账户或配置档案路由
summary: OpenClaw 中的 OAuth：令牌交换、存储和多账户模式
title: OAuth
x-i18n:
    generated_at: "2026-04-08T04:03:48Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4117fee70e3e64fd3a762403454ac2b78de695d2b85a7146750c6de615921e02
    source_path: concepts\oauth.md
    workflow: 15
---

# OAuth

OpenClaw 支持通过 OAuth 为提供商启用“订阅身份凭证”方式，只要该提供商提供此能力
（尤其是 **OpenAI Codex（ChatGPT OAuth）**）。对于 Anthropic，目前更实际的区分是：

- **Anthropic API 密钥**：常规 Anthropic API 计费
- **Anthropic Claude CLI / OpenClaw 内的订阅身份凭证**：Anthropic 工作人员已告知我们，这种用法现在再次被允许

OpenAI Codex OAuth 已明确支持在 OpenClaw 这样的外部工具中使用。本页说明：

对于生产环境中的 Anthropic，API 密钥身份凭证仍然是更安全、推荐的路径。

- OAuth **令牌交换** 如何工作（PKCE）
- 令牌**存储**在哪里（以及原因）
- 如何处理**多个账户**（配置档案 + 按会话覆盖）

OpenClaw 还支持自带 OAuth 或 API 密钥流程的**提供商插件**。通过以下命令运行：

```bash
openclaw models auth login --provider <id>
```

## 令牌汇聚点（为什么存在）

OAuth 提供商通常会在登录/刷新流程中签发一个**新的刷新令牌**。某些提供商（或 OAuth 客户端）可能会在为同一用户/应用签发新令牌时使旧的刷新令牌失效。

实际症状：

- 你同时通过 OpenClaw _以及_ Claude Code / Codex CLI 登录 → 之后其中一个会随机被“登出”

为减少这种情况，OpenClaw 将 `auth-profiles.json` 视为一个**令牌汇聚点**：

- 运行时只从**一个位置**读取凭证
- 我们可以保留多个配置档案，并以确定性的方式路由它们
- 当从外部 CLI（如 Codex CLI）复用凭证时，OpenClaw 会带着来源信息镜像这些凭证，并重新读取该外部来源，而不是自己轮换刷新令牌

## 存储（令牌存放位置）

密钥按**每个智能体**存储：

- 身份凭证配置档案（OAuth + API 密钥 + 可选值级引用）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版兼容文件：`~/.openclaw/agents/<agentId>/agent/auth.json`
  （发现静态 `api_key` 条目时会清理掉）

仅用于旧版导入的文件（仍受支持，但不是主存储）：

- `~/.openclaw/credentials/oauth.json`（首次使用时会导入到 `auth-profiles.json`）

以上所有路径也都遵循 `$OPENCLAW_STATE_DIR`（状态目录覆盖）。完整参考：[????](/zh-CN/gateway/configuration-reference#auth-storage)

关于静态 SecretRef 和运行时快照激活行为，请参见 [Secrets 管理](/zh-CN/gateway/secrets)。

## Anthropic 旧版令牌兼容性

<Warning>
Anthropic 的公开 Claude Code 文档说明，直接使用 Claude Code 仍在 Claude 订阅限制范围内，而且 Anthropic 工作人员已告知我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许。因此，除非 Anthropic 发布新的策略，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为此集成场景下被认可的方式。

关于 Anthropic 当前直接使用 Claude Code 的套餐文档，请参见 [在你的 Pro 或 Max 套餐中使用 Claude Code](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
以及 [在你的 Team 或 Enterprise 套餐中使用 Claude Code](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)。

如果你想在 OpenClaw 中使用其他订阅式选项，请参见 [OpenAI Codex](/zh-CN/providers/openai)、[Qwen Cloud Coding Plan](/zh-CN/providers/qwen)、[MiniMax Coding Plan](/zh-CN/providers/minimax) 和 [GLM 模型](/zh-CN/providers/glm)。
</Warning>

OpenClaw 也将 Anthropic setup-token 作为受支持的基于令牌的身份凭证路径公开提供，但现在在可用时更倾向于复用 Claude CLI 和 `claude -p`。

## Anthropic Claude CLI 迁移

OpenClaw 再次支持复用 Anthropic Claude CLI。如果你在主机上已经有本地 Claude 登录，新手引导/配置可以直接复用它。

## OAuth 交换（登录如何工作）

OpenClaw 的交互式登录流程由 `@mariozechner/pi-ai` 实现，并接入到各类向导/命令中。

### Anthropic setup-token

流程形态：

1. 从 OpenClaw 启动 Anthropic setup-token 或粘贴令牌
2. OpenClaw 将生成的 Anthropic 凭证存储到一个身份凭证配置档案中
3. 模型选择保持为 `anthropic/...`
4. 现有的 Anthropic 身份凭证配置档案仍可用于回滚/顺序控制

### OpenAI Codex（ChatGPT OAuth）

OpenAI Codex OAuth 已明确支持在 Codex CLI 之外使用，包括 OpenClaw 工作流。

流程形态（PKCE）：

1. 生成 PKCE verifier/challenge 和随机 `state`
2. 打开 `https://auth.openai.com/oauth/authorize?...`
3. 尝试在 `http://127.0.0.1:1455/auth/callback` 捕获回调
4. 如果无法绑定回调（或你在远程/无头环境中），则粘贴重定向 URL/code
5. 在 `https://auth.openai.com/oauth/token` 交换令牌
6. 从访问令牌中提取 `accountId`，并存储 `{ access, refresh, expires, accountId }`

向导路径为 `openclaw onboard` → 身份凭证选项 `openai-codex`。

## 刷新 + 过期

配置档案会存储一个 `expires` 时间戳。

在运行时：

- 如果 `expires` 还在未来 → 使用已存储的访问令牌
- 如果已过期 → 在文件锁保护下刷新，并覆盖已存储的凭证
- 例外：复用的外部 CLI 凭证仍由外部管理；OpenClaw 会重新读取 CLI 身份凭证存储，而不会自己消耗复制来的刷新令牌

刷新流程是自动的；通常你不需要手动管理令牌。

## 多个账户（配置档案）+ 路由

有两种模式：

### 1）推荐：分离的智能体

如果你希望“个人”和“工作”永不互相影响，请使用隔离的智能体（独立会话 + 凭证 + 工作区）：

```bash
openclaw agents add work
openclaw agents add personal
```

然后按智能体配置身份凭证（向导），并将聊天路由到正确的智能体。

### 2）高级：单个智能体中的多个配置档案

`auth-profiles.json` 支持同一提供商下的多个配置档案 ID。

选择要使用哪个配置档案：

- 通过配置顺序全局设置（`auth.order`）
- 通过 `/model ...@<profileId>` 按会话设置

示例（会话覆盖）：

- `/model Opus@anthropic:work`

查看现有配置档案 ID 的方法：

- `openclaw channels list --json`（显示 `auth[]`）

相关文档：

- [/concepts/model-failover](/zh-CN/concepts/model-failover)（轮换 + 冷却规则）
- [????](/zh-CN/tools/slash-commands)（命令界面）

## 相关内容

- [??](/zh-CN/gateway/authentication) — 模型提供商身份凭证概览
- [Secrets 管理](/zh-CN/gateway/secrets) — 凭证存储和 SecretRef
- [????](/zh-CN/gateway/configuration-reference#auth-storage) — 身份凭证配置键名
