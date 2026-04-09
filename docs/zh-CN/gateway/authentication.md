---
read_when:
    - 调试模型身份凭证或 OAuth 过期问题
    - 编写关于身份凭证或凭证存储的文档
summary: 模型身份凭证：OAuth、API 密钥、Claude CLI 复用和 Anthropic setup-token
title: 身份凭证
x-i18n:
    generated_at: "2026-04-08T04:07:40Z"
    model: gpt-5.4
    provider: openai
    source_hash: 9db0ad9eccd7e3e3ca328adaad260bc4288a8ccdbe2dc0c24d9fd049b7ab9231
    source_path: gateway\authentication.md
    workflow: 15
---

# 身份凭证（模型提供商）

<Note>
本页介绍的是**模型提供商**身份凭证（API 密钥、OAuth、Claude CLI 复用和 Anthropic setup-token）。关于 **Gateway 网关连接**身份凭证（token、password、trusted-proxy），请参见 [配置](/zh-CN/gateway/configuration) 和 [??????](/zh-CN/gateway/trusted-proxy-auth)。
</Note>

OpenClaw 支持为模型提供商使用 OAuth 和 API 密钥。对于始终在线的 Gateway 网关主机，API 密钥通常是最可预测的选项。当它们与你的提供商账户模式匹配时，也支持订阅式/OAuth 流程。

完整的 OAuth 流程和存储布局请参见 [OAuth](/zh-CN/concepts/oauth)。
关于基于 SecretRef 的身份凭证（`env`/`file`/`exec` 提供商），请参见 [Secrets 管理](/zh-CN/gateway/secrets)。
关于 `models status --probe` 使用的凭证资格/原因码规则，请参见
[身份凭证语义](/zh-CN/auth-credential-semantics)。

## 推荐设置（API 密钥，任意提供商）

如果你运行的是长期存在的 Gateway 网关，建议先为你选择的提供商配置 API 密钥。
对于 Anthropic，API 密钥身份凭证仍然是最可预测的服务器设置，但 OpenClaw 也支持复用本地 Claude CLI 登录。

1. 在你的提供商控制台中创建一个 API 密钥。
2. 将它放在**Gateway 网关主机**上（也就是运行 `openclaw gateway` 的机器）。

```bash
export <PROVIDER>_API_KEY="..."
openclaw models status
```

3. 如果 Gateway 网关运行在 systemd/launchd 下，建议将密钥放入
   `~/.openclaw/.env`，这样守护进程就可以读取：

```bash
cat >> ~/.openclaw/.env <<'EOF'
<PROVIDER>_API_KEY=...
EOF
```

然后重启守护进程（或重启你的 Gateway 网关进程）并重新检查：

```bash
openclaw models status
openclaw doctor
```

如果你不想自己管理环境变量，新手引导可以为守护进程存储 API 密钥：`openclaw onboard`。

关于环境继承（`env.shellEnv`、`~/.openclaw/.env`、systemd/launchd）的细节，请参见 [帮助](/zh-CN/help)。

## Anthropic：Claude CLI 和令牌兼容性

Anthropic setup-token 身份凭证在 OpenClaw 中仍作为受支持的令牌路径保留。之后，Anthropic 工作人员已告知我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许，因此，除非 Anthropic 发布新的策略，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为此集成场景下被认可的方式。当主机上可用 Claude CLI 复用时，它现在是首选路径。

对于长期运行的 Gateway 网关主机，Anthropic API 密钥仍然是最可预测的设置。如果你想复用同一主机上的现有 Claude 登录，请在新手引导/配置中使用 Anthropic Claude CLI 路径。

手动输入令牌（任意提供商；写入 `auth-profiles.json` 并更新配置）：

```bash
openclaw models auth paste-token --provider openrouter
```

静态凭证也支持身份凭证配置档案引用：

- `api_key` 凭证可以使用 `keyRef: { source, provider, id }`
- `token` 凭证可以使用 `tokenRef: { source, provider, id }`
- OAuth 模式的配置档案不支持 SecretRef 凭证；如果 `auth.profiles.<id>.mode` 设置为 `"oauth"`，则会拒绝该配置档案中由 SecretRef 支持的 `keyRef`/`tokenRef` 输入。

