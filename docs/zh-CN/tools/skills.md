---
read_when:
    - 添加或修改 Skills
    - 更改 Skill gating 或加载规则
summary: Skills：托管版与工作区版、gating 规则，以及配置/环境变量接线
title: Skills
x-i18n:
    generated_at: "2026-04-09T01:01:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: 6bb0e2e7c2ff50cf19c759ea1da1fd1886dc11f94adc77cbfd816009f75d93ee
    source_path: tools\skills.md
    workflow: 15
---

# Skills（OpenClaw）

OpenClaw 使用与 **[AgentSkills](https://agentskills.io)** 兼容的 Skill 文件夹来教会智能体如何使用工具。每个 Skill 都是一个目录，其中包含一个带有 YAML frontmatter 和说明的 `SKILL.md`。OpenClaw 会加载**内置 Skills**以及可选的本地覆盖版本，并在加载时根据环境、配置和二进制是否存在对其进行过滤。

## 位置和优先级

OpenClaw 会从以下来源加载 Skills：

1. **额外 Skill 文件夹**：通过 `skills.load.extraDirs` 配置
2. **内置 Skills**：随安装一同提供（npm package 或 OpenClaw.app）
3. **托管/本地 Skills**：`~/.openclaw/skills`
4. **个人智能体 Skills**：`~/.agents/skills`
5. **项目智能体 Skills**：`<workspace>/.agents/skills`
6. **工作区 Skills**：`<workspace>/skills`

如果 Skill 名称冲突，优先级如下：

`<workspace>/skills`（最高）→ `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置 Skills → `skills.load.extraDirs`（最低）

## 每个智能体专属 Skills 与共享 Skills

在**多智能体**设置中，每个智能体都有自己的工作区。这意味着：

- **每个智能体专属 Skills** 仅存放在该智能体的 `<workspace>/skills` 中。
- **项目智能体 Skills** 存放在 `<workspace>/.agents/skills` 中，并优先于
  普通工作区 `skills/` 文件夹应用到该工作区。
- **个人智能体 Skills** 存放在 `~/.agents/skills` 中，并在该机器上的
  各个工作区间共享。
- **共享 Skills** 存放在 `~/.openclaw/skills`（托管/本地）中，并对
  同一台机器上的**所有智能体**可见。
- 如果你想让多个智能体共用同一套 Skills 包，也可以通过 `skills.load.extraDirs`
  添加**共享文件夹**（最低优先级）。

如果同一个 Skill 名称出现在多个位置，则应用通常的优先级：
工作区优先，然后是项目智能体 Skills，然后是个人智能体 Skills，
再然后是托管/本地，接着是内置，最后是额外目录。

## 智能体 Skill allowlists

Skill 的**位置**和 Skill 的**可见性**是两种不同的控制。

- 位置/优先级决定了同名 Skill 中哪一个副本胜出。
- 智能体 allowlists 决定了智能体实际可以使用哪些可见 Skill。

使用 `agents.defaults.skills` 作为共享基线，然后通过
`agents.list[].skills` 按智能体覆盖：

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // inherits github, weather
      { id: "docs", skills: ["docs-search"] }, // replaces defaults
      { id: "locked-down", skills: [] }, // no skills
    ],
  },
}
```

规则：

- 默认不受限制时，不要设置 `agents.defaults.skills`。
- 省略 `agents.list[].skills` 表示继承 `agents.defaults.skills`。
- 设置 `agents.list[].skills: []` 表示不启用任何 Skills。
- 非空的 `agents.list[].skills` 列表就是该智能体的最终集合；它
  不会与默认值合并。

OpenClaw 会在构建提示、Skill slash command 发现、沙箱同步和 Skill 快照中应用该智能体的生效 Skill 集合。

## 插件 + Skills

插件可以通过在
`openclaw.plugin.json` 中列出 `skills` 目录（相对于插件根目录的路径）来附带自己的 Skills。启用插件后，插件 Skills 会被加载。当前这些目录会被合并到与 `skills.load.extraDirs` 相同的
低优先级路径中，因此同名的内置、托管、智能体或工作区 Skill 会覆盖它们。
你可以通过插件配置项上的 `metadata.openclaw.requires.config` 来对其进行 gating。
关于发现/配置请参见 [Plugins](/zh-CN/tools/plugin)，关于这些 Skills 所教授的
工具面请参见 [工具](/zh-CN/tools)。

## ClawHub（安装 + 同步）

ClawHub 是 OpenClaw 的公共 Skills 注册表。浏览地址：
[https://clawhub.ai](https://clawhub.ai)。使用原生 `openclaw skills`
命令发现/安装/更新 Skills，或者在你需要发布/同步工作流时使用单独的 `clawhub` CLI。
完整指南： [ClawHub](/zh-CN/tools/clawhub)。

常见流程：

- 将一个 Skill 安装到你的工作区：
  - `openclaw skills install <skill-slug>`
- 更新所有已安装 Skills：
  - `openclaw skills update --all`
- 同步（扫描 + 发布更新）：
  - `clawhub sync --all`

原生 `openclaw skills install` 会安装到当前工作区的 `skills/`
目录中。单独的 `clawhub` CLI 也会安装到你当前工作目录下的 `./skills`
（或回退到已配置的 OpenClaw 工作区）。
OpenClaw 会在下一个新会话中将其作为 `<workspace>/skills` 识别出来。

## 安全说明

- 将第三方 Skills 视为**不受信任代码**。启用前请先阅读。
- 对于不受信任输入和高风险工具，优先使用沙箱隔离运行。参见 [沙箱隔离](/zh-CN/gateway/sandboxing)。
- 工作区和额外目录的 Skill 发现仅接受 Skill 根目录和其解析后的真实路径仍位于已配置根目录内部的 `SKILL.md` 文件。
- 基于 Gateway 网关的 Skill 依赖安装（`skills.install`、新手引导和 Skills 设置 UI）在执行安装器元数据之前，会先运行内置危险代码扫描器。默认情况下，`critical` 级别发现会阻止继续，除非调用方显式设置危险覆盖；可疑发现仍仅发出警告。
- `openclaw skills install <slug>` 不同：它会将一个 ClawHub Skill 文件夹下载到工作区中，不会使用上述安装器元数据路径。
- `skills.entries.*.env` 和 `skills.entries.*.apiKey` 会将密钥注入该智能体轮次的**宿主**
  进程（不是沙箱）。请避免将密钥写入提示和日志中。
- 更广泛的威胁模型和检查清单，请参见 [Security](/zh-CN/gateway/security)。

## 格式（与 AgentSkills + Pi 兼容）

`SKILL.md` 至少必须包含：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
---
```

说明：

- 我们遵循 AgentSkills 规范中的布局/意图。
- 嵌入式智能体所使用的解析器仅支持**单行** frontmatter 键。
- `metadata` 应为**单行 JSON 对象**。
- 在说明中使用 `{baseDir}` 来引用 Skill 文件夹路径。
- 可选 frontmatter 键：
  - `homepage` —— 在 macOS Skills UI 中显示为“Website”的 URL（也支持通过 `metadata.openclaw.homepage`）。
  - `user-invocable` —— `true|false`（默认：`true`）。为 `true` 时，该 Skill 会作为用户 slash command 暴露。
  - `disable-model-invocation` —— `true|false`（默认：`false`）。为 `true` 时，该 Skill 会从模型提示中排除（但仍可通过用户调用使用）。
  - `command-dispatch` —— `tool`（可选）。设置为 `tool` 时，slash command 会绕过模型，直接分发到工具。
  - `command-tool` —— 当设置 `command-dispatch: tool` 时要调用的工具名。
  - `command-arg-mode` —— `raw`（默认）。对于工具分发，会将原始参数字符串直接转发给工具（不进行核心解析）。

    工具调用参数为：
    `{ command: "<raw args>", commandName: "<slash command>", skillName: "<skill name>" }`。

## Gating（加载时过滤）

OpenClaw 在加载时使用 `metadata`（单行 JSON）对 Skills **进行过滤**：

```markdown
---
name: image-lab
description: Generate or edit images via a provider-backed image workflow
metadata:
  {
    "openclaw":
      {
        "requires": { "bins": ["uv"], "env": ["GEMINI_API_KEY"], "config": ["browser.enabled"] },
        "primaryEnv": "GEMINI_API_KEY",
      },
  }
---
```

`metadata.openclaw` 下的字段：

- `always: true` —— 始终包含该 Skill（跳过其他 gating）。
- `emoji` —— 在 macOS Skills UI 中使用的可选 emoji。
- `homepage` —— 在 macOS Skills UI 中显示为“Website”的可选 URL。
- `os` —— 可选的平台列表（`darwin`、`linux`、`win32`）。如果设置，则该 Skill 仅在这些 OS 上符合条件。
- `requires.bins` —— 列表；其中每一项都必须存在于 `PATH` 中。
- `requires.anyBins` —— 列表；其中至少一项必须存在于 `PATH` 中。
- `requires.env` —— 列表；环境变量必须存在，**或者**可通过配置提供。
- `requires.config` —— 必须为 truthy 的 `openclaw.json` 路径列表。
- `primaryEnv` —— 与 `skills.entries.<name>.apiKey` 关联的环境变量名。
- `install` —— 可选安装器规范数组，由 macOS Skills UI 使用（brew/node/go/uv/download）。

关于沙箱隔离的说明：

- `requires.bins` 会在 Skill 加载时于**宿主机**上检查。
- 如果某个智能体处于沙箱隔离中，该二进制也必须**存在于容器内**。
  请通过 `agents.defaults.sandbox.docker.setupCommand`（或自定义镜像）安装它。
  `setupCommand` 会在容器创建后运行一次。
  包安装还要求沙箱中具备网络出口、可写根文件系统以及 root 用户。
  示例：`summarize` Skill（`skills/summarize/SKILL.md`）需要
  沙箱容器内存在 `summarize` CLI 才能在那里运行。

安装器示例：

```markdown
---
name: gemini
description: Use Gemini CLI for coding assistance and Google search lookups.
metadata:
  {
    "openclaw":
      {
        "emoji": "♊️",
        "requires": { "bins": ["gemini"] },
        "install":
          [
            {
              "id": "brew",
              "kind": "brew",
              "formula": "gemini-cli",
              "bins": ["gemini"],
              "label": "Install Gemini CLI (brew)",
            },
          ],
      },
  }
---
```

说明：

- 如果列出了多个安装器，Gateway 网关会选择**一个**首选项（有 brew 时优先 brew，否则用 node）。
- 如果所有安装器都是 `download`，OpenClaw 会列出每一项，以便你查看可用构件。
- 安装器规范可包含 `os: ["darwin"|"linux"|"win32"]`，用于按平台过滤选项。
- Node 安装会遵循 `openclaw.json` 中的 `skills.install.nodeManager`（默认：npm；可选：npm/pnpm/yarn/bun）。
  这只影响 **Skill 安装**；Gateway 网关运行时本身仍应使用 Node
  （不推荐对 WhatsApp/Telegram 使用 Bun）。
- 基于 Gateway 网关的安装器选择是偏好驱动的，而不是仅限 node：
  当安装规范混合多种类型时，如果启用了 `skills.install.preferBrew` 且存在 `brew`，OpenClaw 会优先 Homebrew，然后是 `uv`，再然后是已配置的
  node 管理器，最后才是 `go` 或 `download` 等其他回退项。
- 如果所有安装规范都是 `download`，OpenClaw 会展示全部下载选项，
  而不是折叠为单个首选安装器。
- Go 安装：如果缺少 `go` 但存在 `brew`，Gateway 网关会先通过 Homebrew 安装 Go，并在可能时将 `GOBIN` 设置为 Homebrew 的 `bin`。
- 下载安装：`url`（必填）、`archive`（`tar.gz` | `tar.bz2` | `zip`）、`extract`（默认：检测到压缩包时自动开启）、`stripComponents`、`targetDir`（默认：`~/.openclaw/tools/<skillKey>`）。

如果不存在 `metadata.openclaw`，则该 Skill 始终符合条件（除非
在配置中被禁用，或内置 Skill 被 `skills.allowBundled` 阻止）。

## 配置覆盖（`~/.openclaw/openclaw.json`）

内置/托管 Skills 可被开关控制，并提供环境变量值：

```json5
{
  skills: {
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
        config: {
          endpoint: "https://example.invalid",
          model: "nano-pro",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

注意：如果 Skill 名称包含连字符，请给该键加引号（JSON5 允许带引号的键）。

如果你想在 OpenClaw 自身内部使用标准的图像生成/编辑能力，请使用核心
`image_generate` 工具并配置 `agents.defaults.imageGenerationModel`，而不是使用内置 Skill。这里的 Skill 示例用于自定义或第三方工作流。

对于原生图像分析，使用 `image` 工具并配置 `agents.defaults.imageModel`。
对于原生图像生成/编辑，使用 `image_generate` 并配置
`agents.defaults.imageGenerationModel`。如果你选择 `openai/*`、`google/*`、
`fal/*` 或其他提供商专属图像模型，也请一并添加该提供商的认证/API
密钥。

默认情况下，配置键与**Skill 名称**匹配。如果某个 Skill 定义了
`metadata.openclaw.skillKey`，则应在 `skills.entries` 下使用该键。

规则：

- `enabled: false` 会禁用该 Skill，即使它是内置/已安装的。
- `env`：仅当变量尚未在进程中设置时才会注入。
- `apiKey`：为声明了 `metadata.openclaw.primaryEnv` 的 Skills 提供的便捷方式。
  支持明文字符串或 SecretRef 对象（`{ source, provider, id }`）。
- `config`：用于自定义每个 Skill 字段的可选对象；自定义键必须放在这里。
- `allowBundled`：仅针对**内置** Skills 的可选 allowlist。如果设置，则只有
  列表中的内置 Skills 符合条件（托管/工作区 Skills 不受影响）。

## 环境注入（每次智能体运行）

当智能体运行开始时，OpenClaw 会：

1. 读取 Skill 元数据。
2. 将任何 `skills.entries.<key>.env` 或 `skills.entries.<key>.apiKey` 应用到
   `process.env`。
3. 使用**符合条件的** Skills 构建系统提示。
4. 在运行结束后恢复原始环境。

这**仅作用于智能体运行范围内**，不是全局 shell 环境。

## 会话快照（性能）

OpenClaw 会在会话开始时对符合条件的 Skills **做快照**，并在该会话后续轮次中复用该列表。对 Skills 或配置的更改会在下一个新会话中生效。

当启用了 Skills 监视器，或出现了新的符合条件的远程节点时，Skills 也可以在会话中途刷新（见下文）。可以将此理解为一种**热重载**：刷新后的列表会在下一次智能体轮次中生效。

如果该会话的生效智能体 Skill allowlist 发生变化，OpenClaw
会刷新快照，以便可见 Skills 始终与当前智能体保持一致。

## 远程 macOS 节点（Linux Gateway 网关）

如果 Gateway 网关运行在 Linux 上，但连接了一个**macOS 节点**，并且该节点**允许 `system.run`**（Exec approvals 安全性未设置为 `deny`），OpenClaw 可以在该节点上存在所需二进制时，将仅限 macOS 的 Skills 视为符合条件。智能体应通过带 `host=node` 的 `exec` 工具来执行这些 Skills。

这依赖于节点报告其命令支持情况，以及通过 `system.run` 进行二进制探测。如果 macOS 节点之后离线，这些 Skills 仍会保持可见；直到节点重新连接前，调用可能会失败。

## Skills 监视器（自动刷新）

默认情况下，OpenClaw 会监视 Skill 文件夹，并在 `SKILL.md` 文件发生变化时提升 Skills 快照版本。在 `skills.load` 下进行配置：

```json5
{
  skills: {
    load: {
      watch: true,
      watchDebounceMs: 250,
    },
  },
}
```

## Token 影响（Skills 列表）

当有符合条件的 Skills 时，OpenClaw 会将一个紧凑的 XML Skills 列表注入系统提示中（通过 `pi-coding-agent` 中的 `formatSkillsForPrompt`）。其成本是确定的：

- **基础开销（仅当 ≥1 个 Skill 时）：** 195 个字符。
- **每个 Skill：** 97 个字符 + XML 转义后的 `<name>`、`<description>` 和 `<location>` 值的长度。

公式（字符数）：

```
total = 195 + Σ (97 + len(name_escaped) + len(description_escaped) + len(location_escaped))
```

说明：

- XML 转义会将 `& < > " '` 展开为实体（`&amp;`、`&lt;` 等），从而增加长度。
- token 数量会因模型分词器而异。粗略按 OpenAI 风格估算约为 ~4 字符/token，因此**97 个字符 ≈ 24 个 token**，再加上你的实际字段长度。

## 托管 Skills 生命周期

OpenClaw 会将一组基础 Skills 作为**内置 Skills**随安装一同提供（npm package 或 OpenClaw.app）。`~/.openclaw/skills` 用于本地覆盖
（例如，在不修改内置副本的情况下固定/修补某个 Skill）。工作区 Skills 由用户拥有，并在名称冲突时覆盖两者。

## 配置参考

完整配置 schema 请参见 [Skills 配置](/zh-CN/tools/skills-config)。

## 想找更多 Skills？

浏览 [https://clawhub.ai](https://clawhub.ai)。

---

## 相关内容

- [创建 Skills](/zh-CN/tools/creating-skills) —— 构建自定义 Skills
- [Skills 配置](/zh-CN/tools/skills-config) —— Skill 配置参考
- [Slash Commands](/zh-CN/tools/slash-commands) —— 所有可用的 slash commands
- [Plugins](/zh-CN/tools/plugin) —— 插件系统概览
