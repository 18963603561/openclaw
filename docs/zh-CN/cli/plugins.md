---
read_when:
    - 你想安装或管理 Gateway 网关 插件、兼容 bundle 或 hook 包
    - 你想调试插件加载失败
summary: '`openclaw plugins` 的 CLI 参考（list、install、marketplace、uninstall、enable/disable、doctor）'
title: plugins
x-i18n:
    generated_at: "2026-04-08T03:57:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: 8c35ccf68cd7be1af5fee175bd1ce7de88b81c625a05a23887e5780e790df925
    source_path: cli\plugins.md
    workflow: 15
---

# `openclaw plugins`

管理 Gateway 网关 插件/扩展、hook 包以及兼容 bundle。

相关内容：

- 插件系统：[??](/zh-CN/tools/plugin)
- Bundle 兼容性：[插件 Bundles](/zh-CN/plugins/bundles)
- 插件 manifest + schema：[插件清单](/zh-CN/plugins/manifest)
- 安全加固：[安全](/zh-CN/gateway/security)

## 命令

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
openclaw plugins install <path-or-spec>
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
openclaw plugins inspect --all
openclaw plugins info <id>
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins uninstall <id>
openclaw plugins doctor
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins marketplace list <marketplace>
openclaw plugins marketplace list <marketplace> --json
```

内置插件随 OpenClaw 一起发布。其中一些默认启用（例如
内置模型提供商、内置语音提供商以及内置浏览器
插件）；另一些则需要执行 `plugins enable`。

原生 OpenClaw 插件必须携带 `openclaw.plugin.json`，并带有内联 JSON
Schema（`configSchema`，即使为空也必须提供）。兼容 bundle 则使用它们自己的 bundle
manifest。

`plugins list` 会显示 `Format: openclaw` 或 `Format: bundle`。详细 list/info
输出还会显示 bundle 子类型（`codex`、`claude` 或 `cursor`）以及检测到的 bundle
能力。

### 安装

```bash
openclaw plugins install <package>                      # 先查 ClawHub，再查 npm
openclaw plugins install clawhub:<package>              # 仅 ClawHub
openclaw plugins install <package> --force              # 覆盖现有安装
openclaw plugins install <package> --pin                # 固定版本
openclaw plugins install <package> --dangerously-force-unsafe-install
openclaw plugins install <path>                         # 本地路径
openclaw plugins install <plugin>@<marketplace>         # marketplace
openclaw plugins install <plugin> --marketplace <name>  # marketplace（显式）
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
```

裸包名会先在 ClawHub 中检查，然后再查 npm。安全说明：
请像对待可执行代码一样对待插件安装。建议优先使用固定版本。

如果配置无效，`plugins install` 通常会以失败关闭方式结束，并提示你先
运行 `openclaw doctor --fix`。唯一记录在案的例外是一条狭义的
内置插件恢复路径，仅适用于那些显式选择加入
`openclaw.install.allowInvalidConfigRecovery` 的插件。

`--force` 会复用现有安装目标，并就地覆盖已安装的
插件或 hook 包。适用于你有意从新的本地路径、archive、ClawHub 包或 npm artifact
重新安装同一 id 的情况。

`--pin` 仅适用于 npm 安装。它不支持与 `--marketplace` 一起使用，
因为 marketplace 安装会持久化 marketplace 来源元数据，而不是
npm spec。

`--dangerously-force-unsafe-install` 是内置危险代码扫描器出现误报时的紧急开关选项。即使内置扫描器报告了 `critical` 级别问题，它也允许安装继续进行，但它**不会**绕过插件 `before_install` hook 的策略阻止，也**不会**绕过扫描失败。

这个 CLI 标志适用于插件 install/update 流程。由 Gateway 网关 支撑的 Skills
依赖安装会使用对应的 `dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是单独的 ClawHub Skills
下载/安装流程。

`plugins install` 也是用于安装在 `package.json` 中暴露
`openclaw.hooks` 的 hook 包的入口。请使用 `openclaw hooks` 进行按 hook
筛选的可见性查看和按 hook 启用，而不是用它来安装包。

