---
read_when:
    - 你经常通过 Docker 运行 OpenClaw，并希望日常命令更简短
    - 你想为仪表板、日志、token 设置和配对流程添加一层辅助封装
summary: 面向基于 Docker 的 OpenClaw 安装的 ClawDock shell 辅助器
title: ClawDock
x-i18n:
    generated_at: "2026-04-08T06:00:14Z"
    model: gpt-5.4
    provider: openai
    source_hash: 93d67d1d979450d8c9c11854d2f40977c958f1c300e75a5c42ce4c31de86735a
    source_path: install\clawdock.md
    workflow: 15
---

# ClawDock

ClawDock 是一层面向基于 Docker 的 OpenClaw 安装的小型 shell 辅助封装。

它为你提供像 `clawdock-start`、`clawdock-dashboard` 和 `clawdock-fix-token` 这样的短命令，而不必使用更长的 `docker compose ...` 调用。

如果你还没有设置 Docker，请先从 [Docker](/zh-CN/install/docker) 开始。

## 安装

使用规范的辅助器路径：

```bash
mkdir -p ~/.clawdock && curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/clawdock/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh
echo 'source ~/.clawdock/clawdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

如果你之前是从 `scripts/shell-helpers/clawdock-helpers.sh` 安装 ClawDock，请改为从新的 `scripts/clawdock/clawdock-helpers.sh` 路径重新安装。旧的 GitHub 原始路径已被移除。

## 你会获得什么

### 基本操作

| Command            | Description |
| ------------------ | ----------- |
| `clawdock-start`   | 启动 Gateway 网关 |
| `clawdock-stop`    | 停止 Gateway 网关 |
| `clawdock-restart` | 重启 Gateway 网关 |
| `clawdock-status`  | 检查容器状态 |
| `clawdock-logs`    | 持续跟踪 Gateway 网关日志 |

### 容器访问

| Command                   | Description |
| ------------------------- | ----------- |
| `clawdock-shell`          | 在 Gateway 网关容器内打开 shell |
| `clawdock-cli <command>`  | 在 Docker 中运行 OpenClaw CLI 命令 |
| `clawdock-exec <command>` | 在容器中执行任意命令 |

### Web UI 和配对

| Command                 | Description |
| ----------------------- | ----------- |
| `clawdock-dashboard`    | 打开控制 UI URL |
| `clawdock-devices`      | 列出待处理的设备配对 |
| `clawdock-approve <id>` | 批准配对请求 |

### 设置和维护

| Command              | Description |
| -------------------- | ----------- |
| `clawdock-fix-token` | 在容器内配置 Gateway 网关 token |
| `clawdock-update`    | 拉取、重建并重启 |
| `clawdock-rebuild`   | 仅重建 Docker 镜像 |
| `clawdock-clean`     | 移除容器和 volumes |

### 实用工具

| Command                | Description |
| ---------------------- | ----------- |
| `clawdock-health`      | 运行 Gateway 网关健康检查 |
| `clawdock-token`       | 输出 Gateway 网关 token |
| `clawdock-cd`          | 跳转到 OpenClaw 项目目录 |
| `clawdock-config`      | 打开 `~/.openclaw` |
| `clawdock-show-config` | 输出已脱敏的配置文件内容 |
| `clawdock-workspace`   | 打开工作区目录 |

## 首次使用流程

```bash
clawdock-start
clawdock-fix-token
clawdock-dashboard
```

如果浏览器提示需要配对：

```bash
clawdock-devices
clawdock-approve <request-id>
```

## 配置和 secrets

ClawDock 使用与 [Docker](/zh-CN/install/docker) 中描述相同的 Docker 配置拆分方式：

- `<project>/.env` 用于 Docker 专用值，例如镜像名称、端口和 Gateway 网关 token
- `~/.openclaw/.env` 用于由 env 支持的 provider keys 和 bot tokens
- `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 用于存储的 provider OAuth/API-key 认证
- `~/.openclaw/openclaw.json` 用于行为配置

当你想快速查看 `.env` 文件和 `openclaw.json` 时，请使用 `clawdock-show-config`。它会在输出中对 `.env` 值进行脱敏。

## 相关页面

- [Docker](/zh-CN/install/docker)
- [Docker VM 运行时](/zh-CN/install/docker-vm-runtime)
- [更新](/zh-CN/install/updating)
