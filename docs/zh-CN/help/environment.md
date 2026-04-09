---
read_when:
    - 你需要了解会加载哪些环境变量，以及加载顺序
    - 你正在排查 Gateway 网关中缺失的 API 密钥
    - 你正在为提供商认证或部署环境编写文档
summary: OpenClaw 从哪里加载环境变量，以及优先级顺序
title: 环境变量
x-i18n:
    generated_at: "2026-04-08T05:54:31Z"
    model: gpt-5.4
    provider: openai
    source_hash: a80aea69ca2ffe19a4e93140f05dd81fd576955562ff9913135d38a685a0353c
    source_path: help\environment.md
    workflow: 15
---

# 环境变量

OpenClaw 会从多个来源获取环境变量。规则是：**绝不覆盖现有值**。

## 优先级（从高到低）

1. **进程环境变量**（Gateway 网关进程已经从父 shell/守护进程继承到的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认行为；不会覆盖）。
3. **全局 `.env`**，位于 `~/.openclaw/.env`（也就是 `$OPENCLAW_STATE_DIR/.env`；不会覆盖）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅对缺失的预期键名生效。

在使用默认状态目录的 Ubuntu 全新安装中，OpenClaw 还会在全局 `.env` 之后，将 `~/.config/openclaw/gateway.env` 视为兼容性回退来源。如果两个文件都存在且内容冲突，OpenClaw 会保留 `~/.openclaw/.env`，并打印警告。

如果配置文件完全缺失，则会跳过第 4 步；如果启用了 shell 导入，第 5 步仍会执行。

## 配置 `env` 块

有两种等价方式可用于设置内联环境变量（两者都不会覆盖现有值）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## shell 环境导入

`env.shellEnv` 会运行你的登录 shell，并仅导入**缺失的**预期键名：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

对应的环境变量：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 运行时注入的环境变量

OpenClaw 还会向派生的子进程中注入上下文标记：

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端派生的进程设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：为 `openclaw acp client` 在派生 ACP bridge 进程时设置。
- `OPENCLAW_SHELL=tui-local`：为本地 TUI `!` shell 命令设置。

这些是运行时标记（不是用户必须配置的内容）。它们可用于 shell/profile 逻辑中，
以应用特定上下文规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当你的终端使用浅色背景时，强制 TUI 使用浅色调色板。
- `OPENCLAW_THEME=dark`：强制 TUI 使用深色调色板。
- `COLORFGBG`：如果你的终端导出了它，OpenClaw 会使用背景颜色提示来自动选择 TUI 调色板。

## 配置中的环境变量替换

你可以在配置字符串值中使用 `${VAR_NAME}` 语法直接引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

完整说明请参见 [Configuration: Env var substitution](/gateway/configuration-reference#env-var-substitution)。

## Secret refs 与 `${ENV}` 字符串

OpenClaw 支持两种由环境变量驱动的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 对支持 secrets 引用的字段，使用 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者都会在激活时从进程环境变量中解析。SecretRef 详情请参见 [Secrets Management](/zh-CN/gateway/secrets)。

## 与路径相关的环境变量

| 变量                   | 用途 |
| ---------------------- | ---- |
| `OPENCLAW_HOME`        | 覆盖所有内部路径解析所使用的主目录（`~/.openclaw/`、智能体目录、会话、凭证）。当你以专用服务用户运行 OpenClaw 时非常有用。 |
| `OPENCLAW_STATE_DIR`   | 覆盖状态目录（默认为 `~/.openclaw`）。 |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认为 `~/.openclaw/openclaw.json`）。 |

## 日志

| 变量                 | 用途 |
| -------------------- | ---- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。其优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略，并打印警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替代系统主目录（`$HOME` / `os.homedir()`），用于所有内部路径解析。这样可以为无头服务账号提供完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为带波浪号的路径（例如 `~/svc`），在使用前会先通过 `$HOME` 展开。

## nvm 用户：`web_fetch` TLS 失败

如果 Node.js 是通过 **nvm** 安装的（而不是系统包管理器），内置 `fetch()` 使用的是
nvm 自带的 CA 存储，其中可能缺少现代根 CA（例如 Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。这会导致 `web_fetch` 在大多数 HTTPS 站点上因 `"fetch failed"` 而失败。

在 Linux 上，OpenClaw 会自动检测 nvm，并在实际启动环境中应用修复：

- `openclaw gateway install` 会将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口点会在 Node 启动前使用已设置 `NODE_EXTRA_CA_CERTS` 的环境重新执行自身

**手动修复方法**（适用于旧版本或直接通过 `node ...` 启动）：

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要只依赖将该变量写入 `~/.openclaw/.env`；Node 会在进程启动时读取
`NODE_EXTRA_CA_CERTS`。

## 相关内容

- [Gateway configuration](/zh-CN/gateway/configuration)
- [FAQ: env vars and .env loading](/zh-CN/help/faq#env-vars-and-env-loading)
- [Models overview](/zh-CN/concepts/models)
