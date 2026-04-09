---
read_when:
    - 你想管理智能体 hooks
    - 你想检查 hook 可用性或启用工作区 hooks
summary: '`openclaw hooks` 的 CLI 参考（智能体 hooks）'
title: hooks
x-i18n:
    generated_at: "2026-04-08T03:52:32Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8dc9144e9844e9c3cdef2514098eb170543746fcc55ca5a1cc746c12d80209e7
    source_path: cli\hooks.md
    workflow: 15
---

# `openclaw hooks`

管理智能体 hooks（适用于 `/new`、`/reset` 和 Gateway 网关启动等命令的事件驱动自动化）。

不带子命令运行 `openclaw hooks` 等同于运行 `openclaw hooks list`。

相关内容：

- Hooks：[Hooks](/zh-CN/automation/hooks)
- 插件 hooks：[插件内部机制](/zh-CN/plugins/architecture#provider-runtime-hooks)

## 列出所有 hooks

```bash
openclaw hooks list
```

列出从工作区、托管、额外和内置目录中发现的所有 hooks。

**选项：**

- `--eligible`：仅显示符合条件的 hooks（要求已满足）
- `--json`：以 JSON 输出
- `-v, --verbose`：显示详细信息，包括缺失的要求

**示例输出：**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new or /reset command is issued
```

**示例（verbose）：**

```bash
openclaw hooks list --verbose
```

显示不符合条件的 hooks 所缺失的要求。

**示例（JSON）：**

```bash
openclaw hooks list --json
```

返回结构化 JSON，供编程使用。

## 获取 hook 信息

```bash
openclaw hooks info <name>
```

显示指定 hook 的详细信息。

**参数：**

- `<name>`：hook 名称或 hook 键（例如 `session-memory`）

**选项：**

- `--json`：以 JSON 输出

**示例：**

```bash
openclaw hooks info session-memory
```

**输出：**

```
💾 session-memory ✓ Ready

Save session context to memory when /new or /reset command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new, command:reset

Requirements:
  Config: ✓ workspace.dir
```

## 检查 hooks 资格状态

```bash
openclaw hooks check
```

显示 hook 资格状态摘要（有多少已就绪，多少未就绪）。

**选项：**

- `--json`：以 JSON 输出

**示例输出：**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## 启用 hook

```bash
openclaw hooks enable <name>
```

通过将指定 hook 添加到你的配置中来启用它（默认是 `~/.openclaw/openclaw.json`）。

**注意：** 工作区 hooks 默认禁用，必须在这里或配置中启用。由插件管理的 hooks 在 `openclaw hooks list` 中显示为 `plugin:<id>`，无法在这里启用 / 禁用。请改为启用 / 禁用对应插件。

**参数：**

- `<name>`：hook 名称（例如 `session-memory`）

**示例：**

```bash
openclaw hooks enable session-memory
```

**输出：**

```
✓ Enabled hook: 💾 session-memory
```

**它会执行以下操作：**

- 检查 hook 是否存在且符合条件
- 更新你配置中的 `hooks.internal.entries.<name>.enabled = true`
- 将配置保存到磁盘

如果该 hook 来自 `<workspace>/hooks/`，则在
Gateway 网关加载它之前，必须执行此显式启用步骤。

**启用之后：**

- 重启 Gateway 网关以重新加载 hooks（在 macOS 上重启菜单栏应用，或在开发环境中重启你的 Gateway 网关进程）。

## 禁用 hook

```bash
openclaw hooks disable <name>
```

通过更新你的配置来禁用指定 hook。

**参数：**

- `<name>`：hook 名称（例如 `command-logger`）

**示例：**

```bash
openclaw hooks disable command-logger
```

**输出：**

```
⏸ Disabled hook: 📝 command-logger
```

**禁用之后：**

- 重启 Gateway 网关以重新加载 hooks

## 说明

- `openclaw hooks list --json`、`info --json` 和 `check --json` 会将结构化 JSON 直接写入 stdout。
- 由插件管理的 hooks 无法在这里启用或禁用；请改为启用或禁用其所属插件。

## 安装 hook 包

```bash
openclaw plugins install <package>        # ClawHub first, then npm
openclaw plugins install <package> --pin  # pin version
openclaw plugins install <path>           # local path
```

通过统一的插件安装器安装 hook 包。

`openclaw hooks install` 仍可作为兼容别名使用，但它会打印弃用警告，并转发到 `openclaw plugins install`。

npm 规格是**仅 registry** 的（包名 + 可选的**精确版本**或 **dist-tag**）。
Git / URL / 文件规格以及 semver 范围会被拒绝。出于安全原因，
依赖安装会使用 `--ignore-scripts` 运行。

裸规格和 `@latest` 会保持在稳定轨道。如果 npm 将这两者中的任意一种解析为预发布版本，
OpenClaw 会停止并要求你通过显式的预发布标签（例如 `@beta` / `@rc`）
或精确的预发布版本来明确选择加入。

**它会执行以下操作：**

- 将 hook 包复制到 `~/.openclaw/hooks/<id>`
- 在 `hooks.internal.entries.*` 中启用已安装的 hooks
- 在 `hooks.internal.installs` 下记录此次安装

**选项：**

- `-l, --link`：链接本地目录而不是复制（将其添加到 `hooks.internal.load.extraDirs`）
- `--pin`：将 npm 安装以精确解析后的 `name@version` 记录到 `hooks.internal.installs` 中

**支持的归档格式：** `.zip`、`.tgz`、`.tar.gz`、`.tar`

**示例：**

```bash
# Local directory
openclaw plugins install ./my-hook-pack

# Local archive
openclaw plugins install ./my-hook-pack.zip

# NPM package
openclaw plugins install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw plugins install -l ./my-hook-pack
```

链接的 hook 包会被视为来自操作员配置目录的托管 hooks，
而不是工作区 hooks。

## 更新 hook 包

```bash
openclaw plugins update <id>
openclaw plugins update --all
```

通过统一的插件更新器更新已跟踪的基于 npm 的 hook 包。

`openclaw hooks update` 仍可作为兼容别名使用，但它会打印弃用警告，并转发到 `openclaw plugins update`。

**选项：**

- `--all`：更新所有已跟踪的 hook 包
- `--dry-run`：显示将会发生的变化，但不实际写入

当存在已存储的完整性哈希且获取到的制品哈希发生变化时，
OpenClaw 会打印警告并在继续前请求确认。在 CI / 非交互运行中，
可使用全局 `--yes` 跳过提示。

## 内置 hooks

### session-memory

当你发出 `/new` 或 `/reset` 时，将会话上下文保存到 memory。

**启用：**

```bash
openclaw hooks enable session-memory
```

**输出：** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`

**参见：** [Hooks](/zh-CN/automation/hooks#session-memory)

### bootstrap-extra-files

在 `agent:bootstrap` 期间注入额外的 bootstrap 文件（例如 monorepo 本地的 `AGENTS.md` / `TOOLS.md`）。

**启用：**

```bash
openclaw hooks enable bootstrap-extra-files
```

**参见：** [Hooks](/zh-CN/automation/hooks#bootstrap-extra-files)

### command-logger

将所有命令事件记录到集中式审计文件。

**启用：**

```bash
openclaw hooks enable command-logger
```

**输出：** `~/.openclaw/logs/commands.log`

**查看日志：**

```bash
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.openclaw/logs/commands.log | jq .
```

**参见：** [Hooks](/zh-CN/automation/hooks#command-logger)

### boot-md

在 Gateway 网关启动时运行 `BOOT.md`（在渠道启动之后）。

**事件**：`gateway:startup`

**启用：**

```bash
openclaw hooks enable boot-md
```

**参见：** [Hooks](/zh-CN/automation/hooks#boot-md)
