---
read_when:
    - 在身份感知代理后运行 OpenClaw
    - 在 OpenClaw 前配置 Pomerium、Caddy 或 nginx + OAuth
    - 修复反向代理部署中的 WebSocket `1008 unauthorized` 错误
    - 决定在哪里设置 HSTS 和其他 HTTP 加固请求头
summary: 将 Gateway 网关认证委托给受信任的反向代理（Pomerium、Caddy、nginx + OAuth）
title: 受信任代理认证
x-i18n:
    generated_at: "2026-04-08T05:53:19Z"
    model: gpt-5.4
    provider: openai
    source_hash: ccd39736b43e8744de31566d5597b3fbf40ecb6ba9c8ba9d2343e1ab9bb8cd45
    source_path: gateway\trusted-proxy-auth.md
    workflow: 15
---

# 受信任代理认证

> ⚠️ **安全敏感功能。** 此模式会将认证完全委托给你的反向代理。配置错误可能会导致你的 Gateway 网关暴露给未授权访问。启用前请仔细阅读本页。

## 何时使用

在以下情况下使用 `trusted-proxy` 认证模式：

- 你将 OpenClaw 运行在**身份感知代理**之后（Pomerium、Caddy + OAuth、nginx + oauth2-proxy、Traefik + forward auth）
- 你的代理负责全部认证，并通过请求头传递用户身份
- 你处于 Kubernetes 或容器环境中，并且代理是访问 Gateway 网关的唯一路径
- 你遇到了 WebSocket `1008 unauthorized` 错误，因为浏览器无法在 WS 负载中传递 token

## 何时不要使用

- 如果你的代理不负责认证用户（只是 TLS 终止器或负载均衡器）
- 如果存在绕过代理直达 Gateway 网关的路径（防火墙漏洞、内部网络访问）
- 如果你不确定你的代理是否会正确剥离/覆盖转发请求头
- 如果你只需要个人单用户访问（可考虑使用 Tailscale Serve + loopback，设置更简单）

## 工作原理

1. 你的反向代理对用户进行认证（OAuth、OIDC、SAML 等）
2. 代理添加一个包含已认证用户身份的请求头（例如 `x-forwarded-user: nick@example.com`）
3. OpenClaw 检查请求是否来自**受信任的代理 IP**（在 `gateway.trustedProxies` 中配置）
4. OpenClaw 从配置的请求头中提取用户身份
5. 如果所有检查都通过，则请求被授权

## Control UI 配对行为

当 `gateway.auth.mode = "trusted-proxy"` 生效，且请求通过
受信任代理检查时，Control UI WebSocket 会话可以在没有设备
配对身份的情况下连接。

其影响包括：

- 在此模式下，配对不再是访问 Control UI 的主要门槛。
- 你的反向代理认证策略和 `allowUsers` 会成为实际访问控制。
- 只允许从受信任代理 IP 访问 Gateway 网关入口（`gateway.trustedProxies` + 防火墙）。

## 配置

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source
    bind: "lan",

    // CRITICAL: Only add your proxy's IP(s) here
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // Header containing authenticated user identity (required)
        userHeader: "x-forwarded-user",

        // Optional: headers that MUST be present (proxy verification)
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // Optional: restrict to specific users (empty = allow all)
        allowUsers: ["nick@example.com", "admin@company.org"],
      },
    },
  },
}
```

重要运行时规则：

- 受信任代理认证会拒绝来自 loopback 源的请求（`127.0.0.1`、`::1`、loopback CIDR）。
- 同主机上的 loopback 反向代理**不满足**受信任代理认证要求。
- 对于同主机 loopback 代理部署，请改用 token/password 认证，或通过 OpenClaw 可验证的非 loopback 受信任代理地址进行路由。
- 非 loopback 的 Control UI 部署仍然需要显式设置 `gateway.controlUi.allowedOrigins`。

### 配置参考

| 字段                                        | 必填 | 说明 |
| ------------------------------------------- | ---- | ---- |
| `gateway.trustedProxies`                    | 是   | 受信任代理 IP 地址数组。来自其他 IP 的请求会被拒绝。 |
| `gateway.auth.mode`                         | 是   | 必须为 `"trusted-proxy"` |
| `gateway.auth.trustedProxy.userHeader`      | 是   | 包含已认证用户身份的请求头名称 |
| `gateway.auth.trustedProxy.requiredHeaders` | 否   | 请求要被信任时必须存在的附加请求头 |
| `gateway.auth.trustedProxy.allowUsers`      | 否   | 用户身份允许列表。为空表示允许所有已认证用户。 |

## TLS 终止和 HSTS

使用单一 TLS 终止点，并在那里应用 HSTS。

### 推荐模式：由代理执行 TLS 终止

当你的反向代理为 `https://control.example.com` 处理 HTTPS 时，应在该域名对应的代理上设置
`Strict-Transport-Security`。

