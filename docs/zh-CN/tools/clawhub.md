---
read_when:
    - 向新用户介绍 ClawHub
    - 安装、搜索或发布 Skills 或插件
    - 解释 ClawHub CLI 标志和同步行为
summary: ClawHub 指南：公共注册表、原生 OpenClaw 安装流程，以及 ClawHub CLI 工作流
title: ClawHub
x-i18n:
    generated_at: "2026-04-09T00:53:33Z"
    model: gpt-5.4
    provider: openai
    source_hash: e65b3fd770ca96a5dd828dce2dee4ef127268f4884180a912f43d7744bc5706f
    source_path: tools\clawhub.md
    workflow: 15
---

# ClawHub

ClawHub 是 **OpenClaw Skills 和插件**的公共注册表。

- 使用原生 `openclaw` 命令搜索 / 安装 / 更新 Skills，并从 ClawHub 安装
  插件。
- 当你需要注册表认证、发布、删除、恢复删除或同步工作流时，使用独立的
  `clawhub` CLI。

网站：[clawhub.ai](https://clawhub.ai)

## 原生 OpenClaw 流程

Skills：

```bash
openclaw skills search "calendar"
openclaw skills install <skill-slug>
openclaw skills update --all
```

插件：

```bash
openclaw plugins install clawhub:<package>
openclaw plugins update --all
```

不带前缀且符合 npm 安全格式的插件描述符，也会在 npm 之前先尝试从 ClawHub 解析：

```bash
openclaw plugins install openclaw-codex-app-server
```

原生 `openclaw` 命令会安装到你当前激活的工作区，并持久化来源元数据，
这样后续的 `update` 调用就可以继续使用 ClawHub。

插件安装会在归档安装运行前校验声明的 `pluginApi` 和 `minGatewayVersion`
兼容性，因此对于不兼容的主机环境，会尽早以封闭失败方式终止，而不是部分安装完包后才失败。

`openclaw plugins install clawhub:...` 只接受可安装的插件类别。
如果某个 ClawHub 包实际上是一个 Skill，OpenClaw 会停止安装，并提示你改用
`openclaw skills install <slug>`。

## ClawHub 是什么

- 一个面向 OpenClaw Skills 和插件的公共注册表。
- 一个用于存储 Skill 包和元数据的版本化仓库。
- 一个用于搜索、标签和使用信号的发现入口。

## 它如何工作

1. 用户发布一个 Skill 包（文件 + 元数据）。
2. ClawHub 存储该包，解析元数据，并分配一个版本。
3. 注册表为该 Skill 建立索引，以便搜索和发现。
4. 用户在 OpenClaw 中浏览、下载并安装 Skills。

## 你可以做什么

- 发布新的 Skills，以及现有 Skills 的新版本。
- 按名称、标签或搜索发现 Skills。
- 下载 Skill 包并检查其文件。
- 举报存在滥用或不安全行为的 Skills。
- 如果你是版主，可以隐藏、取消隐藏、删除或封禁。

## 适用人群（对初学者友好）

如果你想为你的 OpenClaw 智能体添加新能力，ClawHub 是查找和安装 Skills 的最简单方式。你不需要了解后端如何工作。你可以：

- 用自然语言搜索 Skills。
- 将一个 Skill 安装到你的工作区中。
- 之后用一条命令更新 Skills。
- 通过发布自己的 Skills 来备份它们。

## 快速开始（非技术向）

1. 搜索你需要的内容：
   - `openclaw skills search "calendar"`
2. 安装一个 Skill：
   - `openclaw skills install <skill-slug>`
3. 启动一个新的 OpenClaw 会话，以便加载新 Skill。
4. 如果你想发布内容或管理注册表认证，也请额外安装独立的
   `clawhub` CLI。

## 安装 ClawHub CLI

只有在你需要使用注册表认证工作流（例如发布 / 同步）时，才需要它：

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

## 它如何融入 OpenClaw

原生 `openclaw skills install` 会安装到当前工作区的 `skills/`
目录。`openclaw plugins install clawhub:...` 会记录一次普通的受管插件安装，
并附带用于后续更新的 ClawHub 来源元数据。

匿名的 ClawHub 插件安装对于私有包同样会以封闭失败方式终止。
社区版或其他非官方渠道仍然可以安装，但 OpenClaw 会发出警告，
以便操作者在启用前审查来源和验证情况。

独立的 `clawhub` CLI 也会把 Skills 安装到当前工作目录下的 `./skills` 中。
如果已经配置了 OpenClaw 工作区，`clawhub` 会回退到该工作区，除非你使用
`--workdir`（或 `CLAWHUB_WORKDIR`）覆盖。OpenClaw 会从 `<workspace>/skills`
加载工作区 Skills，并会在**下一次**会话中拾取它们。如果你已经在使用
`~/.openclaw/skills` 或内置 Skills，则工作区 Skills 具有更高优先级。

关于 Skills 如何被加载、共享和受控的更多细节，请参见
[Skills](/zh-CN/tools/skills)。

## Skill 系统概览

Skill 是一个版本化的文件包，用于教会 OpenClaw 如何执行特定任务。
每次发布都会创建一个新版本，注册表会保留版本历史，以便用户审计变更。

一个典型的 Skill 包括：

- 一个 `SKILL.md` 文件，其中包含主要说明和用法。
- Skill 使用的可选配置、脚本或支持文件。
- 标签、摘要和安装要求等元数据。

ClawHub 使用元数据来支持发现能力，并以安全方式暴露 Skill 能力。
注册表还会跟踪使用信号（例如收藏和下载），以改进排序和可见性。

## 该服务提供什么（功能）

- **公开浏览** Skills 及其 `SKILL.md` 内容。
- 由 embeddings（向量搜索）驱动的**搜索**，而不仅仅是关键词搜索。
- 使用 semver、变更日志和标签（包括 `latest`）进行**版本管理**。
- 每个版本可下载为一个 zip 的**下载**能力。
- 用于社区反馈的**收藏和评论**。
- 用于审批和审计的**审核**钩子。
- 适合自动化和脚本使用的 **CLI 友好 API**。

## 安全与审核

ClawHub 默认是开放的。任何人都可以上传 Skills，但发布者的 GitHub 账号
必须至少注册满一周。这有助于减缓滥用，同时又不会阻止合法贡献者。

举报与审核：

- 任何已登录用户都可以举报一个 Skill。
- 举报原因是必填项，并会被记录。
- 每位用户同时最多只能有 20 条活跃举报。
- 被超过 3 名不同用户举报的 Skill 默认会被自动隐藏。
- 版主可以查看已隐藏 Skills、取消隐藏、删除它们，或封禁用户。
- 滥用举报功能可能导致账号被封禁。

有兴趣成为版主吗？请到 OpenClaw Discord 中询问，并联系版主或维护者。

## CLI 命令与参数

全局选项（适用于所有命令）：

- `--workdir <dir>`：工作目录（默认：当前目录；会回退到 OpenClaw 工作区）。
- `--dir <dir>`：Skills 目录，相对于 workdir（默认：`skills`）。
- `--site <url>`：站点基础 URL（浏览器登录）。
- `--registry <url>`：注册表 API 基础 URL。
- `--no-input`：禁用提示（非交互模式）。
- `-V, --cli-version`：打印 CLI 版本。

认证：

- `clawhub login`（浏览器流程）或 `clawhub login --token <token>`
- `clawhub logout`
- `clawhub whoami`

选项：

- `--token <token>`：粘贴一个 API token。
- `--label <label>`：为浏览器登录 token 存储的标签（默认：`CLI token`）。
- `--no-browser`：不打开浏览器（需要 `--token`）。

搜索：

- `clawhub search "query"`
- `--limit <n>`：最大结果数。

安装：

- `clawhub install <slug>`
- `--version <version>`：安装指定版本。
- `--force`：如果文件夹已存在则覆盖。

更新：

- `clawhub update <slug>`
- `clawhub update --all`
- `--version <version>`：更新到指定版本（仅适用于单个 slug）。
- `--force`：当本地文件与任何已发布版本都不匹配时进行覆盖。

列表：

- `clawhub list`（读取 `.clawhub/lock.json`）

发布 Skills：

- `clawhub skill publish <path>`
- `--slug <slug>`：Skill slug。
- `--name <name>`：显示名称。
- `--version <version>`：semver 版本。
- `--changelog <text>`：变更日志文本（可以为空）。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。

发布插件：

- `clawhub package publish <source>`
- `<source>` 可以是本地文件夹、`owner/repo`、`owner/repo@ref` 或 GitHub URL。
- `--dry-run`：构建精确的发布计划，但不上传任何内容。
- `--json`：输出供 CI 使用的机器可读结果。
- `--source-repo`、`--source-commit`、`--source-ref`：当自动检测不足时使用的可选覆盖项。

删除 / 恢复删除（仅所有者 / 管理员）：

- `clawhub delete <slug> --yes`
- `clawhub undelete <slug> --yes`

同步（扫描本地 Skills + 发布新增 / 更新内容）：

- `clawhub sync`
- `--root <dir...>`：额外扫描根目录。
- `--all`：不提示，直接上传全部内容。
- `--dry-run`：显示将要上传的内容。
- `--bump <type>`：更新时使用 `patch|minor|major`（默认：`patch`）。
- `--changelog <text>`：非交互式更新时的变更日志。
- `--tags <tags>`：逗号分隔的标签（默认：`latest`）。
- `--concurrency <n>`：注册表检查并发数（默认：4）。

## 面向智能体的常见工作流

### 搜索 Skills

```bash
clawhub search "postgres backups"
```

### 下载新的 Skills

```bash
clawhub install my-skill-pack
```

### 更新已安装 Skills

```bash
clawhub update --all
```

### 备份你的 Skills（发布或同步）

对于单个 Skill 文件夹：

```bash
clawhub skill publish ./my-skill --slug my-skill --name "My Skill" --version 1.0.0 --tags latest
```

一次扫描并备份多个 Skills：

```bash
clawhub sync --all
```

### 从 GitHub 发布一个插件

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
clawhub package publish https://github.com/your-org/your-plugin
```

代码插件必须在 `package.json` 中包含必需的 OpenClaw 元数据：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2",
      "minGatewayVersion": "2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2",
      "pluginSdkVersion": "2026.3.24-beta.2"
    }
  }
}
```

## 高级细节（技术向）

### 版本管理与标签

- 每次发布都会创建一个新的 **semver** `SkillVersion`。
- 标签（例如 `latest`）会指向某个版本；移动标签可以让你回滚。
- 在同步或发布更新时，变更日志按版本附加，也可以为空。

### 本地变更与注册表版本

更新时会使用内容哈希将本地 Skill 内容与注册表版本进行比较。如果本地文件与任何已发布版本都不匹配，CLI 会在覆盖前发出询问（或在非交互运行中要求使用 `--force`）。

### 同步扫描与回退根目录

`clawhub sync` 会先扫描你当前的 workdir。如果没有找到 Skills，它会回退到已知的旧版位置（例如 `~/openclaw/skills` 和 `~/.openclaw/skills`）。这样设计是为了在不添加额外标志的情况下找到较早安装的 Skills。

### 存储与锁文件

- 已安装 Skills 会记录在 workdir 下的 `.clawhub/lock.json` 中。
- 认证 token 存储在 ClawHub CLI 配置文件中（可通过 `CLAWHUB_CONFIG_PATH` 覆盖）。

### Telemetry（安装计数）

当你在已登录状态下运行 `clawhub sync` 时，CLI 会发送一个最小快照来计算安装次数。你可以完全禁用此功能：

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

## 环境变量

- `CLAWHUB_SITE`：覆盖站点 URL。
- `CLAWHUB_REGISTRY`：覆盖注册表 API URL。
- `CLAWHUB_CONFIG_PATH`：覆盖 CLI 存储 token / 配置的位置。
- `CLAWHUB_WORKDIR`：覆盖默认 workdir。
- `CLAWHUB_DISABLE_TELEMETRY=1`：在 `sync` 时禁用 Telemetry。
