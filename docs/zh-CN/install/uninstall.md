---
read_when:
    - 你想从一台机器上移除 OpenClaw
    - 卸载后 Gateway 网关服务仍在运行
summary: 彻底卸载 OpenClaw（CLI、服务、状态、工作区）
title: 卸载
x-i18n:
    generated_at: "2026-04-08T06:07:33Z"
    model: gpt-5.4
    provider: openai
    source_hash: 34c7d3e4ad17333439048dfda739fc27db47e7f9e4212fe17db0e4eb3d3ab258
    source_path: install\uninstall.md
    workflow: 15
---

# 卸载

有两种路径：

- 如果 `openclaw` 仍然已安装，使用**简单路径**。
- 如果 CLI 已不在，但服务仍在运行，使用**手动移除服务**。

## 简单路径（CLI 仍已安装）

推荐：使用内置卸载器：

```bash
openclaw uninstall
```

非交互方式（自动化 / npx）：

```bash
openclaw uninstall --all --yes --non-interactive
npx -y openclaw uninstall --all --yes --non-interactive
```

手动步骤（结果相同）：

1. 停止 Gateway 网关服务：

```bash
openclaw gateway stop
```

2. 卸载 Gateway 网关服务（launchd/systemd/schtasks）：

```bash
openclaw gateway uninstall
```

3. 删除状态 + 配置：

```bash
rm -rf "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
```

如果你将 `OPENCLAW_CONFIG_PATH` 设置为状态目录之外的自定义位置，也请删除该文件。

4. 删除你的工作区（可选，会移除智能体文件）：

```bash
rm -rf ~/.openclaw/workspace
```

5. 移除 CLI 安装（选择你使用的方式）：

```bash
npm rm -g openclaw
pnpm remove -g openclaw
bun remove -g openclaw
```

6. 如果你安装了 macOS 应用：

```bash
rm -rf /Applications/OpenClaw.app
```

说明：

- 如果你使用了 profiles（`--profile` / `OPENCLAW_PROFILE`），请对每个状态目录重复执行第 3 步（默认路径为 `~/.openclaw-<profile>`）。
- 在远程模式下，状态目录位于**Gateway 网关主机**上，因此也要在那台机器上执行第 1-4 步。

## 手动移除服务（CLI 未安装）

如果 Gateway 网关服务仍在运行，但 `openclaw` 已不存在，请使用本节。

### macOS（launchd）

默认标签是 `ai.openclaw.gateway`（或 `ai.openclaw.<profile>`；旧版 `com.openclaw.*` 可能仍然存在）：

```bash
launchctl bootout gui/$UID/ai.openclaw.gateway
rm -f ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

如果你使用了 profile，请将标签和 plist 文件名替换为 `ai.openclaw.<profile>`。如果存在旧版 `com.openclaw.*` plist，也请一并删除。

### Linux（systemd 用户单元）

默认单元名是 `openclaw-gateway.service`（或 `openclaw-gateway-<profile>.service`）：

```bash
systemctl --user disable --now openclaw-gateway.service
rm -f ~/.config/systemd/user/openclaw-gateway.service
systemctl --user daemon-reload
```

### Windows（计划任务）

默认任务名是 `OpenClaw Gateway`（或 `OpenClaw Gateway (<profile>)`）。
任务脚本位于你的状态目录下。

```powershell
schtasks /Delete /F /TN "OpenClaw Gateway"
Remove-Item -Force "$env:USERPROFILE\.openclaw\gateway.cmd"
```

如果你使用了 profile，请删除对应的任务名和 `~\.openclaw-<profile>\gateway.cmd`。

## 常规安装 vs 源码 checkout

### 常规安装（install.sh / npm / pnpm / bun）

如果你使用了 `https://openclaw.ai/install.sh` 或 `install.ps1`，CLI 是通过 `npm install -g openclaw@latest` 安装的。
请用 `npm rm -g openclaw` 将其移除（如果你是用 `pnpm` / `bun` 安装的，则使用 `pnpm remove -g` / `bun remove -g`）。

### 源码 checkout（git clone）

如果你是从仓库 checkout 运行（`git clone` + `openclaw ...` / `bun run openclaw ...`）：

1. **在删除仓库之前**先卸载 Gateway 网关服务（使用上面的简单路径或手动移除服务）。
2. 删除仓库目录。
3. 按上文所示删除状态 + 工作区。
