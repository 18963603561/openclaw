---
read_when:
    - 将 macOS 应用与 Gateway 网关生命周期集成
summary: macOS 上的 Gateway 网关生命周期（launchd）
title: Gateway 网关生命周期
x-i18n:
    generated_at: "2026-04-08T06:14:40Z"
    model: gpt-5.4
    provider: openai
    source_hash: 73e7eb64ef432c3bfc81b949a5cc2a344c64f2310b794228609aae1da817ec41
    source_path: platforms\mac\child-process.md
    workflow: 15
---

# macOS 上的 Gateway 网关生命周期

macOS 应用默认**通过 launchd 管理 Gateway 网关**，不会将
Gateway 网关作为子进程启动。它会先尝试附加到已在配置端口上运行的
Gateway 网关；如果没有可达实例，则会通过外部 `openclaw` CLI 启用 launchd
服务（无内置运行时）。这样可以提供可靠的登录自动启动，以及崩溃后的自动重启。

子进程模式（由应用直接启动 Gateway 网关）当前**未在使用**。
如果你需要与 UI 更紧密的耦合，请在终端中手动运行 Gateway 网关。

## 默认行为（launchd）

- 应用会安装一个按用户划分的 LaunchAgent，标签为 `ai.openclaw.gateway`
  （或者在使用 `--profile`/`OPENCLAW_PROFILE` 时为 `ai.openclaw.<profile>`；也支持旧版 `com.openclaw.*`）。
- 启用本地模式后，应用会确保 LaunchAgent 已加载，并在需要时
  启动 Gateway 网关。
- 日志会写入 launchd 的 Gateway 网关日志路径（可在调试设置中查看）。

常用命令：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

运行具名 profile 时，请将标签替换为 `ai.openclaw.<profile>`。

## 未签名的开发构建

当你没有签名密钥时，`scripts/restart-mac.sh --no-sign` 用于快速本地构建。为防止 launchd 指向未签名的 relay 二进制文件，它会：

- 写入 `~/.openclaw/disable-launchagent`。

已签名运行的 `scripts/restart-mac.sh` 会在该标记存在时清除此覆盖。手动重置方式：

```bash
rm ~/.openclaw/disable-launchagent
```

## 仅附加模式

如果你希望强制让 macOS 应用**永远不安装或管理 launchd**，请使用
`--attach-only`（或 `--no-launchd`）启动应用。这会设置
`~/.openclaw/disable-launchagent`，从而让应用只附加到已经运行的
Gateway 网关。你也可以在调试设置中切换相同行为。

## 远程模式

远程模式永远不会启动本地 Gateway 网关。应用会使用到远程主机的
SSH 隧道，并通过该隧道建立连接。

## 我们为什么更偏好 launchd

- 登录时自动启动。
- 内置重启/KeepAlive 语义。
- 可预测的日志和监管行为。

如果将来确实再次需要真正的子进程模式，它应当被记录为一个
单独且明确的仅开发模式。
