---
read_when:
    - 配对或重新连接 iOS 节点
    - 从源码运行 iOS 应用
    - 调试 Gateway 网关发现或 canvas 命令
summary: iOS 节点应用：连接到 Gateway 网关、配对、canvas 和故障排除
title: iOS 应用
x-i18n:
    generated_at: "2026-04-08T06:14:40Z"
    model: gpt-5.4
    provider: openai
    source_hash: f3e0a6e33e72d4c9f1f17ef70a1b67bae9ebe4a2dca16677ea6b28d0ddac1b4e
    source_path: platforms\ios.md
    workflow: 15
---

# iOS 应用（节点）

可用性：内部预览。iOS 应用尚未公开分发。

## 它能做什么

- 通过 WebSocket 连接到 Gateway 网关（LAN 或 tailnet）。
- 暴露节点能力：Canvas、屏幕快照、摄像头捕获、位置、Talk 模式、语音唤醒。
- 接收 `node.invoke` 命令并上报节点状态事件。

## 要求

- Gateway 网关运行在另一台设备上（macOS、Linux，或通过 WSL2 运行的 Windows）。
- 网络路径：
  - 通过 Bonjour 的同一 LAN，**或**
  - 通过单播 DNS-SD 的 tailnet（示例域名：`openclaw.internal.`），**或**
  - 手动填写 host/port（回退方式）。

## 快速开始（配对 + 连接）

1. 启动 Gateway 网关：

```bash
openclaw gateway --port 18789
```

2. 在 iOS 应用中，打开设置并选择一个已发现的 gateway，或启用 Manual Host 并输入 host/port。

3. 在 gateway 主机上批准配对请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

如果应用在认证细节（role/scopes/public key）变更后重试配对，
之前待处理的请求会被替换，并创建一个新的 `requestId`。
批准前请再次运行 `openclaw devices list`。

4. 验证连接：

```bash
openclaw nodes status
openclaw gateway call node.list --params "{}"
```

## 官方构建版本的中继支持推送

官方分发的 iOS 构建版本会使用外部推送中继，而不是将原始 APNs
token 直接发布给 gateway。

Gateway 网关侧要求：

```json5
{
  gateway: {
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
        },
      },
    },
  },
}
```

流程工作方式如下：

- iOS 应用使用 App Attest 和应用回执向中继注册。
- 中继会返回一个不透明的中继句柄，以及一个按注册作用域划分的发送授权。
- iOS 应用会获取已配对 gateway 的身份，并将其包含在中继注册中，因此该中继注册会委托给这个特定 gateway。
- 应用会通过 `push.apns.register` 将该中继支持的注册转发给已配对的 gateway。
- gateway 会使用已存储的中继句柄来执行 `push.test`、后台唤醒和唤醒提示。
- gateway 的中继 base URL 必须与官方/TestFlight iOS 构建中内置的中继 URL 一致。
- 如果应用随后连接到另一个 gateway，或连接到内置了不同中继 base URL 的构建版本，它会刷新中继注册，而不是复用旧绑定。

对于这一路径，gateway **不**需要做的事：

- 不需要面向整个部署的中继 token。
- 对于官方/TestFlight 的中继支持发送，不需要直接的 APNs key。

预期的操作员流程：

1. 安装官方/TestFlight iOS 构建版本。
2. 在 gateway 上设置 `gateway.push.apns.relay.baseUrl`。
3. 将应用与 gateway 配对，并让它完成连接。
4. 当应用拥有 APNs token、操作员会话已连接且中继注册成功后，它会自动发布 `push.apns.register`。
5. 之后，`push.test`、重连唤醒和唤醒提示就可以使用已存储的中继支持注册。

兼容性说明：

- `OPENCLAW_APNS_RELAY_BASE_URL` 仍可作为 gateway 的临时环境变量覆盖项使用。

## 认证与信任流程

中继的存在，是为了强制满足官方 iOS 构建版本下，gateway 直接连接 APNs 无法提供的两个约束：

- 只有通过 Apple 分发的真实 OpenClaw iOS 构建版本才能使用托管中继。
- 一个 gateway 只能为与其配对的 iOS 设备发送中继支持的推送。

逐跳说明：

1. `iOS app -> gateway`
   - 应用首先通过正常的 Gateway 网关认证流程与 gateway 配对。
   - 这会让应用获得一个已认证的节点会话，以及一个已认证的操作员会话。
   - 操作员会话用于调用 `gateway.identity.get`。

2. `iOS app -> relay`
   - 应用通过 HTTPS 调用中继注册端点。
   - 注册内容包含 App Attest 证明和应用回执。
   - 中继会校验 bundle ID、App Attest 证明和 Apple 回执，并要求
     官方/生产分发路径。
   - 这就是为什么本地 Xcode/dev 构建无法使用托管中继。一个本地构建可能
     已签名，但它不满足中继所要求的官方 Apple 分发证明。

3. `gateway identity delegation`
   - 在中继注册之前，应用会从
     `gateway.identity.get` 获取已配对 gateway 的身份。
   - 应用会在中继注册负载中包含该 gateway 身份。
   - 中继会返回一个中继句柄和一个按注册作用域划分的发送授权，它们会委托给
     该 gateway 身份。