适合自动化的检查（过期/缺失时退出码为 `1`，即将过期时为 `2`）：

```bash
openclaw models status --check
```

实时身份凭证探测：

```bash
openclaw models status --probe
```

说明：

- 探测行可以来自身份凭证配置档案、环境变量凭证或 `models.json`。
- 如果显式 `auth.order.<provider>` 省略了某个已存储配置档案，探测会对该配置档案报告
  `excluded_by_auth_order`，而不是尝试它。
- 如果身份凭证存在，但 OpenClaw 无法为该提供商解析出可探测的模型候选项，探测会报告 `status: no_model`。
- 速率限制冷却可以按模型划分。对某个模型处于冷却中的配置档案，在同一提供商下仍可能可用于其兄弟模型。

可选运维脚本（systemd/Termux）记录在这里：
[身份凭证监控脚本](/zh-CN/help/scripts#auth-monitoring-scripts)

## Anthropic 说明

Anthropic `claude-cli` 后端现已再次受支持。

- Anthropic 工作人员已告知我们，此 OpenClaw 集成路径现在再次被允许。
- 因此，除非 Anthropic 发布新的策略，否则 OpenClaw 会将 Claude CLI 复用和 `claude -p` 用法视为适用于 Anthropic 支持运行的认可方式。
- 对于长期运行的 Gateway 网关主机，以及需要明确服务器端计费控制的场景，Anthropic API 密钥仍然是最可预测的选择。

## 检查模型身份凭证状态

```bash
openclaw models status
openclaw doctor
```

## API 密钥轮换行为（Gateway 网关）

某些提供商支持在 API 调用触发提供商速率限制时，使用备用密钥重试请求。

- 优先级顺序：
  - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个覆盖）
  - `<PROVIDER>_API_KEYS`
  - `<PROVIDER>_API_KEY`
  - `<PROVIDER>_API_KEY_*`
- Google 提供商还会将 `GOOGLE_API_KEY` 作为额外回退项。
- 同一密钥列表在使用前会去重。
- 只有对速率限制错误，OpenClaw 才会使用下一个密钥重试（例如
  `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent
requests`、`ThrottlingException`、`concurrency limit reached` 或
  `workers_ai ... quota limit exceeded`）。
- 对于非速率限制错误，不会使用备用密钥重试。
- 如果所有密钥都失败，则返回最后一次尝试的最终错误。

## 控制使用哪一个凭证

### 按会话（聊天命令）

使用 `/model <alias-or-id>@<profileId>` 可为当前会话固定使用特定提供商凭证（示例配置档案 ID：`anthropic:default`、`anthropic:work`）。

使用 `/model`（或 `/model list`）可打开紧凑选择器；使用 `/model status` 可查看完整视图（候选项 + 下一个身份凭证配置档案，以及已配置时的提供商端点详情）。

### 按智能体（CLI 覆盖）

为某个智能体设置显式身份凭证配置档案顺序覆盖（存储在该智能体的 `auth-state.json` 中）：

```bash
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic
```

使用 `--agent <id>` 可指定某个智能体；省略它则使用配置的默认智能体。
调试顺序问题时，`openclaw models status --probe` 会将被省略的已存储配置档案显示为 `excluded_by_auth_order`，而不是静默跳过。
调试冷却问题时，请记住速率限制冷却可能绑定到某一个模型 ID，而不是整个提供商配置档案。

## 故障排除

### “No credentials found”

如果缺少 Anthropic 配置档案，请在**Gateway 网关主机**上配置 Anthropic API 密钥，或设置 Anthropic setup-token 路径，然后重新检查：

```bash
openclaw models status
```

### 令牌即将过期/已过期

运行 `openclaw models status` 以确认是哪个配置档案即将过期。如果某个 Anthropic 令牌配置档案缺失或已过期，请通过 setup-token 刷新该设置，或迁移到 Anthropic API 密钥。
