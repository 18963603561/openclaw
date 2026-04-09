---
read_when:
    - 你想添加/移除渠道账户（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage/Matrix）
    - 你想检查渠道状态或查看渠道日志尾部
summary: '`openclaw channels` 的 CLI 参考（账户、状态、登录/登出、日志）'
title: channels
x-i18n:
    generated_at: "2026-04-08T03:50:56Z"
    model: gpt-5.4
    provider: openai
    source_hash: d0f558fdb5f6ec54e7fdb7a88e5c24c9d2567174341bd3ea87848bce4cba5d29
    source_path: cli\channels.md
    workflow: 15
---

# `openclaw channels`

管理 Gateway 网关上的聊天渠道账户及其运行时状态。

相关文档：

- 渠道指南： [??](/zh-CN/channels/index)
- Gateway 网关配置： [??](/zh-CN/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Status / capabilities / resolve / logs

- `channels status`：`--probe`、`--timeout <ms>`、`--json`
- `channels capabilities`：`--channel <name>`、`--account <id>`（仅可与 `--channel` 一起使用）、`--target <dest>`、`--timeout <ms>`、`--json`
- `channels resolve`：`<entries...>`、`--channel <name>`、`--account <id>`、`--kind <auto|user|group>`、`--json`
- `channels logs`：`--channel <name|all>`、`--lines <n>`、`--json`

`channels status --probe` 是实时路径：当 Gateway 网关可达时，它会对每个账户运行
`probeAccount` 以及可选的 `auditAccount` 检查，因此输出可能包含传输状态以及诸如
`works`、`probe failed`、`audit ok` 或 `audit failed` 之类的探测结果。
如果 Gateway 网关不可达，`channels status` 会回退为仅基于配置的摘要，
而不是实时探测输出。

## 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 会显示按渠道划分的参数（token、私钥、app token、signal-cli 路径等）。

常见的非交互式添加入口包括：

- bot-token 渠道：`--token`、`--bot-token`、`--app-token`、`--token-file`
- Signal/iMessage 传输字段：`--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`、`--db-path`、`--service`、`--region`
- Google Chat 字段：`--webhook-path`、`--webhook-url`、`--audience-type`、`--audience`
- Matrix 字段：`--homeserver`、`--user-id`、`--access-token`、`--password`、`--device-name`、`--initial-sync-limit`
- Nostr 字段：`--private-key`、`--relay-urls`
- Tlon 字段：`--ship`、`--url`、`--code`、`--group-channels`、`--dm-allowlist`、`--auto-discover-channels`
- 在支持时，使用 `--use-env` 为默认账户启用基于环境变量的认证

当你在不带参数的情况下运行 `openclaw channels add` 时，交互式向导可能会提示：

- 为所选渠道输入账户 ID
- 为这些账户输入可选显示名称
- `Bind configured channel accounts to agents now?`

如果你确认立即绑定，向导会询问哪个智能体应拥有每个已配置的渠道账户，并写入按账户划分的路由绑定。

你也可以稍后通过 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 来管理相同的路由规则（参见 [agents](/zh-CN/cli/agents)）。

当你向某个仍在使用单账户顶层设置的渠道添加一个非默认账户时，OpenClaw 会先将按账户划分的顶层值提升到该渠道的账户映射中，然后再写入新账户。大多数渠道会将这些值写入 `channels.<channel>.accounts.default`，但内置渠道也可能保留现有的匹配提升账户。Matrix 是当前的一个例子：如果已经存在一个命名账户，或者 `defaultAccount` 指向一个现有命名账户，则提升过程会保留该账户，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅渠道绑定（无 `accountId`）仍会匹配默认账户。
- 在非交互模式下，`channels add` 不会自动创建或重写绑定。
- 交互式设置可以选择性地添加按账户划分的绑定。

如果你的配置已经处于混合状态（已存在命名账户，但顶层单账户值仍然存在），请运行 `openclaw doctor --fix`，将按账户划分的值移动到该渠道所选择的提升账户中。大多数渠道会提升到 `accounts.default`；Matrix 则可以保留现有的命名/default 目标。

## 登录 / 登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

说明：

- `channels login` 支持 `--verbose`。
- 当只配置了一个受支持的登录目标时，`channels login` / `logout` 可以自动推断渠道。

## 故障排除

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 获取引导式修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 用量快照需要 `user:profile` 作用域。可使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude CLI 重新认证。
- 当 Gateway 网关不可达时，`openclaw channels status` 会回退为仅基于配置的摘要。如果某个受支持的渠道凭证通过 SecretRef 配置，但在当前命令路径中不可用，它会将该账户报告为“已配置但状态降级”，而不是显示为未配置。

## 能力探测

获取提供商能力提示（在可用时包括 intents/scopes）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选项；省略时会列出所有渠道（包括扩展）。
- `--account` 仅在配合 `--channel` 时有效。
- `--target` 接受 `channel:<id>` 或原始数字 channel id，且仅适用于 Discord。
- 探测是提供商特定的：Discord intents + 可选渠道权限；Slack bot + user scopes；Telegram bot 标志 + webhook；Signal 守护进程版本；Microsoft Teams app token + Graph roles/scopes（在已知时会加注释）。没有探测功能的渠道会报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 可强制目标类型。
- 当多个条目共享相同名称时，解析会优先选择活动匹配项。
- `channels resolve` 是只读操作。如果所选账户通过 SecretRef 配置，但该凭证在当前命令路径中不可用，该命令会返回带说明的降级未解析结果，而不是中止整个运行。
