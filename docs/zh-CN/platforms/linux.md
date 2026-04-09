---
read_when:
    - 查看 Linux 配套应用状态时
    - 规划平台覆盖范围或贡献时
summary: Linux 支持情况 + 配套应用状态
title: Linux 应用
x-i18n:
    generated_at: "2026-04-08T06:14:20Z"
    model: gpt-5.4
    provider: openai
    source_hash: 5dbfc89eb65e04347479fc6c9a025edec902fb0c544fb8d5bd09c24558ea03b1
    source_path: platforms\linux.md
    workflow: 15
---

# Linux 应用

Gateway 网关在 Linux 上已获得完整支持。**Node 是推荐的运行时**。
不建议在 Gateway 网关上使用 Bun（存在 WhatsApp/Telegram 相关 bug）。

原生 Linux 配套应用已在计划中。如果你愿意帮助构建一个，欢迎贡献。

## 面向新手的快速路径（VPS）

1. 安装 Node 24（推荐；Node 22 LTS，目前 `22.14+`，出于兼容性考虑仍然可用）
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. 在你的笔记本上运行：`ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. 打开 `http://127.0.0.1:18789/`，并使用已配置的共享密钥进行认证（默认是 token；如果你设置了 `gateway.auth.mode: "password"`，则使用密码）

完整 Linux 服务器指南见：[Linux Server](/vps)。分步 VPS 示例见：[exe.dev](/zh-CN/install/exe-dev)

## 安装

- [入门指南](/start/getting-started)
- [安装与更新](/zh-CN/install/updating)
- 可选流程：[Bun（实验性）](/zh-CN/install/bun)、[Nix](/zh-CN/install/nix)、[Docker](/zh-CN/install/docker)

## Gateway 网关

- [Gateway 网关运行手册](/zh-CN/gateway)
- [配置](/zh-CN/gateway/configuration)

## Gateway 网关服务安装（CLI）

使用以下任一方式：

```
openclaw onboard --install-daemon
```

或者：

```
openclaw gateway install
```

或者：

```
openclaw configure
```

在提示时选择 **Gateway service**。

修复/迁移：

```
openclaw doctor
```

## 系统控制（systemd 用户单元）

OpenClaw 默认安装的是 systemd **用户**服务。对于共享或持续在线服务器，请使用 **system**
服务。`openclaw gateway install` 和
`openclaw onboard --install-daemon` 已经会为你渲染当前规范的单元文件；
只有在你需要自定义 system/服务管理器配置时，才需要手动编写。完整服务指导见 [Gateway 网关运行手册](/zh-CN/gateway)。

最小配置：

创建 `~/.config/systemd/user/openclaw-gateway[-<profile>].service`：

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

启用它：

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
