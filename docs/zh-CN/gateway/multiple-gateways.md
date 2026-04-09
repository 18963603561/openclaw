---
read_when:
    - 在同一台机器上运行多个 Gateway 网关
    - 你需要为每个 Gateway 网关隔离配置/状态/端口
summary: 在一台主机上运行多个 OpenClaw Gateway 网关（隔离、端口与 profile）
title: 多个 Gateway 网关
x-i18n:
    generated_at: "2026-04-08T04:29:19Z"
    model: gpt-5.4
    provider: openai
    source_hash: 061f204bf56b28c6bd0e2c9aee6c561a8a162ca219060117fea4d3a007f01899
    source_path: gateway\multiple-gateways.md
    workflow: 15
---

# 多个 Gateway 网关（同一主机）

大多数场景都应使用一个 Gateway 网关，因为单个 Gateway 网关就可以处理多个消息连接和智能体。如果你需要更强的隔离性或冗余（例如救援机器人），可以运行多个使用隔离 profile/端口的独立 Gateway 网关。

## 隔离清单（必需）

- `OPENCLAW_CONFIG_PATH` — 每个实例独立的配置文件
- `OPENCLAW_STATE_DIR` — 每个实例独立的会话、凭证、缓存
- `agents.defaults.workspace` — 每个实例独立的工作区根目录
- `gateway.port`（或 `--port`）— 每个实例唯一
- 派生端口（browser/canvas）不能重叠

如果这些项被共享，你将遇到配置竞争和端口冲突。

## 推荐：profiles（`--profile`）

Profiles 会自动限定 `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH`，并为服务名添加后缀。

```bash
# main
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# rescue
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

每个 profile 的服务：

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## 救援机器人指南

在同一台主机上运行第二个 Gateway 网关，并为其单独配置：

- profile/config
- 状态目录
- 工作区
- 基础端口（以及派生端口）

这样可以让救援机器人与主机器人隔离，从而在主机器人不可用时执行调试或应用配置变更。

端口间隔：基础端口之间至少预留 20 个端口，这样派生的 browser/canvas/CDP 端口就不会发生冲突。

### 安装方法（救援机器人）

```bash
# 主机器人（已有或全新安装，不带 --profile 参数）
# 运行在端口 18789 + Chrome CDC/Canvas/... Ports
openclaw onboard
openclaw gateway install

# 救援机器人（隔离 profile + 端口）
openclaw --profile rescue onboard
# Notes:
# - workspace name will be postfixed with -rescue per default
# - Port should be at least 18789 + 20 Ports,
#   better choose completely different base port, like 19789,
# - rest of the onboarding is the same as normal

# 安装服务（如果设置期间未自动完成）
openclaw --profile rescue gateway install
```

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- browser 控制服务端口 = 基础端口 + 2（仅限 loopback）
- canvas host 由 Gateway 网关 HTTP 服务器提供（与 `gateway.port` 相同端口）
- Browser profile CDP 端口从 `browser.controlPort + 9 .. + 108` 自动分配

如果你在配置或环境变量中覆盖了其中任一项，必须保证每个实例都唯一。

## Browser/CDP 说明（常见陷阱）

- **不要**在多个实例上将 `browser.cdpUrl` 固定为相同值。
- 每个实例都需要自己的 browser 控制端口和 CDP 范围（从其 gateway 端口派生）。
- 如果你需要显式指定 CDP 端口，请按实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（按 profile、按实例设置）。

## 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## 快速检查

```bash
openclaw --profile main gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

说明：

- `gateway status --deep` 有助于发现来自旧安装的陈旧 launchd/systemd/schtasks 服务。
- `gateway probe` 中的警告文本，例如 `multiple reachable gateways detected`，只有在你有意运行多个隔离 Gateway 网关时才是预期行为。
