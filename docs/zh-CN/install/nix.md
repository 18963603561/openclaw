---
read_when:
    - 你希望安装可复现、可回滚
    - 你已经在使用 Nix/NixOS/Home Manager
    - 你希望所有内容都被固定版本并以声明式方式管理
summary: 使用 Nix 以声明式方式安装 OpenClaw
title: Nix
x-i18n:
    generated_at: "2026-04-08T06:06:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: 14e1e73533db1350d82d3a786092b4328121a082dfeeedee7c7574021dada546
    source_path: install\nix.md
    workflow: 15
---

# Nix 安装

使用 **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** 以声明式方式安装 OpenClaw —— 这是一个开箱即用的 Home Manager 模块。

<Info>
[Nix-openclaw](https://github.com/openclaw/nix-openclaw) 仓库是 Nix 安装方式的权威来源。此页面只是一个快速概览。
</Info>

## 你将获得什么

- Gateway 网关 + macOS 应用 + 工具（whisper、spotify、cameras）—— 全部固定版本
- 可在重启后继续生效的 Launchd 服务
- 带声明式配置的插件系统
- 即时回滚：`home-manager switch --rollback`

## 快速开始

<Steps>
  <Step title="安装 Determinate Nix">
    如果尚未安装 Nix，请按照 [Determinate Nix 安装器](https://github.com/DeterminateSystems/nix-installer) 的说明操作。
  </Step>
  <Step title="创建本地 flake">
    使用 nix-openclaw 仓库中的 agent 优先模板：
    ```bash
    mkdir -p ~/code/openclaw-local
    # Copy templates/agent-first/flake.nix from the nix-openclaw repo
    ```
  </Step>
  <Step title="配置 secrets">
    设置你的消息 bot token 和模型提供商 API key。使用 `~/.secrets/` 下的纯文件就可以。
  </Step>
  <Step title="填充模板占位符并执行切换">
    ```bash
    home-manager switch
    ```
  </Step>
  <Step title="验证">
    确认 Launchd 服务正在运行，并且你的 bot 能响应消息。
  </Step>
</Steps>

有关完整模块选项和示例，请参见 [nix-openclaw README](https://github.com/openclaw/nix-openclaw)。

## Nix 模式运行时行为

当设置 `OPENCLAW_NIX_MODE=1` 时（在 nix-openclaw 中会自动设置），OpenClaw 会进入一种确定性模式，并禁用自动安装流程。

你也可以手动设置：

```bash
export OPENCLAW_NIX_MODE=1
```

在 macOS 上，GUI 应用不会自动继承 shell 环境变量。请改用 defaults 启用 Nix 模式：

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Nix 模式下会发生什么变化

- 自动安装和自我变更流程会被禁用
- 缺失依赖会显示 Nix 专用修复提示信息
- UI 会显示只读的 Nix 模式横幅

### 配置和状态路径

OpenClaw 会从 `OPENCLAW_CONFIG_PATH` 读取 JSON5 配置，并将可变数据存储在 `OPENCLAW_STATE_DIR` 中。在 Nix 下运行时，请将这些路径显式设置为由 Nix 管理的位置，这样运行时状态和配置就不会落入不可变 store 中。

| Variable               | Default |
| ---------------------- | ------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw` |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json` |

## 相关内容

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) —— 完整设置指南
- [向导](/zh-CN/start/wizard) —— 非 Nix CLI 设置
- [Docker](/zh-CN/install/docker) —— 容器化设置
