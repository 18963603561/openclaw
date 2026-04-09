---
read_when:
    - 你想为本地 OpenClaw 状态创建一份一等公民的备份归档
    - 你想在重置或卸载前预览将会包含哪些路径
summary: '`openclaw backup` 的 CLI 参考（创建本地备份归档）'
title: backup
x-i18n:
    generated_at: "2026-04-08T03:50:29Z"
    model: gpt-5.4
    provider: openai
    source_hash: 700eda8f9eac1cc93a854fa579f128e5e97d4e6dfc0da75b437c0fb2a898a37d
    source_path: cli\backup.md
    workflow: 15
---

# `openclaw backup`

为 OpenClaw 状态、配置、认证配置档、渠道 / 提供商凭证、会话，以及可选的工作区创建本地备份归档。

```bash
openclaw backup create
openclaw backup create --output ~/Backups
openclaw backup create --dry-run --json
openclaw backup create --verify
openclaw backup create --no-include-workspace
openclaw backup create --only-config
openclaw backup verify ./2026-03-09T00-00-00.000Z-openclaw-backup.tar.gz
```

## 说明

- 归档中包含一个 `manifest.json` 文件，其中记录了解析后的源路径和归档布局。
- 默认输出是在当前工作目录中生成一个带时间戳的 `.tar.gz` 归档文件。
- 如果当前工作目录位于被备份的源树内部，OpenClaw 会回退到你的主目录，作为默认归档位置。
- 现有归档文件永远不会被覆盖。
- 源状态 / 工作区树内部的输出路径会被拒绝，以避免自包含。
- `openclaw backup verify <archive>` 会验证归档是否只包含一个根 manifest，拒绝具有路径穿越风格的归档路径，并检查 manifest 声明的每个负载是否都存在于 tarball 中。
- `openclaw backup create --verify` 会在写入归档后立即运行该验证。
- `openclaw backup create --only-config` 仅备份当前活动的 JSON 配置文件。

## 会备份哪些内容

`openclaw backup create` 会根据你的本地 OpenClaw 安装规划备份源：

- 由 OpenClaw 本地状态解析器返回的状态目录，通常是 `~/.openclaw`
- 当前活动配置文件路径
- 当 `credentials/` 目录位于状态目录之外时，其解析后的目录
- 从当前配置中发现的工作区目录，除非你传入 `--no-include-workspace`

模型认证配置档已经是状态目录的一部分，位于
`agents/<agentId>/agent/auth-profiles.json` 下，因此通常会被状态备份项覆盖。

如果你使用 `--only-config`，OpenClaw 会跳过状态、凭证目录和工作区发现，仅归档当前活动配置文件路径。

OpenClaw 会在构建归档前规范化路径。如果配置、凭证目录或某个工作区已经位于状态目录内，它们就不会作为单独的顶级备份源重复收录。缺失路径会被跳过。

归档负载会存储这些源树中的文件内容，内嵌的 `manifest.json` 会记录解析后的绝对源路径，以及每个资源使用的归档布局。

## 无效配置时的行为

`openclaw backup` 会有意绕过正常的配置预检，因此即使在恢复期间也能发挥作用。由于工作区发现依赖于有效配置，当配置文件存在但无效且仍启用了工作区备份时，`openclaw backup create` 现在会快速失败。

如果在这种情况下你仍想创建部分备份，请重新运行：

```bash
openclaw backup create --no-include-workspace
```

这样会保留状态、配置和外部凭证目录，同时完全跳过工作区发现。

如果你只需要配置文件本身的副本，`--only-config` 在配置格式错误时同样可用，因为它不依赖解析配置来发现工作区。

## 大小与性能

OpenClaw 不会对备份大小或单文件大小施加内置上限。

实际限制来自本地机器和目标文件系统：

- 用于临时写入归档以及最终归档的可用空间
- 遍历大型工作区树并将其压缩为 `.tar.gz` 所需的时间
- 如果你使用 `openclaw backup create --verify` 或运行 `openclaw backup verify`，重新扫描归档所需的时间
- 目标路径上的文件系统行为。OpenClaw 会优先使用不覆盖的硬链接发布步骤；当不支持硬链接时，则回退为独占复制

大型工作区通常是归档体积的主要来源。如果你想要更小或更快的备份，请使用 `--no-include-workspace`。

如果要生成最小归档，请使用 `--only-config`。
