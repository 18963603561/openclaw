---
read_when:
    - 在 Fly.io 上部署 OpenClaw 时
    - 设置 Fly volumes、secrets 和首次运行配置时
summary: 在 Fly.io 上为 OpenClaw 提供持久化存储和 HTTPS 的分步部署指南
title: Fly.io
x-i18n:
    generated_at: "2026-04-08T06:02:39Z"
    model: gpt-5.4
    provider: openai
    source_hash: a5f8c2c03295d786c0d8df98f8a5ae9335fa0346a188b81aae3e07d566a2c0ef
    source_path: install\fly.md
    workflow: 15
---

# Fly.io 部署

**目标：**让 OpenClaw Gateway 网关运行在 [Fly.io](https://fly.io) 机器上，并具备持久化存储、自动 HTTPS 以及 Discord/渠道访问能力。

## 你需要准备的内容

- 已安装 [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.io 账号（免费层即可）
- 模型认证：你所选模型 provider 的 API key
- 渠道凭证：Discord bot token、Telegram token 等

## 面向新手的快速路径

1. 克隆仓库 → 自定义 `fly.toml`
2. 创建 app + volume → 设置 secrets
3. 使用 `fly deploy` 部署
4. SSH 登录以创建配置，或使用 Control UI

<Steps>
  <Step title="创建 Fly app">
    ```bash
    # 克隆仓库
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw

    # 创建一个新的 Fly app（使用你自己的名称）
    fly apps create my-openclaw

    # 创建一个持久化卷（通常 1GB 就足够）
    fly volumes create openclaw_data --size 1 --region iad
    ```

    **提示：**请选择离你较近的区域。常见选项：`lhr`（伦敦）、`iad`（弗吉尼亚）、`sjc`（圣何塞）。

  </Step>

  <Step title="配置 fly.toml">
    编辑 `fly.toml`，使其与你的 app 名称和需求一致。

    **安全说明：**默认配置会暴露一个公共 URL。若要使用不带公共 IP 的加固部署，请参见 [私有部署](#private-deployment-hardened) 或使用 `fly.private.toml`。

    ```toml
    app = "my-openclaw"  # 你的 app 名称
    primary_region = "iad"

    [build]
      dockerfile = "Dockerfile"

    [env]
      NODE_ENV = "production"
      OPENCLAW_PREFER_PNPM = "1"
      OPENCLAW_STATE_DIR = "/data"
      NODE_OPTIONS = "--max-old-space-size=1536"

    [processes]
      app = "node dist/index.js gateway --allow-unconfigured --port 3000 --bind lan"

    [http_service]
      internal_port = 3000
      force_https = true
      auto_stop_machines = false
      auto_start_machines = true
      min_machines_running = 1
      processes = ["app"]

    [[vm]]
      size = "shared-cpu-2x"
      memory = "2048mb"

    [mounts]
      source = "openclaw_data"
      destination = "/data"
    ```

    **关键设置：**

    | 设置 | 原因 |
    | ------------------------------ | --------------------------------------------------------------------------- |
    | `--bind lan` | 绑定到 `0.0.0.0`，这样 Fly 的代理才能访问 gateway |
    | `--allow-unconfigured` | 在没有配置文件的情况下启动（之后你会创建配置） |
    | `internal_port = 3000` | 必须与 `--port 3000`（或 `OPENCLAW_GATEWAY_PORT`）匹配，供 Fly 健康检查使用 |
    | `memory = "2048mb"` | 512MB 太小；推荐 2GB |
    | `OPENCLAW_STATE_DIR = "/data"` | 将状态持久化到卷上 |

  </Step>

  <Step title="设置 secrets">
    ```bash
    # 必填：Gateway 网关 token（用于非 loopback 绑定）
    fly secrets set OPENCLAW_GATEWAY_TOKEN=$(openssl rand -hex 32)

    # 模型 provider API keys
    fly secrets set ANTHROPIC_API_KEY=sk-ant-...

    # 可选：其他 providers
    fly secrets set OPENAI_API_KEY=sk-...
    fly secrets set GOOGLE_API_KEY=...

    # 渠道 tokens
    fly secrets set DISCORD_BOT_TOKEN=MTQ...
    ```

    **说明：**

    - 非 loopback 绑定（`--bind lan`）需要有效的 Gateway 网关认证路径。这个 Fly.io 示例使用 `OPENCLAW_GATEWAY_TOKEN`，但 `gateway.auth.password` 或正确配置的非 loopback `trusted-proxy` 部署也同样满足要求。
    - 请像对待密码一样保管这些 tokens。
    - **对于所有 API keys 和 tokens，优先使用 env vars，而不是配置文件。** 这样可以避免把 secrets 放进 `openclaw.json`，从而减少意外暴露或写入日志的风险。

  </Step>

  <Step title="部署">
    ```bash
    fly deploy
    ```

    首次部署会构建 Docker 镜像（约 2-3 分钟）。后续部署会更快。

    部署完成后，请验证：

    ```bash
    fly status
    fly logs
    ```

    你应当看到：

    ```
    [gateway] listening on ws://0.0.0.0:3000 (PID xxx)
    [discord] logged in to discord as xxx
    ```

  </Step>

  <Step title="创建配置文件">
    SSH 登录机器以创建正式配置：

    ```bash
    fly ssh console
    ```

    创建配置目录和文件：

    ```bash
    mkdir -p /data
    cat > /data/openclaw.json << 'EOF'
    {
      "agents": {
        "defaults": {
          "model": {
            "primary": "anthropic/claude-opus-4-6",
            "fallbacks": ["anthropic/claude-sonnet-4-6", "openai/gpt-5.4"]
          },
          "maxConcurrent": 4
        },
        "list": [
          {
            "id": "main",
            "default": true
          }
        ]
      },
      "auth": {
        "profiles": {
          "anthropic:default": { "mode": "token", "provider": "anthropic" },
          "openai:default": { "mode": "token", "provider": "openai" }
        }
      },
      "bindings": [
        {
          "agentId": "main",
          "match": { "channel": "discord" }
        }
      ],
      "channels": {
        "discord": {
          "enabled": true,
          "groupPolicy": "allowlist",
          "guilds": {
            "YOUR_GUILD_ID": {
              "channels": { "general": { "allow": true } },
              "requireMention": false
            }
          }
        }
      },
      "gateway": {
        "mode": "local",
        "bind": "auto"
      },
      "meta": {}
    }
    EOF
    ```

    **注意：**设置 `OPENCLAW_STATE_DIR=/data` 后，配置路径就是 `/data/openclaw.json`。

    **注意：**Discord token 可以来自以下任一来源：

    - 环境变量：`DISCORD_BOT_TOKEN`（推荐用于 secrets）
    - 配置文件：`channels.discord.token`

    如果使用 env var，则无需把 token 写入配置。gateway 会自动读取 `DISCORD_BOT_TOKEN`。

    重启以应用配置：

    ```bash
    exit
    fly machine restart <machine-id>
    ```

  </Step>

  <Step title="访问 Gateway 网关">
    ### Control UI

    在浏览器中打开：

    ```bash
    fly open
    ```

    或访问 `https://my-openclaw.fly.dev/`

    使用已配置的共享密钥进行认证。本指南使用的是来自 `OPENCLAW_GATEWAY_TOKEN` 的 gateway
    token；如果你改用了密码认证，则请使用对应密码。

    ### 日志

    ```bash
    fly logs              # 实时日志
    fly logs --no-tail    # 最近日志
    ```

    ### SSH 控制台

    ```bash
    fly ssh console
    ```

  </Step>
</Steps>

## 故障排除

### “App is not listening on expected address”

gateway 绑定到了 `127.0.0.1`，而不是 `0.0.0.0`。

**修复方法：**在 `fly.toml` 的进程命令中添加 `--bind lan`。

### 健康检查失败 / 连接被拒绝

Fly 无法在配置的端口上访问 gateway。

**修复方法：**确保 `internal_port` 与 gateway 端口匹配（设置 `--port 3000` 或 `OPENCLAW_GATEWAY_PORT=3000`）。

### OOM / 内存问题

容器不断重启或被杀死。迹象包括：`SIGABRT`、`v8::internal::Runtime_AllocateInYoungGeneration`，或无提示重启。

**修复方法：**增加 `fly.toml` 中的内存：

```toml
[[vm]]
  memory = "2048mb"
```

或者更新现有机器：

```bash
fly machine update <machine-id> --vm-memory 2048 -y
```

**注意：**512MB 太小。1GB 可能可用，但在有负载或启用详细日志时可能会 OOM。**推荐 2GB。**

### Gateway 网关锁文件问题

Gateway 网关拒绝启动，并提示 “already running” 错误。

这通常发生在容器重启后，但 PID 锁文件仍然保留在卷中。

**修复方法：**删除锁文件：

```bash
fly ssh console --command "rm -f /data/gateway.*.lock"
fly machine restart <machine-id>
```

锁文件位于 `/data/gateway.*.lock`（不在子目录中）。

### 配置未被读取

`--allow-unconfigured` 只会绕过启动保护。它不会创建或修复 `/data/openclaw.json`，因此请确保真实配置存在，并且在你希望正常启动本地 gateway 时包含 `gateway.mode="local"`。

验证配置是否存在：

```bash
fly ssh console --command "cat /data/openclaw.json"
```

### 通过 SSH 写入配置

`fly ssh console -C` 命令不支持 Shell 重定向。要写入配置文件，可以这样做：

```bash
# 使用 echo + tee（从本地通过管道写入远端）
echo '{"your":"config"}' | fly ssh console -C "tee /data/openclaw.json"

# 或使用 sftp
fly sftp shell
> put /local/path/config.json /data/openclaw.json
```

**注意：**如果文件已存在，`fly sftp` 可能会失败。请先删除：

```bash
fly ssh console --command "rm /data/openclaw.json"
```

### 状态未持久化

如果在重启后丢失了 auth profiles、渠道/provider 状态或会话，
说明状态目录被写入到了容器文件系统中。

**修复方法：**确保在 `fly.toml` 中设置 `OPENCLAW_STATE_DIR=/data`，然后重新部署。

## 更新

```bash
# 拉取最新更改
git pull

# 重新部署
fly deploy

# 检查健康状态
fly status
fly logs
```

### 更新机器命令

如果你需要在不完整重新部署的情况下更改启动命令：

```bash
# 获取 machine ID
fly machines list

# 更新命令
fly machine update <machine-id> --command "node dist/index.js gateway --port 3000 --bind lan" -y

# 或同时增加内存
fly machine update <machine-id> --vm-memory 2048 --command "node dist/index.js gateway --port 3000 --bind lan" -y
```

**注意：**执行 `fly deploy` 后，机器命令可能会重置为 `fly.toml` 中的内容。如果你做过手动修改，请在部署后重新应用。

## 私有部署（加固）

默认情况下，Fly 会分配公共 IP，这意味着你的 gateway 可通过 `https://your-app.fly.dev` 访问。这很方便，但也意味着你的部署可能被互联网扫描器（Shodan、Censys 等）发现。

如果你希望实现**无公共暴露**的加固部署，请使用私有模板。

### 何时使用私有部署

- 你只进行**出站**调用/消息（没有入站 webhook）
- 你使用 **ngrok 或 Tailscale** 隧道来处理任何 webhook 回调
- 你通过 **SSH、代理或 WireGuard** 访问 gateway，而不是直接用浏览器
- 你希望部署**对互联网扫描器隐藏**

### 设置

使用 `fly.private.toml` 替代标准配置：

```bash
# 使用私有配置部署
fly deploy -c fly.private.toml
```

或者将现有部署切换为私有模式：

```bash
# 列出当前 IP
fly ips list -a my-openclaw

# 释放公共 IP
fly ips release <public-ipv4> -a my-openclaw
fly ips release <public-ipv6> -a my-openclaw

# 切换到私有配置，以防未来部署重新分配公共 IP
# （移除 [http_service]，或使用私有模板部署）
fly deploy -c fly.private.toml

# 分配仅私有 IPv6
fly ips allocate-v6 --private -a my-openclaw
```

此后，`fly ips list` 应仅显示一个 `private` 类型 IP：

```
VERSION  IP                   TYPE             REGION
v6       fdaa:x:x:x:x::x      private          global
```

### 访问私有部署

由于没有公共 URL，请使用以下任一方法：

**方式 1：本地代理（最简单）**

```bash
# 将本地 3000 端口转发到 app
fly proxy 3000:3000 -a my-openclaw

# 然后在浏览器中打开 http://localhost:3000
```

**方式 2：WireGuard VPN**

```bash
# 创建 WireGuard 配置（一次性）
fly wireguard create

# 导入到 WireGuard 客户端，然后通过内部 IPv6 访问
# 示例：http://[fdaa:x:x:x:x::x]:3000
```

**方式 3：仅使用 SSH**

```bash
fly ssh console -a my-openclaw
```

### 私有部署下的 Webhooks

如果你在不公开暴露的情况下仍需要 webhook 回调（Twilio、Telnyx 等）：

1. **ngrok 隧道** —— 在容器内或作为 sidecar 运行 ngrok
2. **Tailscale Funnel** —— 通过 Tailscale 暴露特定路径
3. **仅出站** —— 某些 providers（如 Twilio）即使没有 webhook 也可正常进行出站呼叫

使用 ngrok 的语音呼叫配置示例：

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        enabled: true,
        config: {
          provider: "twilio",
          tunnel: { provider: "ngrok" },
          webhookSecurity: {
            allowedHosts: ["example.ngrok.app"],
          },
        },
      },
    },
  },
}
```

ngrok 隧道运行在容器内部，可提供公共 webhook URL，而无需暴露 Fly app 本身。请将 `webhookSecurity.allowedHosts` 设置为公共隧道主机名，以便允许转发的 Host 头。

### 安全收益

| 方面 | Public | Private |
| ----------------- | ------------ | ---------- |
| 互联网扫描器 | 可发现 | 隐藏 |
| 直接攻击 | 可能 | 被阻止 |
| Control UI 访问 | 浏览器 | 代理/VPN |
| webhook 投递 | 直接 | 通过隧道 |

## 说明

- Fly.io 使用 **x86 架构**（不是 ARM）
- 该 Dockerfile 同时兼容两种架构
- 对于 WhatsApp/Telegram 新手引导，请使用 `fly ssh console`
- 持久化数据存储在 `/data` 卷中
- Signal 需要 Java + signal-cli；请使用自定义镜像，并将内存保持在 2GB 以上。

## 成本

使用推荐配置（`shared-cpu-2x`、2GB RAM）时：

- 约 \$10-15/月，具体取决于使用量
- 免费层包含一定额度

详情请参见 [Fly.io 定价](https://fly.io/docs/about/pricing/)。

## 后续步骤

- 设置消息渠道：[渠道](/zh-CN/channels)
- 配置 Gateway 网关：[??](/zh-CN/gateway/configuration)
- 保持 OpenClaw 为最新版本：[更新](/zh-CN/install/updating)