4. `gateway -> relay`
   - gateway 会存储来自 `push.apns.register` 的中继句柄和发送授权。
   - 在执行 `push.test`、重连唤醒和唤醒提示时，gateway 会用它
     自己的设备身份对发送请求签名。
   - 中继会根据注册时委托的 gateway 身份，同时校验已存储的发送授权和 gateway 签名。
   - 另一个 gateway 即使设法拿到了该句柄，也无法复用该已存储注册。

5. `relay -> APNs`
   - 中继持有官方构建版本使用的生产 APNs 凭据和原始 APNs token。
   - 对于使用中继支持的官方构建版本，gateway 永远不会存储原始 APNs token。
   - 中继会代表已配对 gateway，将最终推送发送到 APNs。

之所以这样设计，是为了：

- 避免将生产 APNs 凭据放在用户的 gateway 中。
- 避免在 gateway 中存储官方构建版本的原始 APNs token。
- 只允许官方/TestFlight 的 OpenClaw 构建版本使用托管中继。
- 防止某个 gateway 向属于另一个 gateway 的 iOS 设备发送唤醒推送。

本地/手动构建仍然走直连 APNs 路径。如果你在没有中继的情况下测试这些构建版本，
gateway 仍然需要直接的 APNs 凭据：

```bash
export OPENCLAW_APNS_TEAM_ID="TEAMID"
export OPENCLAW_APNS_KEY_ID="KEYID"
export OPENCLAW_APNS_PRIVATE_KEY_P8="$(cat /path/to/AuthKey_KEYID.p8)"
```

这些是 gateway 主机运行时环境变量，不是 Fastlane 设置。`apps/ios/fastlane/.env` 只存储
App Store Connect / TestFlight 认证信息，例如 `ASC_KEY_ID` 和 `ASC_ISSUER_ID`；它并不配置
本地 iOS 构建版本的直连 APNs 投递。

推荐的 gateway 主机存储方式：

```bash
mkdir -p ~/.openclaw/credentials/apns
chmod 700 ~/.openclaw/credentials/apns
mv /path/to/AuthKey_KEYID.p8 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
chmod 600 ~/.openclaw/credentials/apns/AuthKey_KEYID.p8
export OPENCLAW_APNS_PRIVATE_KEY_PATH="$HOME/.openclaw/credentials/apns/AuthKey_KEYID.p8"
```

不要提交 `.p8` 文件，也不要把它放到仓库检出目录下。

## 发现路径

### Bonjour（LAN）

iOS 应用会浏览 `local.` 上的 `_openclaw-gw._tcp`，以及在配置时浏览相同的
广域 DNS-SD 发现域。同一 LAN 内的 gateway 会自动从 `local.` 出现；
跨网络发现可使用已配置的广域域名，而无需更改 beacon 类型。

### Tailnet（跨网络）

如果 mDNS 被阻止，请使用单播 DNS-SD 区域（选择一个域名；示例：
`openclaw.internal.`）和 Tailscale split DNS。
CoreDNS 示例请参见 [Bonjour](/zh-CN/gateway/bonjour)。

### 手动 host/port

在设置中启用 **Manual Host**，然后输入 gateway host 和端口（默认 `18789`）。

## Canvas + A2UI

iOS 节点会渲染一个 WKWebView canvas。使用 `node.invoke` 来驱动它：

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.navigate --params '{"url":"http://<gateway-host>:18789/__openclaw__/canvas/"}'
```

说明：

- Gateway 网关 canvas host 提供 `/__openclaw__/canvas/` 和 `/__openclaw__/a2ui/`。
- 它由 Gateway 网关 HTTP 服务器提供（与 `gateway.port` 相同端口，默认 `18789`）。
- 当广播了 canvas host URL 时，iOS 节点会在连接后自动跳转到 A2UI。
- 可通过 `canvas.navigate` 和 `{"url":""}` 返回到内置 scaffold。

### Canvas eval / snapshot

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.eval --params '{"javaScript":"(() => { const {ctx} = window.__openclaw; ctx.clearRect(0,0,innerWidth,innerHeight); ctx.lineWidth=6; ctx.strokeStyle=\"#ff2d55\"; ctx.beginPath(); ctx.moveTo(40,40); ctx.lineTo(innerWidth-40, innerHeight-40); ctx.stroke(); return \"ok\"; })()"}'
```

```bash
openclaw nodes invoke --node "iOS Node" --command canvas.snapshot --params '{"maxWidth":900,"format":"jpeg"}'
```

## 语音唤醒 + Talk 模式

- 语音唤醒和 Talk 模式可在设置中启用。
- iOS 可能会挂起后台音频；当应用未处于活动状态时，应将语音功能视为尽力而为。

## 常见错误

- `NODE_BACKGROUND_UNAVAILABLE`：请将 iOS 应用切到前台（canvas/camera/screen 命令都需要前台）。
- `A2UI_HOST_NOT_CONFIGURED`：Gateway 网关没有广播 canvas host URL；请检查 [Gateway 配置](/zh-CN/gateway/configuration) 中的 `canvasHost`。
- 配对提示始终不出现：运行 `openclaw devices list` 并手动批准。
- 重装后重连失败：Keychain 中的配对 token 已被清除；请重新为该节点配对。

## 相关文档

- [配对](/zh-CN/channels/pairing)
- [设备发现](/zh-CN/gateway/discovery)
- [Bonjour](/zh-CN/gateway/bonjour)
