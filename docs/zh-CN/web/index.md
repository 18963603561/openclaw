---
read_when:
    - 你想通过 Tailscale 访问 Gateway 网关
    - 你想使用浏览器 Control UI 和配置编辑
summary: Gateway 网关 Web 界面：Control UI、绑定模式与安全性
title: Web
x-i18n:
    generated_at: "2026-04-09T01:04:18Z"
    model: gpt-5.4
    provider: openai
    source_hash: 15f5643283f7d37235d3d8104897f38db27ac5a9fdef6165156fb542d0e7048c
    source_path: web\index.md
    workflow: 15
---

# Web（Gateway 网关）

Gateway 网关会在与 Gateway WebSocket 相同的端口上提供一个小型的**浏览器 Control UI**（Vite + Lit）：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

具体功能参见 [Control UI](/web/control-ui)。
本页重点介绍绑定模式、安全性和面向 Web 的界面。

## Webhooks

当 `hooks.enabled=true` 时，Gateway 网关还会在同一个 HTTP 服务器上暴露一个小型 webhook 端点。
有关认证和载荷，请参见 [Gateway 配置](/zh-CN/gateway/configuration) → `hooks`。

## 配置（默认启用）

当资源文件存在（`dist/control-ui`）时，Control UI **默认启用**。
你可以通过配置控制它：

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Tailscale 访问

### 集成 Serve（推荐）

将 Gateway 网关保持在 loopback 上，并让 Tailscale Serve 为其代理：

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

然后启动 gateway：

```bash
openclaw gateway
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

### Tailnet 绑定 + token

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

然后启动 gateway（这个非 loopback 示例使用共享密钥 token
认证）：

```bash
openclaw gateway
```

打开：

- `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

### 公网（Funnel）

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## 安全说明

- 默认要求 Gateway 网关认证（token、password、trusted-proxy，或在启用时使用 Tailscale Serve 身份头）。
- 非 loopback 绑定仍然**要求** gateway 认证。实际使用中，这意味着 token/password 认证，或使用 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- 向导默认会创建共享密钥认证，并且通常会生成一个
  gateway token（即使是在 loopback 上）。
- 在共享密钥模式下，UI 会发送 `connect.params.auth.token` 或
  `connect.params.auth.password`。
- 在 Tailscale Serve 或 `trusted-proxy` 这类携带身份的模式中，
  WebSocket 认证检查则改为通过请求头满足。
- 对于非 loopback 的 Control UI 部署，请显式设置 `gateway.controlUi.allowedOrigins`
  （完整 origin）。如果未设置，gateway 默认会拒绝启动。
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用
  Host 头 origin 回退模式，但这是一种危险的安全降级。
- 使用 Serve 时，当 `gateway.auth.allowTailscale` 为 `true` 时，
  Tailscale 身份头可以满足 Control UI/WebSocket 认证
  （无需 token/password）。
  HTTP API 端点不会使用这些 Tailscale 身份头；它们仍遵循
  gateway 的常规 HTTP 认证模式。设置
  `gateway.auth.allowTailscale: false` 可要求显式凭证。参见
  [Tailscale](/zh-CN/gateway/tailscale) 和 [安全](/zh-CN/gateway/security)。
  这种无 token 流程假定 gateway 主机是可信的。
- `gateway.tailscale.mode: "funnel"` 要求 `gateway.auth.mode: "password"`（共享密码）。

## 构建 UI

Gateway 网关会从 `dist/control-ui` 提供静态文件。使用以下命令构建它们：

```bash
pnpm ui:build # auto-installs UI deps on first run
```
