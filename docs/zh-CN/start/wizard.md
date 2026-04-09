---
read_when:
    - 运行或配置 CLI 新手引导
    - 设置一台新机器
sidebarTitle: 'Onboarding: CLI'
summary: CLI 新手引导：用于设置 Gateway 网关、工作区、渠道和 Skills 的引导式流程
title: 新手引导（CLI）
x-i18n:
    generated_at: "2026-04-08T07:14:57Z"
    model: gpt-5.4
    provider: openai
    source_hash: 6773b07afa8babf1b5ac94d857063d08094a962ee21ec96ca966e99ad57d107d
    source_path: start\wizard.md
    workflow: 15
---

# 新手引导（CLI）

CLI 新手引导是 macOS、
Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它会通过一个引导式流程，一次性配置本地 Gateway 网关或远程 Gateway 网关连接，以及渠道、Skills
和工作区默认值。

```bash
openclaw onboard
```

<Info>
最快开始第一次聊天的方式：打开 Control UI（无需设置渠道）。运行
`openclaw dashboard` 并在浏览器中聊天。文档： [仪表板](/zh-CN/web/dashboard)。
</Info>

如果你之后要重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。
</Note>

<Tip>
CLI 新手引导包含一个 Web 搜索步骤，你可以在其中选择提供商，
例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、
Ollama Web 搜索、Perplexity、SearXNG 或 Tavily。部分提供商需要
API key，而其他则无需密钥。你也可以稍后通过
`openclaw configure --section web` 进行配置。文档： [Web ??](/zh-CN/tools/web)。
</Tip>

## 快速开始 与 高级模式

新手引导从 **快速开始**（默认值）与 **高级模式**（完全控制）开始。

<Tabs>
  <Tab title="快速开始（默认值）">
    - 本地 Gateway 网关（loopback）
    - 工作区默认值（或现有工作区）
    - Gateway 网关端口 **18789**
    - Gateway 网关认证 **Token**（自动生成，即使在 loopback 上也是如此）
    - 新本地设置的默认工具策略：`tools.profile: "coding"`（现有显式 profile 会被保留）
    - 私信隔离默认值：当未设置时，本地新手引导会写入 `session.dmScope: "per-channel-peer"`。详情请参阅：[CLI 设置参考](/zh-CN/start/wizard-cli-reference#outputs-and-internals)
    - Tailscale 暴露 **关闭**
    - Telegram + WhatsApp 私信默认使用 **allowlist**（系统会提示你输入电话号码）
  </Tab>
  <Tab title="高级模式（完全控制）">
    - 暴露所有步骤（模式、工作区、Gateway 网关、渠道、守护进程、Skills）。
  </Tab>
</Tabs>

## 新手引导会配置什么

**本地模式（默认）**会带你完成以下步骤：

1. **模型 / 认证** —— 选择任意受支持的提供商 / 认证流程（API key、OAuth，或提供商专属手动认证），包括 Custom Provider
   （OpenAI 兼容、Anthropic 兼容，或 Unknown 自动检测）。选择一个默认模型。
   安全说明：如果该智能体将运行工具或处理 webhook / hooks 内容，请优先选择最新一代中最强的模型，并保持严格的工具策略。较弱 / 较旧的模型层级更容易受到提示词注入攻击。
   对于非交互式运行，`--secret-input-mode ref` 会在 auth profile 中存储由环境变量支持的引用，而不是明文 API key 值。
   在非交互式 `ref` 模式下，必须设置提供商环境变量；如果传入内联 key flag 但未设置该环境变量，会快速失败。
   在交互式运行中，选择 secret 引用模式后，你可以指向环境变量或已配置的提供商引用（`file` 或 `exec`），并在保存前执行快速预检验证。
   对于 Anthropic，交互式新手引导 / 配置会提供 **Anthropic Claude CLI** 作为首选本地路径，并提供 **Anthropic API key** 作为推荐的生产路径。Anthropic setup-token 也仍然是一个受支持的 token 认证路径。
2. **工作区** —— 智能体文件的位置（默认 `~/.openclaw/workspace`）。会初始化 bootstrap 文件。
3. **Gateway 网关** —— 端口、绑定地址、认证模式、Tailscale 暴露。
   在交互式 token 模式下，你可以选择默认明文 token 存储，或选择 SecretRef。
   非交互式 token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **渠道** —— 内置和内置插件形式的聊天渠道，例如 BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等。
5. **守护进程** —— 安装 LaunchAgent（macOS）、systemd user unit（Linux / WSL2），或原生 Windows Scheduled Task，并带有按用户的 Startup-folder 回退方案。
   如果 token 认证需要 token，而 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将已解析的 token 持久化到 supervisor 服务环境元数据中。
   如果 token 认证需要 token，而配置的 token SecretRef 无法解析，守护进程安装会被阻止，并给出可执行的指导。
   如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，但 `gateway.auth.mode` 未设置，则在显式设置 mode 之前，守护进程安装会被阻止。
6. **健康检查** —— 启动 Gateway 网关并验证它正在运行。
7. **Skills** —— 安装推荐 Skills 和可选依赖。

<Note>
重新运行新手引导**不会**清除任何内容，除非你显式选择 **Reset**（或传入 `--reset`）。
CLI `--reset` 默认会重置配置、凭证和会话；使用 `--reset-scope full` 可额外包含工作区。
如果配置无效或包含旧版键名，新手引导会要求你先运行 `openclaw doctor`。
</Note>

**远程模式**只会配置本地客户端去连接位于其他地方的 Gateway 网关。
它**不会**在远程主机上安装或修改任何内容。

## 添加另一个智能体

使用 `openclaw agents add <name>` 创建一个独立智能体，拥有自己的工作区、
会话和 auth profile。不带 `--workspace` 运行时，会启动新手引导。

它会设置：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

说明：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 可用于路由入站消息（新手引导可以完成这一步）。
- 非交互式 flag：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

关于详细的逐步拆解和配置输出，请参阅
[CLI 设置参考](/zh-CN/start/wizard-cli-reference)。
关于非交互式示例，请参阅 [CLI 自动化](/zh-CN/start/wizard-cli-automation)。
关于更深入的技术参考（包括 RPC 细节），请参阅
[新手引导参考](/zh-CN/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/zh-CN/cli/onboard)
- 新手引导概览： [新手引导概览](/zh-CN/start/onboarding-overview)
- macOS 应用新手引导： [新手引导](/zh-CN/start/onboarding)
- 智能体首次运行仪式： [智能体引导](/zh-CN/start/bootstrapping)
