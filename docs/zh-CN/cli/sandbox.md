---
read_when: You are managing sandbox runtimes or debugging sandbox/tool-policy behavior.
status: active
summary: 管理沙箱运行时并检查生效中的沙箱策略
title: 沙箱 CLI
x-i18n:
    generated_at: "2026-04-08T03:55:26Z"
    model: gpt-5.4
    provider: openai
    source_hash: fa2783037da2901316108d35e04bb319d5d57963c2764b9146786b3c6474b48a
    source_path: cli\sandbox.md
    workflow: 15
---

# 沙箱 CLI

管理用于隔离智能体执行的沙箱运行时。

## 概览

出于安全考虑，OpenClaw 可以在隔离的沙箱运行时中运行智能体。`sandbox` 命令可帮助你在更新或配置更改后检查并重建这些运行时。

目前这通常意味着：

- Docker 沙箱容器
- 当 `agents.defaults.sandbox.backend = "ssh"` 时的 SSH 沙箱运行时
- 当 `agents.defaults.sandbox.backend = "openshell"` 时的 OpenShell 沙箱运行时

对于 `ssh` 和 OpenShell `remote`，重建比 Docker 更重要：

- 远程工作区在初次播种后即成为规范来源
- `openclaw sandbox recreate` 会删除所选作用域的该规范远程工作区
- 下次使用时，会根据当前本地工作区重新播种

## 命令

### `openclaw sandbox explain`

检查**生效中的**沙箱 mode / scope / 工作区访问、沙箱工具策略以及提权门禁（并附带修复所需的配置键路径）。

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

### `openclaw sandbox list`

列出所有沙箱运行时及其状态和配置。

```bash
openclaw sandbox list
openclaw sandbox list --browser  # List only browser containers
openclaw sandbox list --json     # JSON output
```

**输出包括：**

- 运行时名称和状态
- 后端（`docker`、`openshell` 等）
- 配置标签，以及它是否与当前配置匹配
- 存续时间（自创建以来的时间）
- 空闲时间（自上次使用以来的时间）
- 关联的会话 / 智能体

### `openclaw sandbox recreate`

移除沙箱运行时，以强制按更新后的配置重新创建。

```bash
openclaw sandbox recreate --all                # Recreate all containers
openclaw sandbox recreate --session main       # Specific session
openclaw sandbox recreate --agent mybot        # Specific agent
openclaw sandbox recreate --browser            # Only browser containers
openclaw sandbox recreate --all --force        # Skip confirmation
```

**选项：**

- `--all`：重建所有沙箱容器
- `--session <key>`：重建指定会话的容器
- `--agent <id>`：重建指定智能体的容器
- `--browser`：仅重建浏览器容器
- `--force`：跳过确认提示

**重要：** 当下次使用智能体时，运行时会自动重新创建。

## 使用场景

### 更新 Docker 镜像之后

```bash
# Pull new image
docker pull openclaw-sandbox:latest
docker tag openclaw-sandbox:latest openclaw-sandbox:bookworm-slim

# Update config to use new image
# Edit config: agents.defaults.sandbox.docker.image (or agents.list[].sandbox.docker.image)

# Recreate containers
openclaw sandbox recreate --all
```

### 更改沙箱配置之后

```bash
# Edit config: agents.defaults.sandbox.* (or agents.list[].sandbox.*)

# Recreate to apply new config
openclaw sandbox recreate --all
```

### 更改 SSH 目标或 SSH 认证材料之后

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - agents.defaults.sandbox.ssh.target
# - agents.defaults.sandbox.ssh.workspaceRoot
# - agents.defaults.sandbox.ssh.identityFile / certificateFile / knownHostsFile
# - agents.defaults.sandbox.ssh.identityData / certificateData / knownHostsData

openclaw sandbox recreate --all
```

对于核心 `ssh` 后端，重建会删除 SSH 目标上按作用域划分的远程工作区根目录。下次运行时会根据本地工作区重新播种。

### 更改 OpenShell 来源、策略或模式之后

```bash
# Edit config:
# - agents.defaults.sandbox.backend
# - plugins.entries.openshell.config.from
# - plugins.entries.openshell.config.mode
# - plugins.entries.openshell.config.policy

openclaw sandbox recreate --all
```

对于 OpenShell `remote` 模式，重建会删除该作用域的规范远程工作区。下次运行时会根据本地工作区重新播种。

### 更改 setupCommand 之后

```bash
openclaw sandbox recreate --all
# or just one agent:
openclaw sandbox recreate --agent family
```

### 仅针对某个特定智能体

```bash
# Update only one agent's containers
openclaw sandbox recreate --agent alfred
```

## 为什么需要这样做？

**问题：** 当你更新沙箱配置时：

- 现有运行时会继续使用旧设置运行
- 运行时仅会在空闲 24 小时后被清理
- 经常使用的智能体会无限期保留旧运行时

**解决方案：** 使用 `openclaw sandbox recreate` 强制移除旧运行时。下次需要时，它们会按照当前设置自动重新创建。

提示：相比手动按后端逐一清理，更推荐使用 `openclaw sandbox recreate`。
它使用 Gateway 网关的运行时注册表，并可避免在作用域 / 会话键变化时出现不匹配。

## 配置

沙箱设置位于 `~/.openclaw/openclaw.json` 中的 `agents.defaults.sandbox` 下（按智能体覆盖则放在 `agents.list[].sandbox` 中）：

```jsonc
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all", // off, non-main, all
        "backend": "docker", // docker, ssh, openshell
        "scope": "agent", // session, agent, shared
        "docker": {
          "image": "openclaw-sandbox:bookworm-slim",
          "containerPrefix": "openclaw-sbx-",
          // ... more Docker options
        },
        "prune": {
          "idleHours": 24, // Auto-prune after 24h idle
          "maxAgeDays": 7, // Auto-prune after 7 days
        },
      },
    },
  },
}
```

## 另请参阅

- [沙箱隔离文档](/gateway/sandboxing)
- [智能体配置](/zh-CN/concepts/agent-workspace)
- [Doctor 命令](/gateway/doctor) - 检查沙箱设置
