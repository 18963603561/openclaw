---
read_when:
    - 你想快速将移动节点应用与 Gateway 网关配对
    - 你需要用于远程/手动分享的设置码输出
summary: '`openclaw qr` 的 CLI 参考（生成移动端配对二维码 + 设置码）'
title: qr
x-i18n:
    generated_at: "2026-04-08T03:55:04Z"
    model: gpt-5.4
    provider: openai
    source_hash: ee6469334ad09037318f938c7ac609b7d5e3385c0988562501bb02a1bfa411ff
    source_path: cli\qr.md
    workflow: 15
---

# `openclaw qr`

根据你当前的 Gateway 网关配置生成一个移动端配对二维码和设置码。

## 用法

```bash
openclaw qr
openclaw qr --setup-code-only
openclaw qr --json
openclaw qr --remote
openclaw qr --url wss://gateway.example/ws
```

## 选项

- `--remote`：优先使用 `gateway.remote.url`；如果未设置，`gateway.tailscale.mode=serve|funnel` 仍可提供远程公开 URL
- `--url <url>`：覆盖负载中使用的 gateway URL
- `--public-url <url>`：覆盖负载中使用的公开 URL
- `--token <token>`：覆盖引导流程用于认证的 gateway token
- `--password <password>`：覆盖引导流程用于认证的 gateway 密码
- `--setup-code-only`：仅输出设置码
- `--no-ascii`：跳过 ASCII 二维码渲染
- `--json`：输出 JSON（`setupCode`、`gatewayUrl`、`auth`、`urlSource`）

## 说明

- `--token` 和 `--password` 互斥。
- 现在设置码本身携带的是一个短期有效的、不可透明解析的 `bootstrapToken`，而不是共享的 gateway token/password。
- 在内置的 node/operator 引导流程中，主 node token 仍会以 `scopes: []` 形式下发。
- 如果引导交接还发放了一个 operator token，它仍然受限于引导 allowlist：`operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`。
- 引导作用域检查按角色前缀进行。该 operator allowlist 仅满足 operator 请求；非 operator 角色仍然需要在其自身角色前缀下申请作用域。
- 对于 Tailscale/公网 `ws://` gateway URL，移动端配对会以关闭失败方式拒绝。私有局域网 `ws://` 仍受支持，但 Tailscale/公网移动端路由应使用 Tailscale Serve/Funnel 或 `wss://` gateway URL。
- 使用 `--remote` 时，OpenClaw 要求必须配置 `gateway.remote.url` 或 `gateway.tailscale.mode=serve|funnel`。
- 使用 `--remote` 时，如果有效生效的远程凭证被配置为 SecretRef，且你未传入 `--token` 或 `--password`，该命令会从活动 gateway 快照中解析它们。如果 gateway 不可用，命令会快速失败。
- 不使用 `--remote` 时，如果未传入 CLI 认证覆盖项，则会解析本地 gateway 认证 SecretRef：
  - 当 token 认证可能胜出时（显式 `gateway.auth.mode="token"`，或在无 password 来源胜出的推断模式下），解析 `gateway.auth.token`。
  - 当 password 认证可能胜出时（显式 `gateway.auth.mode="password"`，或在 auth/env 中没有胜出 token 的推断模式下），解析 `gateway.auth.password`。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRef），且 `gateway.auth.mode` 未设置，则在显式设置 mode 之前，设置码解析会失败。
- Gateway 网关版本偏差说明：此命令路径要求 gateway 支持 `secrets.resolve`；较旧的 gateway 会返回 unknown-method 错误。
- 扫描后，请通过以下命令批准设备配对：
  - `openclaw devices list`
  - `openclaw devices approve <requestId>`
