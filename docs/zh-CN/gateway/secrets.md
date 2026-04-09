---
read_when:
    - 为提供商凭证和 `auth-profiles.json` 引用配置 SecretRefs
    - 在生产环境中安全地执行 secrets 重新加载、审计、配置和应用
    - 理解启动时快速失败、非活动表面过滤和最后一次已知良好行为
summary: Secrets 管理：SecretRef 契约、运行时快照行为，以及安全的单向清除
title: Secrets 管理
x-i18n:
    generated_at: "2026-04-08T05:51:16Z"
    model: gpt-5.4
    provider: openai
    source_hash: b91778cb7801fe24f050c15c0a9dd708dda91cb1ce86096e6bae57ebb6e0d41d
    source_path: gateway\secrets.md
    workflow: 15
---

# Secrets 管理

OpenClaw 支持增量式 SecretRefs，因此受支持的凭证无需以明文形式存储在配置中。

明文仍然可用。SecretRefs 对每个凭证都是可选启用的。

## 目标和运行时模型

Secrets 会被解析到内存中的运行时快照里。

- 解析会在激活期间急切执行，而不是在请求路径中延迟执行。
- 当实际上处于活动状态的 SecretRef 无法解析时，启动会快速失败。
- 重新加载使用原子交换：要么完全成功，要么保留最后一次已知良好的快照。
- SecretRef 策略违规（例如 OAuth 模式的认证配置与 SecretRef 输入组合使用）会在运行时快照交换前导致激活失败。
- 运行时请求只从活动的内存快照中读取。
- 在第一次成功的配置激活/加载之后，运行时代码路径会持续读取该活动的内存快照，直到成功的重新加载将其替换。
- 出站传递路径也会从该活动快照中读取（例如 Discord 回复/线程传递和 Telegram 动作发送）；它们不会在每次发送时重新解析 SecretRefs。

这样可以让 secret 提供商故障远离高频请求路径。

## 活动表面过滤

只有实际上处于活动状态的表面才会校验 SecretRefs。

- 已启用的表面：未解析的引用会阻止启动/重新加载。
- 非活动表面：未解析的引用不会阻止启动/重新加载。
- 非活动引用会发出非致命诊断，代码为 `SECRETS_REF_IGNORED_INACTIVE_SURFACE`。

非活动表面的示例：

- 已禁用的渠道/账号条目。
- 没有任何启用账号继承的顶层渠道凭证。
- 已禁用的工具/功能表面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供商专用键。
  在自动模式下（未设置 provider），系统会按优先级依次检查这些键，以进行提供商自动检测，直到其中一个成功解析。
  选择完成后，未被选中的提供商键会被视为非活动，直到被选中。
- 沙箱 SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、
  `certificateData`、`knownHostsData`，以及每个智能体的覆盖项）仅在默认智能体或某个已启用智能体的有效沙箱后端为 `ssh` 时处于活动状态。
- 如果以下任一条件为真，`gateway.remote.token` / `gateway.remote.password` SecretRefs 处于活动状态：
  - `gateway.mode=remote`
  - 已配置 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在本地模式且不存在这些远程表面时：
    - 当 token 认证可能胜出且未配置 env/auth token 时，`gateway.remote.token` 处于活动状态。
    - 只有当 password 认证可能胜出且未配置 env/auth password 时，`gateway.remote.password` 才处于活动状态。
- 当设置了 `OPENCLAW_GATEWAY_TOKEN` 时，`gateway.auth.token` SecretRef 对启动认证解析来说是非活动的，因为该运行时会优先使用 env token 输入。

## Gateway 网关认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、
`gateway.remote.token` 或 `gateway.remote.password` 上配置 SecretRef 时，Gateway 网关启动/重新加载日志会明确记录表面状态：

- `active`：SecretRef 是有效认证表面的一部分，必须成功解析。
- `inactive`：该 SecretRef 会在当前运行时中被忽略，因为有其他认证表面优先，或者因为远程认证已禁用/未激活。

这些条目会使用 `SECRETS_GATEWAY_AUTH_SURFACE` 进行记录，并包含活动表面策略所使用的原因，因此你可以看到某个凭证为何被视为活动或非活动。

## 新手引导引用预检

当新手引导以交互模式运行并且你选择 SecretRef 存储时，OpenClaw 会在保存前执行预检校验：

- Env 引用：校验 env var 名称，并确认在设置期间可见非空值。
- 提供商引用（`file` 或 `exec`）：校验提供商选择、解析 `id`，并检查解析后的值类型。
- 快速开始复用路径：当 `gateway.auth.token` 已经是一个 SecretRef 时，新手引导会在 probe/dashboard 引导前先解析它（适用于 `env`、`file` 和 `exec` 引用），并使用相同的快速失败门控。

如果校验失败，新手引导会显示错误并允许你重试。

## SecretRef 契约

在所有地方都使用同一种对象结构：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

