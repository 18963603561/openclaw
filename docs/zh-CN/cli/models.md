---
read_when:
    - 你想更改默认模型或查看提供商身份验证状态
    - 你想扫描可用模型 / 提供商并调试 auth 配置档
summary: '`openclaw models` 的 CLI 参考（status/list/set/scan、aliases、fallbacks、auth）'
title: models
x-i18n:
    generated_at: "2026-04-08T03:54:02Z"
    model: gpt-5.4
    provider: openai
    source_hash: 88a8f4549f09d4838ae9acb89f2fb665f2a630295f8d624cb563731a5e80214f
    source_path: cli\models.md
    workflow: 15
---

# `openclaw models`

模型发现、扫描和配置（默认模型、fallbacks、auth 配置档）。

相关内容：

- 提供商 + 模型：[模型](/zh-CN/providers/models)
- 提供商身份验证设置：[入门指南](/zh-CN/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 会显示解析后的默认值 / fallbacks 以及 auth 概览。
当提供商使用情况快照可用时，OAuth / API key 状态部分会包含
提供商使用窗口和配额快照。
当前支持 usage-window 的提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。使用情况身份验证在可用时来自提供商特定的 hooks；
否则，OpenClaw 会回退为从 auth 配置档、环境变量或配置中匹配 OAuth / API-key
凭证。
在 `--json` 输出中，`auth.providers` 是具备环境变量 / 配置 / 存储感知能力的提供商
概览，而 `auth.oauth` 仅表示 auth-store 配置档健康状态。
添加 `--probe` 可对每个已配置提供商配置档运行实时身份验证探测。
探测会发起真实请求（可能消耗 token 并触发速率限制）。
使用 `--agent <id>` 可检查某个已配置智能体的模型 / auth 状态。若省略，
命令会在已设置时使用 `OPENCLAW_AGENT_DIR` / `PI_CODING_AGENT_DIR`，否则使用
已配置的默认智能体。
探测行可能来自 auth 配置档、环境变量凭证或 `models.json`。

说明：

- `models set <model-or-alias>` 接受 `provider/model` 或 alias。
- 模型引用通过按**第一个** `/` 进行拆分来解析。如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果你省略提供商，OpenClaw 会先将输入解析为 alias，然后
  解析为某个已配置提供商下该精确模型 id 的唯一匹配，最后才会
  回退到已配置的默认提供商，并显示一条弃用警告。
  如果该提供商不再暴露已配置的默认模型，OpenClaw
  会回退到第一个已配置的提供商 / 模型，而不是继续暴露一个
  来自已删除提供商的陈旧默认值。
- `models status` 可能会在 auth 输出中显示 `marker(<value>)`，用于表示非 secret 占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将它们掩码为 secrets。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出码 1=已过期 / 缺失，2=即将过期）
- `--probe`（对已配置 auth 配置档执行实时探测）
- `--probe-provider <name>`（探测单个提供商）
- `--probe-profile <id>`（可重复或使用逗号分隔的 profile id）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的智能体 id；会覆盖 `OPENCLAW_AGENT_DIR` / `PI_CODING_AGENT_DIR`）

探测状态分桶：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期会看到的探测详情 / reason-code 情况：

- `excluded_by_auth_order`：存在一个已存储配置档，但显式的
  `auth.order.<provider>` 将其省略，因此探测会报告该排除情况，而不是
  尝试使用它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：
  配置档存在，但不可用 / 不可解析。
- `no_model`：提供商 auth 存在，但 OpenClaw 无法为该提供商解析出一个可用于探测的
  模型候选。

## Aliases + fallbacks

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Auth 配置档

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式 auth 辅助工具。它可以启动提供商 auth
流程（OAuth / API key），或根据你选择的提供商，引导你手动粘贴 token。

`models auth login` 会运行提供商插件的 auth 流程（OAuth / API key）。使用
`openclaw plugins list` 查看已安装了哪些提供商。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

说明：

- `setup-token` 和 `paste-token` 仍然是通用 token 命令，适用于提供 token auth 方法的提供商。
- `setup-token` 需要交互式 TTY，并运行该提供商的 token-auth
  方法（当该提供商公开了 `setup-token` 方法时，默认会使用它）。
- `paste-token` 接受在其他地方生成或通过自动化获得的 token 字符串。
- `paste-token` 需要 `--provider`，会提示输入 token 值，并将其
  写入默认配置档 id `<provider>:manual`，除非你传入
  `--profile-id`。
- `paste-token --expires-in <duration>` 会根据相对时长（例如 `365d` 或 `12h`）
  存储一个绝对 token 过期时间。
- Anthropic 说明：Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许，因此除非 Anthropic 发布新政策，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为此集成的已批准方式。
- Anthropic 的 `setup-token` / `paste-token` 仍然作为受支持的 OpenClaw token 路径可用，但 OpenClaw 现在在可用时更倾向于使用 Claude CLI 复用和 `claude -p`。