- 适合面向互联网的部署。
- 将证书和 HTTP 加固策略统一放在一处。
- OpenClaw 可以作为代理后的 loopback HTTP 服务运行。

请求头值示例：

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Gateway 网关执行 TLS 终止

如果 OpenClaw 自身直接提供 HTTPS 服务（没有执行 TLS 终止的代理），请设置：

```json5
{
  gateway: {
    tls: { enabled: true },
    http: {
      securityHeaders: {
        strictTransportSecurity: "max-age=31536000; includeSubDomains",
      },
    },
  },
}
```

`strictTransportSecurity` 接受字符串形式的请求头值，也可显式设为 `false` 以禁用。

### 发布建议

- 验证流量期间，先使用较短的 max age（例如 `max-age=300`）。
- 仅在你有足够把握后，再提高到长期值（例如 `max-age=31536000`）。
- 只有在每个子域名都已就绪支持 HTTPS 时，才添加 `includeSubDomains`。
- 只有在你有意满足整套域名的 preload 要求时，才使用 preload。
- 仅限 loopback 的本地开发无法从 HSTS 中受益。

## 代理配置示例

### Pomerium

Pomerium 通过 `x-pomerium-claim-email`（或其他 claim 请求头）传递身份，并通过 `x-pomerium-jwt-assertion` 传递 JWT。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Pomerium's IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-pomerium-claim-email",
        requiredHeaders: ["x-pomerium-jwt-assertion"],
      },
    },
  },
}
```

Pomerium 配置片段：

```yaml
routes:
  - from: https://openclaw.example.com
    to: http://openclaw-gateway:18789
    policy:
      - allow:
          or:
            - email:
                is: nick@example.com
    pass_identity_headers: true
```

### 带 OAuth 的 Caddy

带有 `caddy-security` 插件的 Caddy 可以对用户进行认证并传递身份请求头。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Caddy/sidecar proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

Caddyfile 配置片段：

```
openclaw.example.com {
    authenticate with oauth2_provider
    authorize with policy1

    reverse_proxy openclaw:18789 {
        header_up X-Forwarded-User {http.auth.user.email}
    }
}
```

### nginx + oauth2-proxy

oauth2-proxy 会对用户进行认证，并通过 `x-auth-request-email` 传递身份。

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-auth-request-email",
      },
    },
  },
}
```

nginx 配置片段：

