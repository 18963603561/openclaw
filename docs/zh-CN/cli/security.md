---
read_when:
    - 你想对配置 / 状态运行一次快速安全审计
    - 你想应用安全的 “fix” 建议（权限、收紧默认值）
summary: '`openclaw security` 的 CLI 参考（审计并修复常见安全陷阱）'
title: security
x-i18n:
    generated_at: "2026-04-08T03:56:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: e5a3e4ab8e0dfb6c10763097cb4483be2431985f16de877523eb53e2122239ae
    source_path: cli\security.md
    workflow: 15
---

# `openclaw security`

安全工具（审计 + 可选修复）。

相关内容：

- 安全指南：[安全](/gateway/security)

## 审计

```bash
openclaw security audit
openclaw security audit --deep
openclaw security audit --deep --password <password>
openclaw security audit --deep --token <token>
openclaw security audit --fix
openclaw security audit --json
```

当多个私信发送者共享主会话时，审计会发出警告，并推荐使用**安全私信模式**：`session.dmScope="per-channel-peer"`（对于多账户渠道则使用 `per-account-channel-peer`），以保护共享收件箱。
这适用于协作式 / 共享收件箱加固。默认情况下，OpenClaw 采用的是个人助理信任模型，不推荐在由彼此不信任 / 对抗性操作员共同使用的单个 Gateway 网关上运行；应通过独立的 Gateway 网关（或独立的操作系统用户 / 主机）划分信任边界。
当配置显示出可能存在共享用户入口时（例如开放的私信 / 群组策略、已配置的群组目标或通配符发送者规则），它还会发出 `security.trust_model.multi_user_heuristic`，并提醒你 OpenClaw 默认是个人助理信任模型。
对于有意的共享用户设置，审计给出的指导是：为所有会话启用沙箱隔离，将文件系统访问限制在工作区范围内，并避免在该运行时上放置个人 / 私密身份或凭证。
当小模型（`<=300B`）在未启用沙箱隔离且启用了 Web / 浏览器工具的情况下使用时，它也会发出警告。
对于 webhook 入口，它会在以下情况下发出警告：`hooks.token` 复用了 Gateway 网关 token、`hooks.token` 过短、`hooks.path="/"`、`hooks.defaultSessionKey` 未设置、`hooks.allowedAgentIds` 未受限制、启用了请求 `sessionKey` 覆盖，以及在启用覆盖但未设置 `hooks.allowedSessionKeyPrefixes` 时。
当沙箱 Docker 设置已配置但沙箱模式已关闭时，它也会发出警告；当 `gateway.nodes.denyCommands` 使用了无效的模式样式 / 未知条目时也会发出警告（这里只支持精确的节点命令名匹配，而不是 shell 文本过滤）；当 `gateway.nodes.allowCommands` 显式启用了危险的节点命令时也会发出警告；当全局 `tools.profile="minimal"` 被智能体工具配置覆盖时也会发出警告；当开放群组在没有沙箱 / 工作区防护的情况下暴露运行时 / 文件系统工具时也会发出警告；当在宽松工具策略下可能可以访问已安装的扩展插件工具时也会发出警告。
它还会标记 `gateway.allowRealIpFallback=true`（如果代理配置错误，存在请求头伪造风险）以及 `discovery.mdns.mode="full"`（通过 mDNS TXT 记录泄露元数据）。
当沙箱浏览器使用 Docker `bridge` 网络却未设置 `sandbox.browser.cdpSourceRange` 时，它也会发出警告。
它还会标记危险的沙箱 Docker 网络模式（包括 `host` 和 `container:*` 命名空间加入）。
它还会在现有沙箱浏览器 Docker 容器缺少 / 过期哈希标签时发出警告（例如迁移前容器缺少 `openclaw.browserConfigEpoch`），并建议运行 `openclaw sandbox recreate --browser --all`。
当基于 npm 的插件 / hook 安装记录未固定版本、缺少完整性元数据，或与当前已安装的软件包版本发生漂移时，它也会发出警告。
当渠道 allowlists 依赖可变的名称 / 邮箱 / 标签，而不是稳定 ID 时，它也会发出警告（适用于 Discord、Slack、Google Chat、Microsoft Teams、Mattermost、IRC 及适用范围）。
当 `gateway.auth.mode="none"` 使 Gateway 网关 HTTP API 在没有共享 secret 的情况下可达时，它也会发出警告（包括 `/tools/invoke` 以及任何已启用的 `/v1/*` 端点）。
以 `dangerous` / `dangerously` 为前缀的设置属于显式的紧急兜底操作员覆盖；仅仅启用其中某一个，并不自动构成安全漏洞报告。
完整的危险参数清单，请参阅[安全](/gateway/security)中的 “Insecure or dangerous flags summary” 部分。

SecretRef 行为：

- `security audit` 会以只读模式解析其目标路径中受支持的 SecretRefs。
- 如果某个 SecretRef 在当前命令路径中不可用，审计会继续执行，并报告 `secretDiagnostics`（而不是崩溃）。
- `--token` 和 `--password` 仅覆盖该次命令调用中的深度探测身份验证；它们不会重写配置或 SecretRef 映射。

## JSON 输出

在 CI / 策略检查中使用 `--json`：

```bash
openclaw security audit --json | jq '.summary'
openclaw security audit --deep --json | jq '.findings[] | select(.severity=="critical") | .checkId'
```

如果组合使用 `--fix` 和 `--json`，输出会同时包含修复操作和最终报告：

```bash
openclaw security audit --fix --json | jq '{fix: .fix.ok, summary: .report.summary}'
```

## `--fix` 会修改什么

`--fix` 会应用安全且确定性的修复措施：

- 将常见的 `groupPolicy="open"` 切换为 `groupPolicy="allowlist"`（包括受支持渠道中的账户变体）
- 当 WhatsApp 群组策略切换到 `allowlist` 时，如果存在已存储的 `allowFrom` 文件，且配置中尚未定义 `allowFrom`，则会从该文件为 `groupAllowFrom` 设定初始值
- 将 `logging.redactSensitive` 从 `"off"` 设置为 `"tools"`
- 收紧状态 / 配置及常见敏感文件的权限
  （`credentials/*.json`、`auth-profiles.json`、`sessions.json`、会话
  `*.jsonl`）
- 同时收紧 `openclaw.json` 中引用的配置 include 文件
- 在 POSIX 主机上使用 `chmod`，在 Windows 上使用 `icacls` 重置权限

`--fix` **不会**：

- 轮换 token / 密码 / API keys
- 禁用工具（`gateway`、`cron`、`exec` 等）
- 更改 Gateway 网关绑定 / 身份验证 / 网络暴露选项
- 删除或重写插件 / Skills