Npm spec **仅支持 registry**（包名 + 可选的**精确版本**或
**dist-tag**）。Git/URL/file spec 和 semver 范围会被拒绝。依赖
安装会出于安全原因使用 `--ignore-scripts`。

裸 spec 和 `@latest` 会保持在稳定轨道。如果 npm 将这两者中的任意一种解析为 prerelease，OpenClaw 会停止并要求你显式选择加入，例如使用
`@beta`/`@rc` 这样的 prerelease tag，或使用诸如
`@1.2.3-beta.4` 这样的精确 prerelease 版本。

如果裸安装 spec 命中了某个内置插件 id（例如 `diffs`），OpenClaw
会直接安装该内置插件。如果你要安装同名 npm 包，请使用显式 scoped spec（例如 `@scope/diffs`）。

支持的 archive：`.zip`、`.tgz`、`.tar.gz`、`.tar`。

也支持 Claude marketplace 安装。

ClawHub 安装使用显式 `clawhub:<package>` 定位符：

```bash
openclaw plugins install clawhub:openclaw-codex-app-server
openclaw plugins install clawhub:openclaw-codex-app-server@1.2.3
```

OpenClaw 现在也会优先为安全的裸 npm 插件 spec 使用 ClawHub。只有在
ClawHub 没有该包或该版本时，它才会回退到 npm：

```bash
openclaw plugins install openclaw-codex-app-server
```

OpenClaw 会从 ClawHub 下载包 archive，检查其声明的
插件 API / 最低 gateway 兼容性，然后通过常规
archive 路径安装它。记录下来的安装会保留其 ClawHub 来源元数据，以便后续更新。

当 marketplace 名称存在于 Claude 的本地 registry 缓存 `~/.claude/plugins/known_marketplaces.json` 中时，可使用
`plugin@marketplace` 简写：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

如果你希望显式传入 marketplace 来源，请使用 `--marketplace`：

```bash
openclaw plugins install <plugin-name> --marketplace <marketplace-name>
openclaw plugins install <plugin-name> --marketplace <owner/repo>
openclaw plugins install <plugin-name> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <plugin-name> --marketplace ./my-marketplace
```

Marketplace 来源可以是：

- 来自 `~/.claude/plugins/known_marketplaces.json` 的 Claude 已知 marketplace 名称
- 本地 marketplace 根目录或 `marketplace.json` 路径
- 如 `owner/repo` 这样的 GitHub repo 简写
- 如 `https://github.com/owner/repo` 这样的 GitHub repo URL
- git URL

对于从 GitHub 或 git 加载的远程 marketplace，插件条目必须保留在 clone 下来的 marketplace repo 内。OpenClaw 接受来自该 repo 的相对路径来源，并拒绝来自远程 manifest 的 HTTP(S)、绝对路径、git、GitHub 以及其他非路径插件来源。

对于本地路径和 archive，OpenClaw 会自动检测：

- 原生 OpenClaw 插件（`openclaw.plugin.json`）
- Codex 兼容 bundles（`.codex-plugin/plugin.json`）
- Claude 兼容 bundles（`.claude-plugin/plugin.json` 或默认 Claude
  组件布局）
- Cursor 兼容 bundles（`.cursor-plugin/plugin.json`）

兼容 bundle 会安装到常规扩展根目录中，并参与相同的 list/info/enable/disable 流程。目前已支持 bundle Skills、Claude
command-skills、Claude `settings.json` 默认值、Claude `.lsp.json` /
manifest 声明的 `lspServers` 默认值、Cursor command-skills，以及兼容的
Codex hook 目录；其他检测到的 bundle 能力会在诊断/info 中显示，但尚未接入运行时执行。

### 列表

```bash
openclaw plugins list
openclaw plugins list --enabled
openclaw plugins list --verbose
openclaw plugins list --json
```

使用 `--enabled` 仅显示已加载插件。使用 `--verbose` 可从
表格视图切换为按插件显示的详细信息行，包含 source/origin/version/activation
元数据。使用 `--json` 获取机器可读的清单以及 registry
诊断信息。

使用 `--link` 可避免复制本地目录（会加入 `plugins.load.paths`）：

