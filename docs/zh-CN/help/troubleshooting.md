---
read_when:
    - OpenClaw 无法正常工作，而你需要最快的修复路径时
    - 在深入阅读详细运行手册之前，你想先走一遍分诊流程时
summary: 面向症状优先的 OpenClaw 故障排除入口
title: 常规故障排除
x-i18n:
    generated_at: "2026-04-08T05:58:05Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8abda90ef80234c2f91a51c5e1f2c004d4a4da12a5d5631b5927762550c6d5e3
    source_path: help\troubleshooting.md
    workflow: 15
---

# 故障排除

如果你只有 2 分钟，请把本页当作分诊入口。

## 最初的六十秒

按顺序运行以下完整命令链：

```bash
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow
```

一行内的良好输出应为：

- `openclaw status` → 显示已配置的渠道，并且没有明显的认证错误。
- `openclaw status --all` → 提供完整报告，并且可分享。
- `openclaw gateway probe` → 预期的 Gateway 网关目标可达（`Reachable: yes`）。`RPC: limited - missing scope: operator.read` 表示诊断能力受限，而不是连接失败。
- `openclaw gateway status` → `Runtime: running` 且 `RPC probe: ok`。
- `openclaw doctor` → 没有阻塞性的配置/服务错误。
- `openclaw channels status --probe` → 当 Gateway 网关可达时，返回实时的按账号划分的
  传输状态，以及诸如 `works` 或 `audit ok` 的探测/审计结果；如果
  Gateway 网关不可达，该命令会回退为仅基于配置的摘要。
- `openclaw logs --follow` → 活动稳定，没有重复出现的致命错误。

## Anthropic 长上下文 429

如果你看到：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`，
请前往 [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-CN/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

## 本地 OpenAI 兼容后端直接可用，但在 OpenClaw 中失败

如果你的本地或自托管 `/v1` 后端可以响应小型直接
`/v1/chat/completions` 探测，但在 `openclaw infer model run` 或正常
智能体回合中失败：

1. 如果错误提到 `messages[].content` 期望是字符串，请设置
   `models.providers.<provider>.models[].compat.requiresStringContent: true`。
2. 如果后端仍然只在 OpenClaw 智能体回合中失败，请设置
   `models.providers.<provider>.models[].compat.supportsTools: false` 并重试。
3. 如果很小的直接调用仍然可用，但更大的 OpenClaw 提示会让
   后端崩溃，请将剩余问题视为上游模型/服务器限制，并继续查看详细运行手册：
   [/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail](/zh-CN/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)

## 插件安装因缺少 openclaw extensions 而失败

如果安装失败并显示 `package.json missing openclaw.extensions`，说明该插件包
使用了 OpenClaw 不再接受的旧格式。

在插件包中修复：

1. 在 `package.json` 中添加 `openclaw.extensions`。
2. 将入口指向构建后的运行时文件（通常是 `./dist/index.js`）。
3. 重新发布插件，并再次运行 `openclaw plugins install <package>`。

示例：

```json
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}
```

参考：[插件架构](/plugins/architecture)

## 决策树

```mermaid
flowchart TD
  A[OpenClaw 无法正常工作] --> B{首先是哪里出了问题}
  B --> C[没有回复]
  B --> D[仪表板或 Control UI 无法连接]
  B --> E[Gateway 网关无法启动或服务未运行]
  B --> F[渠道已连接，但消息不流转]
  B --> G[Cron 或 heartbeat 未触发或未送达]
  B --> H[节点已配对，但 camera canvas screen exec 失败]
  B --> I[浏览器工具失败]

  C --> C1[/没有回复部分/]
  D --> D1[/Control UI 部分/]
  E --> E1[/Gateway 网关部分/]
  F --> F1[/渠道流转部分/]
  G --> G1[/自动化部分/]
  H --> H1[/节点工具部分/]
  I --> I1[/浏览器部分/]