```nginx
location / {
    auth_request /oauth2/auth;
    auth_request_set $user $upstream_http_x_auth_request_email;

    proxy_pass http://openclaw:18789;
    proxy_set_header X-Auth-Request-Email $user;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### 带 Forward Auth 的 Traefik

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["172.17.0.1"], // Traefik container IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

## 混合 token 配置

如果 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）与 `trusted-proxy` 模式同时启用，OpenClaw 会拒绝这种有歧义的配置。混合 token 配置可能导致 loopback 请求在错误的认证路径上被悄悄认证通过。

如果你在启动时看到 `mixed_trusted_proxy_token` 错误：

- 在使用 trusted-proxy 模式时移除共享 token，或
- 如果你打算使用基于 token 的认证，请将 `gateway.auth.mode` 切换为 `"token"`。

loopback 的受信任代理认证也会默认拒绝：同主机调用方必须通过受信任代理提供已配置的身份请求头，而不是被悄悄认证通过。

## 操作员作用域请求头

受信任代理认证是一种**携带身份的** HTTP 模式，因此调用方可以
选择通过 `x-openclaw-scopes` 声明操作员作用域。

示例：

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

行为：

- 当该请求头存在时，OpenClaw 会遵循所声明的作用域集合。
- 当该请求头存在但为空时，请求声明为**没有**任何操作员作用域。
- 当该请求头不存在时，普通的携带身份 HTTP API 会回退到标准的操作员默认作用域集合。
- 受 Gateway 网关认证的**插件 HTTP 路由**默认更窄：当 `x-openclaw-scopes` 不存在时，它们的运行时作用域会回退到 `operator.write`。
- 即使受信任代理认证成功，来自浏览器源的 HTTP 请求仍然必须通过 `gateway.controlUi.allowedOrigins`（或有意启用的 Host 请求头回退模式）。

实践规则：

- 当你希望受信任代理请求比默认值更窄时，或某个
  Gateway 网关认证插件路由需要比写入作用域更强的权限时，请显式发送 `x-openclaw-scopes`。

## 安全检查清单

启用受信任代理认证前，请确认：

- [ ] **代理是唯一路径**：除你的代理外，Gateway 网关端口已对其他所有来源实施防火墙限制
- [ ] **trustedProxies 最小化**：只包含你的实际代理 IP，而不是整个子网
- [ ] **无 loopback 代理源**：受信任代理认证会对 loopback 源请求默认拒绝
- [ ] **代理会剥离请求头**：你的代理会覆盖（而不是追加）来自客户端的 `x-forwarded-*` 请求头
- [ ] **TLS 终止**：你的代理处理 TLS；用户通过 HTTPS 连接
- [ ] **allowedOrigins 显式设置**：非 loopback 的 Control UI 显式设置了 `gateway.controlUi.allowedOrigins`
- [ ] **已设置 allowUsers**（推荐）：限制为已知用户，而不是允许任何已认证用户
- [ ] **没有混合 token 配置**：不要同时设置 `gateway.auth.token` 和 `gateway.auth.mode: "trusted-proxy"`

## 安全审计

`openclaw security audit` 会将受信任代理认证标记为**严重**级别的发现。这是有意为之——用于提醒你：你正在将安全性交给代理配置。

审计会检查：

- 基础 `gateway.trusted_proxy_auth` 警告/严重提醒
- 缺少 `trustedProxies` 配置
- 缺少 `userHeader` 配置
- `allowUsers` 为空（允许任何已认证用户）
- 对外暴露的 Control UI 表面存在通配符或缺失的浏览器源策略

## 故障排除

### “trusted_proxy_untrusted_source”

请求并非来自 `gateway.trustedProxies` 中的 IP。请检查：

- 代理 IP 是否正确？（Docker 容器 IP 可能会变化）
- 你的代理前面是否还有负载均衡器？
- 使用 `docker inspect` 或 `kubectl get pods -o wide` 查找实际 IP

### “trusted_proxy_loopback_source”

OpenClaw 拒绝了来自 loopback 源的受信任代理请求。

请检查：

- 代理是否从 `127.0.0.1` / `::1` 发起连接？
- 你是否在尝试将受信任代理认证用于同主机 loopback 反向代理？

修复方法：

- 对于同主机 loopback 代理部署，使用 token/password 认证，或
- 通过非 loopback 的受信任代理地址进行路由，并将该 IP 保留在 `gateway.trustedProxies` 中。

### “trusted_proxy_user_missing”

用户请求头为空或缺失。请检查：

- 你的代理是否配置为传递身份请求头？
- 请求头名称是否正确？（不区分大小写，但拼写必须正确）
- 用户是否确实已在代理处完成认证？

### “trusted*proxy_missing_header*\*”

缺少某个必需请求头。请检查：

- 你的代理中这些特定请求头的配置
- 请求头是否在链路中的某处被剥离

### “trusted_proxy_user_not_allowed”

用户已通过认证，但不在 `allowUsers` 中。请将其加入，或移除允许列表。

### “trusted_proxy_origin_not_allowed”

受信任代理认证已成功，但浏览器的 `Origin` 请求头未通过 Control UI 源检查。

请检查：

- `gateway.controlUi.allowedOrigins` 是否包含精确的浏览器源
- 你是否没有依赖通配符源，除非你确实有意允许所有来源
- 如果你确实有意使用 Host 请求头回退模式，是否已明确设置 `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true`

### WebSocket 仍然失败

请确保你的代理：

- 支持 WebSocket 升级（`Upgrade: websocket`、`Connection: upgrade`）
- 在 WebSocket 升级请求中传递身份请求头（而不只是普通 HTTP）
- 不会为 WebSocket 连接使用单独的认证路径

## 从 token 认证迁移

如果你要从 token 认证迁移到 trusted-proxy：

1. 配置你的代理，使其对用户进行认证并传递请求头
2. 独立测试代理配置（使用带请求头的 curl）
3. 使用受信任代理认证更新 OpenClaw 配置
4. 重启 Gateway 网关
5. 测试来自 Control UI 的 WebSocket 连接
6. 运行 `openclaw security audit` 并查看结果

## 相关内容

- [??](/zh-CN/gateway/security) — 完整安全指南
- [??](/zh-CN/gateway/configuration) — 配置参考
- [????](/zh-CN/gateway/remote) — 其他远程访问模式
- [Tailscale](/zh-CN/gateway/tailscale) — 仅限 tailnet 访问时更简单的替代方案
