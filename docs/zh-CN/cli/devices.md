---
read_when:
    - 你正在批准设备配对请求
    - 你需要轮换或吊销设备 token
summary: '`openclaw devices` 的 CLI 参考（设备配对 + token 轮换 / 吊销）'
title: devices
x-i18n:
    generated_at: "2026-04-08T03:51:47Z"
    model: gpt-5.4
    provider: openai
    source_hash: e2f9fcb8e3508a703590f87caaafd953a5d3557e11c958cbb2be1d67bb8720f4
    source_path: cli\devices.md
    workflow: 15
---

# `openclaw devices`

管理设备配对请求和设备范围的 token。

## 命令

### `openclaw devices list`

列出待处理的配对请求和已配对设备。

```
openclaw devices list
openclaw devices list --json
```

待处理请求的输出会包含所请求的角色和作用域，以便你在批准前进行审查。

### `openclaw devices remove <deviceId>`

移除一条已配对设备记录。

当你使用已配对设备 token 进行身份验证时，非管理员调用方只能
移除**自己的**设备记录。移除其他设备则需要
`operator.admin`。

```
openclaw devices remove <deviceId>
openclaw devices remove <deviceId> --json
```

### `openclaw devices clear --yes [--pending]`

批量清除已配对设备。

```
openclaw devices clear --yes
openclaw devices clear --yes --pending
openclaw devices clear --yes --pending --json
```

### `openclaw devices approve [requestId] [--latest]`

批准一个待处理的设备配对请求。如果省略 `requestId`，OpenClaw
会自动批准最近的一条待处理请求。

注意：如果某个设备以更改后的身份验证详情（角色 / 作用域 / 公钥）重新尝试配对，
OpenClaw 会替换之前的待处理记录，并签发一个新的
`requestId`。请在批准前立即运行 `openclaw devices list`，以使用当前 ID。

```
openclaw devices approve
openclaw devices approve <requestId>
openclaw devices approve --latest
```

### `openclaw devices reject <requestId>`

拒绝一个待处理的设备配对请求。

```
openclaw devices reject <requestId>
```

### `openclaw devices rotate --device <id> --role <role> [--scope <scope...>]`

为特定角色轮换一个设备 token（可选地更新作用域）。
目标角色必须已经存在于该设备已批准的配对契约中；
轮换不能签发一个新的、未批准的角色。
如果你省略 `--scope`，后续使用已存储轮换 token 的重新连接会复用该
token 缓存的已批准作用域。如果你显式传入 `--scope` 值，这些值
将成为未来基于缓存 token 重新连接时的已存储作用域集合。
非管理员已配对设备调用方只能轮换**自己的**设备 token。
此外，任何显式 `--scope` 值都必须保持在当前调用方会话自身的
operator scopes 范围内；轮换不能签发一个比调用方
现有权限更宽的 operator token。

```
openclaw devices rotate --device <deviceId> --role operator --scope operator.read --scope operator.write
```

返回新的 token 负载，格式为 JSON。

### `openclaw devices revoke --device <id> --role <role>`

吊销特定角色的设备 token。

非管理员已配对设备调用方只能吊销**自己的**设备 token。
吊销其他设备的 token 需要 `operator.admin`。

```
openclaw devices revoke --device <deviceId> --role node
```

返回吊销结果，格式为 JSON。

## 通用选项

- `--url <url>`：Gateway 网关 WebSocket URL（配置时默认使用 `gateway.remote.url`）。
- `--token <token>`：Gateway 网关 token（如果需要）。
- `--password <password>`：Gateway 网关密码（密码认证）。
- `--timeout <ms>`：RPC 超时。
- `--json`：JSON 输出（推荐用于脚本）。

注意：当你设置 `--url` 时，CLI 不会回退到配置或环境变量中的凭证。
请显式传入 `--token` 或 `--password`。缺少显式凭证会报错。

## 说明

- token 轮换会返回一个新的 token（敏感信息）。请像对待 secret 一样对待它。
- 这些命令需要 `operator.pairing`（或 `operator.admin`）作用域。
- token 轮换会严格限制在该设备已批准的配对角色集合和已批准作用域
  基线之内。一个偶然存在的缓存 token 条目不会授予新的
  可轮换目标。
- 对于已配对设备 token 会话，跨设备管理仅限管理员：
  `remove`、`rotate` 和 `revoke` 都仅限自操作，除非调用方具有
  `operator.admin`。
- `devices clear` 设计上必须搭配 `--yes`。
- 如果在 local loopback 上无法使用配对作用域（且未显式传入 `--url`），list / approve 可使用本地配对回退。
- 当你省略 `requestId` 或传入 `--latest` 时，`devices approve` 会自动选择最新的待处理请求。

## token 漂移恢复检查清单

当 Control UI 或其他客户端持续因 `AUTH_TOKEN_MISMATCH` 或 `AUTH_DEVICE_TOKEN_MISMATCH` 失败时，请使用此清单。

1. 确认当前 Gateway 网关 token 来源：

```bash
openclaw config get gateway.auth.token
```

2. 列出已配对设备并识别受影响的设备 id：

```bash
openclaw devices list
```

3. 为受影响设备轮换 operator token：

```bash
openclaw devices rotate --device <deviceId> --role operator
```

4. 如果轮换还不够，请移除过期配对并重新批准：

```bash
openclaw devices remove <deviceId>
openclaw devices list
openclaw devices approve <requestId>
```

5. 使用当前共享 token / 密码重试客户端连接。

说明：

- 正常的重连认证优先级依次为：显式共享 token / 密码优先，然后是显式 `deviceToken`，再然后是已存储设备 token，最后是 bootstrap token。
- 受信任的 `AUTH_TOKEN_MISMATCH` 恢复过程中，可以临时同时发送共享 token 和已存储设备 token，以完成一次有边界的重试。

相关内容：

- [???](/zh-CN/web/dashboard#if-you-see-unauthorized-1008)
- [故障排除](/zh-CN/gateway/troubleshooting#dashboard-control-ui-connectivity)
