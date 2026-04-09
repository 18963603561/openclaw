---
read_when:
    - 运行无头节点主机
    - 为非 macOS 节点配对以支持 `system.run`
summary: '`openclaw node` 的 CLI 参考（无头节点主机）'
title: node
x-i18n:
    generated_at: "2026-04-08T03:54:30Z"
    model: gpt-5.4
    provider: openai
    source_hash: 6123b33ec46f2b85f2c815947435ac91bbe84456165ff0e504453356da55b46d
    source_path: cli\node.md
    workflow: 15
---

# `openclaw node`

运行一个**无头节点主机**，它会连接到 Gateway 网关 WebSocket，并在此机器上暴露
`system.run` / `system.which`。

## 为什么使用节点主机？

当你希望智能体能够**在你网络中的其他机器上运行命令**，而又不想在那里安装完整的 macOS 配套应用时，请使用节点主机。

常见使用场景：

- 在远程 Linux/Windows 主机上运行命令（构建服务器、实验室机器、NAS）。
- 在 Gateway 网关 上保持 exec **沙箱隔离**，但将已批准的运行委派给其他主机。
- 为自动化或 CI 节点提供一个轻量级、无头的执行目标。

执行仍然受**exec 审批**和节点主机上的按智能体 allowlist 保护，因此你可以让命令访问保持在受限且明确的范围内。

## 浏览器代理（零配置）

如果节点上的 `browser.enabled` 未被禁用，节点主机会自动广播一个浏览器代理。这让智能体无需额外配置就能在该节点上使用浏览器自动化。

默认情况下，该代理会暴露节点的常规浏览器配置文件接口。如果你
设置了 `nodeHost.browserProxy.allowProfiles`，该代理就会变为限制模式：
对未列入 allowlist 的配置文件目标会被拒绝，而通过代理进行的持久化配置文件
创建/删除路由也会被阻止。

如有需要，可在节点上禁用它：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## 运行（前台）

```bash
openclaw node run --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway 网关 WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway 网关 WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（会清除 pairing token）
- `--display-name <name>`：覆盖节点显示名称

## 节点主机的 Gateway 网关 认证

`openclaw node run` 和 `openclaw node install` 会从配置/环境变量解析 gateway 认证（节点命令不提供 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`。
- 然后回退到本地配置：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机有意不会继承 `gateway.remote.token` / `gateway.remote.password`。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但无法解析，节点认证解析会以失败关闭方式结束（不会用远程回退掩盖问题）。
- 在 `gateway.mode=remote` 下，远程客户端字段（`gateway.remote.token` / `gateway.remote.password`）也会按照远程优先级规则成为候选。
- 节点主机认证解析只会使用 `OPENCLAW_GATEWAY_*` 环境变量。

## 服务（后台）

将无头节点主机安装为用户服务。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway 网关 WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway 网关 WebSocket 端口（默认：`18789`）
- `--tls`：对 gateway 连接使用 TLS
- `--tls-fingerprint <sha256>`：预期的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖节点 id（会清除 pairing token）
- `--display-name <name>`：覆盖节点显示名称
- `--runtime <runtime>`：服务运行时（`node` 或 `bun`）
- `--force`：如果已安装，则重新安装/覆盖

管理该服务：

```bash
openclaw node status
openclaw node stop
openclaw node restart
openclaw node uninstall
```

如需前台运行节点主机（非服务方式），请使用 `openclaw node run`。

服务命令支持 `--json`，用于机器可读输出。

## Pairing

第一次连接会在 Gateway 网关 上创建一个待处理的设备 pairing 请求（`role: node`）。
通过以下命令批准：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果节点在认证详情（role/scopes/public key）变更后重试 pairing，
之前的待处理请求会被新的请求取代，并生成新的 `requestId`。
批准前请再次运行 `openclaw devices list`。

节点主机会将其节点 id、token、显示名称和 gateway 连接信息存储在
`~/.openclaw/node.json` 中。

## Exec 审批

`system.run` 受本地 exec 审批控制：

- `~/.openclaw/exec-approvals.json`
- [Exec approvals](/tools/exec-approvals)
- `openclaw approvals --node <id|name|ip>`（从 Gateway 网关 侧编辑）

对于已批准的异步节点 exec，OpenClaw 会在提示前准备一个规范化的 `systemRunPlan`。
后续获批的 `system.run` 转发会复用这个已存储的
plan，因此在审批请求创建之后再修改 command/cwd/session 字段会被拒绝，而不会改变节点实际执行的内容。