```

<AccordionGroup>
  <Accordion title="没有回复">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw channels status --probe
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    ```

    良好输出应为：

    - `Runtime: running`
    - `RPC probe: ok`
    - 你的渠道显示传输已连接，并且在支持的情况下，`channels status --probe` 中显示 `works` 或 `audit ok`
    - 发送者显示为已批准（或者私信策略为 open/allowlist）

    常见日志特征：

    - `drop guild message (mention required` → Discord 中的提及门控阻止了该消息。
    - `pairing request` → 发送者尚未获批，正在等待私信配对批准。
    - 渠道日志中的 `blocked` / `allowlist` → 发送者、房间或群组被过滤。

    详细页面：

    - [/gateway/troubleshooting#no-replies](/zh-CN/gateway/troubleshooting#no-replies)
    - [/channels/troubleshooting](/zh-CN/channels/troubleshooting)
    - [/channels/pairing](/zh-CN/channels/pairing)

  </Accordion>

  <Accordion title="仪表板或 Control UI 无法连接">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    良好输出应为：

    - 在 `openclaw gateway status` 中显示 `Dashboard: http://...`
    - `RPC probe: ok`
    - 日志中没有认证循环

    常见日志特征：

    - `device identity required` → HTTP/非安全上下文无法完成设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 Control UI
      Gateway 网关目标允许的范围内。
    - 带有重试提示的 `AUTH_TOKEN_MISMATCH`（`canRetryWithDeviceToken=true`）→ 可能会自动执行一次受信任设备令牌重试。
    - 该缓存令牌重试会复用与已配对设备令牌一起存储的缓存作用域集合。
      显式 `deviceToken` / 显式 `scopes` 调用方则保留它们请求的作用域集合。
    - 在异步 Tailscale Serve Control UI 路径上，同一
      `{scope, ip}` 的失败尝试会在限流器记录失败前被串行处理，因此
      第二个并发的错误重试可能已经显示 `retry later`。
    - 来自 localhost 浏览器来源的 `too many failed authentication attempts (retry later)` →
      来自同一 `Origin` 的重复失败会被暂时锁定；另一个 localhost 来源则使用独立的桶。
    - 在该重试之后反复出现的 `unauthorized` → token/password 错误、认证模式不匹配，或已配对设备令牌过期。
    - `gateway connect failed:` → UI 正在访问错误的 URL/端口，或目标 Gateway 网关不可达。

    详细页面：

    - [/gateway/troubleshooting#dashboard-control-ui-connectivity](/zh-CN/gateway/troubleshooting#dashboard-control-ui-connectivity)
    - [/web/control-ui](/web/control-ui)
    - [/gateway/authentication](/zh-CN/gateway/authentication)

  </Accordion>

  <Accordion title="Gateway 网关无法启动，或服务已安装但未运行">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    良好输出应为：

    - `Service: ... (loaded)`
    - `Runtime: running`
    - `RPC probe: ok`

    常见日志特征：

    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → gateway 模式是 remote，或者配置文件缺少本地模式标记，需要修复。
    - `refusing to bind gateway ... without auth` → 非 loopback 绑定，但没有有效的 Gateway 网关认证路径（token/password，或已正确配置的 trusted-proxy）。
    - `another gateway instance is already listening` 或 `EADDRINUSE` → 端口已被占用。

    详细页面：

    - [/gateway/troubleshooting#gateway-service-not-running](/zh-CN/gateway/troubleshooting#gateway-service-not-running)
    - [/gateway/background-process](/zh-CN/gateway/background-process)
    - [/gateway/configuration](/zh-CN/gateway/configuration)

  </Accordion>

  <Accordion title="渠道已连接，但消息不流转">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw logs --follow
    openclaw doctor
    openclaw channels status --probe
    ```

    良好输出应为：

    - 渠道传输已连接。
    - 配对/allowlist 检查已通过。
    - 在需要提及时，已检测到提及。

    常见日志特征：

    - `mention required` → 群组提及门控阻止了处理。
    - `pairing` / `pending` → 私信发送者尚未获批。
    - `not_in_channel`、`missing_scope`、`Forbidden`、`401/403` → 渠道权限令牌问题。

    详细页面：

    - [/gateway/troubleshooting#channel-connected-messages-not-flowing](/zh-CN/gateway/troubleshooting#channel-connected-messages-not-flowing)
    - [/channels/troubleshooting](/zh-CN/channels/troubleshooting)

  </Accordion>

  <Accordion title="Cron 或 heartbeat 未触发或未送达">
    ```bash
    openclaw status
    openclaw gateway status
    openclaw cron status
    openclaw cron list
    openclaw cron runs --id <jobId> --limit 20
    openclaw logs --follow
    ```

    良好输出应为：

    - `cron.status` 显示已启用，并且有下一次唤醒时间。
    - `cron runs` 显示最近的 `ok` 条目。
    - heartbeat 已启用，且当前不在活跃时段之外。

    常见日志特征：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
- `heartbeat skipped` 且 `reason=quiet-hours` → 当前不在配置的活跃时段内。
- `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但只包含空白/仅标题脚手架内容。
- `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 任务模式已启用，但当前还没有任何任务到达触发间隔。
- `heartbeat skipped` 且 `reason=alerts-disabled` → 所有 heartbeat 可见性都已禁用（`showOk`、`showAlerts` 和 `useIndicator` 全部关闭）。
- `requests-in-flight` → 主通道忙碌；heartbeat 唤醒被延后。- `unknown accountId` → heartbeat 投递目标账号不存在。

      详细页面：

      - [/gateway/troubleshooting#cron-and-heartbeat-delivery](/zh-CN/gateway/troubleshooting#cron-and-heartbeat-delivery)
      - [/automation/cron-jobs#troubleshooting](/zh-CN/automation/cron-jobs#troubleshooting)
      - [/gateway/heartbeat](/zh-CN/gateway/heartbeat)

    </Accordion>

    <Accordion title="节点已配对，但工具 camera canvas screen exec 失败">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw nodes status
      openclaw nodes describe --node <idOrNameOrIp>
      openclaw logs --follow
      ```

      良好输出应为：

      - 节点列为已连接，并已按 `node` 角色完成配对。
      - 你要调用的命令对应的能力已存在。
      - 工具所需的权限状态为已授予。

      常见日志特征：

      - `NODE_BACKGROUND_UNAVAILABLE` → 请将节点应用切回前台。
      - `*_PERMISSION_REQUIRED` → OS 权限被拒绝或缺失。
      - `SYSTEM_RUN_DENIED: approval required` → exec 批准尚未完成。
      - `SYSTEM_RUN_DENIED: allowlist miss` → 命令不在 exec allowlist 中。

      详细页面：

      - [/gateway/troubleshooting#node-paired-tool-fails](/zh-CN/gateway/troubleshooting#node-paired-tool-fails)
      - [/nodes/troubleshooting](/zh-CN/nodes/troubleshooting)
      - [/tools/exec-approvals](/tools/exec-approvals)

    </Accordion>

    <Accordion title="Exec 突然开始要求批准">
      ```bash
      openclaw config get tools.exec.host
      openclaw config get tools.exec.security
      openclaw config get tools.exec.ask
      openclaw gateway restart
      ```

      发生了什么变化：

      - 如果 `tools.exec.host` 未设置，默认值是 `auto`。
      - `host=auto` 会在沙箱运行时激活时解析为 `sandbox`，否则解析为 `gateway`。
      - `host=auto` 只负责路由；无提示的 “YOLO” 行为来自 gateway/node 上的 `security=full` 加 `ask=off`。
      - 在 `gateway` 和 `node` 上，未设置的 `tools.exec.security` 默认是 `full`。
      - 未设置的 `tools.exec.ask` 默认是 `off`。
      - 结果：如果你看到了批准提示，说明某个主机本地或按会话生效的策略把 exec 收紧到了当前默认值之外。

      恢复当前默认的免批准行为：

      ```bash
      openclaw config set tools.exec.host gateway
      openclaw config set tools.exec.security full
      openclaw config set tools.exec.ask off
      openclaw gateway restart
      ```

      更安全的替代方案：

      - 如果你只是想要稳定的主机路由，只设置 `tools.exec.host=gateway`。
      - 如果你想保留主机 exec，但又希望在 allowlist 未命中时进行审查，请使用 `security=allowlist` 和 `ask=on-miss`。
      - 如果你希望 `host=auto` 重新解析为 `sandbox`，请启用沙箱模式。

      常见日志特征：

      - `Approval required.` → 命令正在等待 `/approve ...`。
      - `SYSTEM_RUN_DENIED: approval required` → node 主机上的 exec 批准尚未完成。
      - `exec host=sandbox requires a sandbox runtime for this session` → 隐式/显式选择了 sandbox，但沙箱模式已关闭。

      详细页面：

      - [/tools/exec](/tools/exec)
      - [/tools/exec-approvals](/tools/exec-approvals)
      - [/gateway/security#runtime-expectation-drift](/zh-CN/gateway/security#runtime-expectation-drift)

    </Accordion>

    <Accordion title="浏览器工具失败">
      ```bash
      openclaw status
      openclaw gateway status
      openclaw browser status
      openclaw logs --follow
      openclaw doctor
      ```

      良好输出应为：

      - 浏览器状态显示 `running: true`，并且已有选定的浏览器/profile。
      - `openclaw` 可以启动，或者 `user` 可以看到本地 Chrome 标签页。

      常见日志特征：

      - `unknown command "browser"` 或 `unknown command 'browser'` → 已设置 `plugins.allow`，但其中不包含 `browser`。
      - `Failed to start Chrome CDP on port` → 本地浏览器启动失败。
      - `browser.executablePath not found` → 配置的二进制路径错误。
      - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不受支持的 scheme。
      - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
      - `No Chrome tabs found for profile="user"` → Chrome MCP attach profile 没有打开任何本地 Chrome 标签页。
      - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从当前主机无法访问。
      - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → attach-only profile 没有可用的实时 CDP 目标。
      - attach-only 或远程 CDP profile 上残留的 viewport / dark-mode / locale / offline 覆盖状态 → 运行 `openclaw browser stop --browser-profile <name>`，关闭当前控制会话并释放模拟状态，而无需重启 gateway。

      详细页面：

      - [/gateway/troubleshooting#browser-tool-fails](/zh-CN/gateway/troubleshooting#browser-tool-fails)
      - [/tools/browser#missing-browser-command-or-tool](/tools/browser#missing-browser-command-or-tool)
      - [/tools/browser-linux-troubleshooting](/tools/browser-linux-troubleshooting)
      - [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

    </Accordion>
  </AccordionGroup>

## 相关内容

- [常见问题](/zh-CN/help/faq) — 常见问题解答
- [Gateway 网关故障排除](/zh-CN/gateway/troubleshooting) — Gateway 网关专属问题
- [Doctor](/zh-CN/gateway/doctor) — 自动化健康检查与修复
- [渠道故障排除](/zh-CN/channels/troubleshooting) — 渠道连接问题
- [自动化故障排除](/zh-CN/automation/cron-jobs#troubleshooting) — cron 和 heartbeat 问题