校验规则：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须是绝对 JSON 指针（`/...`）
- 分段中的 RFC6901 转义：`~` => `~0`，`/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

校验规则：

- `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
- `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` 不能包含作为斜杠分隔路径段的 `.` 或 `..`（例如 `a/../b` 会被拒绝）

## 提供商配置

在 `secrets.providers` 下定义提供商：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### Env 提供商

- 可通过 `allowlist` 配置可选允许列表。
- 缺失/空的 env 值会导致解析失败。

### File 提供商

- 从 `path` 读取本地文件。
- `mode: "json"` 期望 JSON 对象负载，并将 `id` 解析为指针。
- `mode: "singleValue"` 期望引用 id 为 `"value"`，并返回文件内容。
- 路径必须通过所有权/权限检查。
- Windows 故障关闭说明：如果某个路径无法进行 ACL 校验，则解析失败。仅针对受信任路径，可在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

### Exec 提供商

- 运行已配置的绝对二进制路径，不通过 shell。
- 默认情况下，`command` 必须指向常规文件（不能是符号链接）。
- 设置 `allowSymlinkCommand: true` 以允许符号链接命令路径（例如 Homebrew shim）。
- 将 `allowSymlinkCommand` 与 `trustedDirs` 搭配使用，以支持包管理器路径（例如 `["/opt/homebrew"]`）。
- 支持超时、无输出超时、输出字节限制、env 允许列表和受信任目录。
- Windows 故障关闭说明：如果命令路径无法进行 ACL 校验，则解析失败。仅针对受信任路径，可在该提供商上设置 `allowInsecurePath: true` 以绕过路径安全检查。

请求负载（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应负载（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

可选的按 id 返回错误：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Exec 集成示例

### 1Password CLI

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### HashiCorp Vault CLI

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## MCP 服务器环境变量

通过 `plugins.entries.acpx.config.mcpServers` 配置的 MCP 服务器环境变量支持 SecretInput。这样可以避免 API key 和 token 以明文形式出现在配置中：

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

明文字符串值仍然可用。像 `${MCP_SERVER_API_KEY}` 这样的 env-template 引用和 SecretRef 对象会在 Gateway 网关激活期间、MCP 服务器进程启动之前被解析。与其他 SecretRef 表面一样，只有在 `acpx` 插件实际上处于活动状态时，未解析的引用才会阻止激活。

## 沙箱 SSH 认证材料

核心 `ssh` 沙箱后端也支持用于 SSH 认证材料的 SecretRefs：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

运行时行为：

- OpenClaw 会在沙箱激活期间解析这些引用，而不是在每次 SSH 调用时延迟解析。
- 解析后的值会被写入具有严格权限的临时文件，并用于生成的 SSH 配置中。
- 如果有效的沙箱后端不是 `ssh`，这些引用会保持非活动状态，不会阻止启动。

## 支持的凭证表面

规范的受支持和不受支持凭证列表见：

- [SecretRef ?????](/zh-CN/reference/secretref-credential-surface)

运行时铸造或轮换的凭证以及 OAuth 刷新材料被有意排除在只读 SecretRef 解析之外。

## 必需行为和优先级

- 没有引用的字段：保持不变。
- 带引用的字段：在激活期间，对于活动表面是必需的。
- 如果明文和引用同时存在，在受支持的优先级路径上，引用优先。
- 脱敏哨兵值 `__OPENCLAW_REDACTED__` 保留用于内部配置脱敏/恢复，不接受作为字面提交的配置数据。

警告和审计信号：

- `SECRETS_REF_OVERRIDES_PLAINTEXT`（运行时警告）
- `REF_SHADOWED`（当 `auth-profiles.json` 凭证优先于 `openclaw.json` 引用时的审计发现）

Google Chat 兼容性行为：

- `serviceAccountRef` 优先于明文 `serviceAccount`。
- 当设置了同级引用时，明文值会被忽略。

## 激活触发器

Secret 激活会在以下情况下运行：

- 启动时（预检加最终激活）
- 配置重新加载热应用路径
- 配置重新加载重启检查路径
- 通过 `secrets.reload` 手动重新加载
- Gateway 网关配置写入 RPC 预检（`config.set` / `config.apply` / `config.patch`），用于在持久化编辑前校验提交配置负载中活动表面的 SecretRef 可解析性

激活契约：

- 成功时会原子性地交换快照。
- 启动失败会中止 Gateway 网关启动。
- 运行时重新加载失败会保留最后一次已知良好的快照。
- 写入 RPC 预检失败会拒绝提交的配置，并保持磁盘配置和活动运行时快照都不变。
- 为出站辅助器/工具调用提供显式的每次调用渠道 token 不会触发 SecretRef 激活；激活点仍然是启动、重新加载和显式 `secrets.reload`。

## 降级和恢复信号

当健康状态之后的重新加载激活失败时，OpenClaw 会进入 secrets 降级状态。

一次性系统事件和日志代码：

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

行为：

- 降级：运行时会保留最后一次已知良好的快照。
- 恢复：在下一次成功激活后仅发出一次。
- 当已处于降级状态时，重复失败会记录警告，但不会刷屏式地产生事件。
- 启动时快速失败不会发出降级事件，因为运行时从未变为活动状态。