```bash
openclaw plugins install -l ./my-plugin
```

`--force` 不支持与 `--link` 一起使用，因为链接安装会复用
源路径，而不是覆盖式复制到受管安装目标。

在 npm 安装中使用 `--pin`，可将解析后的精确 spec（`name@version`）保存到
`plugins.installs` 中，而默认行为仍保持不固定版本。

### 卸载

```bash
openclaw plugins uninstall <id>
openclaw plugins uninstall <id> --dry-run
openclaw plugins uninstall <id> --keep-files
```

`uninstall` 会从 `plugins.entries`、`plugins.installs`、
插件 allowlist 以及相关联的 `plugins.load.paths` 条目中移除插件记录（如适用）。
对于活动中的 memory 插件，memory 槽位会重置为 `memory-core`。

默认情况下，卸载还会移除活动
state-dir 插件根目录下的插件安装目录。使用
`--keep-files` 可保留磁盘上的文件。

`--keep-config` 作为 `--keep-files` 的已弃用别名仍受支持。

### 更新

```bash
openclaw plugins update <id-or-npm-spec>
openclaw plugins update --all
openclaw plugins update <id-or-npm-spec> --dry-run
openclaw plugins update @openclaw/voice-call@beta
openclaw plugins update openclaw-codex-app-server --dangerously-force-unsafe-install
```

更新会应用到 `plugins.installs` 中跟踪的安装，以及 `hooks.internal.installs` 中跟踪的 hook 包安装。

当你传入插件 id 时，OpenClaw 会复用该
插件记录下来的安装 spec。这意味着此前保存的 dist-tag（如 `@beta`）以及精确固定版本，会继续用于后续的 `update <id>` 运行。

对于 npm 安装，你也可以传入带 dist-tag
或精确版本的显式 npm 包 spec。OpenClaw 会将该包名解析回已跟踪的插件
记录，更新该已安装插件，并记录新的 npm spec，以供后续基于
id 的更新使用。

当存在已存储的完整性 hash，且拉取到的 artifact hash 发生变化时，
OpenClaw 会打印警告并请求确认后再继续。在 CI/非交互运行中，请使用全局
`--yes` 跳过提示。

`--dangerously-force-unsafe-install` 在 `plugins update` 中同样可用，作为
插件更新期间内置危险代码扫描误报时的紧急覆盖开关。它仍然不会绕过插件 `before_install` 策略阻止
或扫描失败阻止，并且仅适用于插件更新，不适用于 hook 包更新。

### 检查

```bash
openclaw plugins inspect <id>
openclaw plugins inspect <id> --json
```

针对单个插件的深度检查。显示 identity、加载状态、source、
已注册能力、hooks、工具、命令、服务、gateway 方法、
HTTP 路由、策略标志、诊断信息、安装元数据、bundle 能力，
以及检测到的 MCP 或 LSP 服务器支持。

每个插件都会根据其在运行时实际注册的内容进行分类：

- **plain-capability** — 一种能力类型（例如仅 provider 的插件）
- **hybrid-capability** — 多种能力类型（例如文本 + 语音 + 图片）
- **hook-only** — 仅 hooks，没有能力或接口
- **non-capability** — 有工具/命令/服务，但没有能力

关于能力模型的更多信息，请参见 [插件形态](/zh-CN/plugins/architecture#plugin-shapes)。

`--json` 标志会输出适合脚本和审计使用的机器可读报告。

`inspect --all` 会渲染一个面向全量插件的表格，包含 shape、capability kinds、
兼容性说明、bundle 能力以及 hook 摘要列。

`info` 是 `inspect` 的别名。

### Doctor

```bash
openclaw plugins doctor
```

`doctor` 会报告插件加载错误、manifest/设备发现诊断信息，以及
兼容性说明。当一切正常时，它会打印 `No plugin issues
detected.`

### Marketplace

```bash
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json
```

Marketplace list 接受本地 marketplace 路径、`marketplace.json` 路径、
如 `owner/repo` 的 GitHub 简写、GitHub repo URL 或 git URL。`--json`
会打印解析后的来源标签，以及已解析的 marketplace manifest 和
插件条目。