## 命令路径解析

命令路径可以选择通过 Gateway 网关快照 RPC 使用受支持的 SecretRef 解析。

大致有两种行为：

- 严格命令路径（例如 `openclaw memory` 远程 memory 路径，以及在需要远程共享 secret 引用时的 `openclaw qr --remote`）会从活动快照中读取，并在必需的 SecretRef 不可用时快速失败。
- 只读命令路径（例如 `openclaw status`、`openclaw status --all`、`openclaw channels status`、`openclaw channels resolve`、`openclaw security audit`，以及只读的 Doctor/config repair 流程）也会优先使用活动快照，但当该命令路径中的目标 SecretRef 不可用时，会降级而不是中止。

只读行为：

- 当 Gateway 网关正在运行时，这些命令会先从活动快照中读取。
- 如果 Gateway 网关解析不完整或 Gateway 网关不可用，它们会针对具体命令表面尝试有针对性的本地回退。
- 如果目标 SecretRef 仍然不可用，命令会继续输出降级的只读结果，并带有明确诊断，例如“已配置但在此命令路径中不可用”。
- 这种降级行为仅限于命令本地。它不会削弱运行时启动、重新加载或发送/认证路径。

其他说明：

- secret 后端轮换后的快照刷新由 `openclaw secrets reload` 处理。
- 这些命令路径使用的 Gateway 网关 RPC 方法：`secrets.resolve`。

## 审计和配置工作流

默认的操作员流程：

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

发现项包括：

- 静态明文值（位于 `openclaw.json`、`auth-profiles.json`、`.env` 和生成的 `agents/*/agent/models.json` 中）
- 生成的 `models.json` 条目中以明文残留的敏感提供商 header
- 未解析的引用
- 优先级遮蔽（`auth-profiles.json` 优先于 `openclaw.json` 引用）
- 旧版残留（`auth.json`、OAuth 提醒）

Exec 说明：

- 默认情况下，为避免命令副作用，审计会跳过 exec SecretRef 可解析性检查。
- 使用 `openclaw secrets audit --allow-exec` 可在审计期间执行 exec 提供商。

Header 残留说明：

- 敏感提供商 header 检测基于名称启发式规则（常见认证/凭证 header 名称及片段，例如 `authorization`、`x-api-key`、`token`、`secret`、`password` 和 `credential`）。

### `secrets configure`

交互式辅助器，功能包括：

- 先配置 `secrets.providers`（`env`/`file`/`exec`，添加/编辑/删除）
- 允许你为一个智能体作用域选择 `openclaw.json` 和 `auth-profiles.json` 中受支持的含 secret 字段
- 可以直接在目标选择器中创建新的 `auth-profiles.json` 映射
- 收集 SecretRef 细节（`source`、`provider`、`id`）
- 运行预检解析
- 可以立即应用

Exec 说明：

- 除非设置了 `--allow-exec`，否则预检会跳过 exec SecretRef 检查。
- 如果你直接通过 `configure --apply` 应用，并且计划中包含 exec 引用/提供商，则在应用步骤中也要保持设置 `--allow-exec`。

有用模式：

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` 应用默认行为：

- 清除 `auth-profiles.json` 中目标提供商的匹配静态凭证
- 清除 `auth.json` 中旧版静态 `api_key` 条目
- 清除 `<config-dir>/.env` 中匹配的已知 secret 行

### `secrets apply`

应用已保存的计划：

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
```

Exec 说明：

- dry-run 会跳过 exec 检查，除非设置了 `--allow-exec`。
- 写入模式会拒绝包含 exec SecretRefs/提供商的计划，除非设置了 `--allow-exec`。

有关严格的目标/路径契约细节和精确拒绝规则，请参见：

- [Secrets Apply 计划契约](/zh-CN/gateway/secrets-plan-contract)

## 单向安全策略

OpenClaw 有意不写入包含历史明文 secret 值的回滚备份。

安全模型：

- 写入模式之前，预检必须成功
- 提交之前会校验运行时激活
- apply 使用原子文件替换更新文件，并在失败时尽最大努力恢复

## 旧版认证兼容性说明

对于静态凭证，运行时不再依赖明文旧版认证存储。

- 运行时凭证来源是已解析的内存快照。
- 发现旧版静态 `api_key` 条目时会进行清除。
- 与 OAuth 相关的兼容性行为仍然是独立的。

## Web UI 说明

某些 SecretInput 联合类型在原始编辑器模式下比在表单模式下更容易配置。

## 相关文档

- CLI 命令：[secrets](/zh-CN/cli/secrets)
- 计划契约详情：[Secrets Apply 计划契约](/zh-CN/gateway/secrets-plan-contract)
- 凭证表面：[SecretRef ?????](/zh-CN/reference/secretref-credential-surface)
- 认证设置：[??](/zh-CN/gateway/authentication)
- 安全态势：[??](/zh-CN/gateway/security)
- 环境优先级：[环境变量](/zh-CN/help/environment)
