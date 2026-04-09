---
read_when:
    - 查找操作系统支持情况或安装路径
    - 决定将 Gateway 网关运行在哪里
summary: 平台支持概览（Gateway 网关 + 配套应用）
title: 平台
x-i18n:
    generated_at: "2026-04-08T06:13:42Z"
    model: gpt-5.4
    provider: openai
    source_hash: d5be4743fd39eca426d65db940f04f3a8fc3ff2c5e10b0e82bc55fc35a7d1399
    source_path: platforms\index.md
    workflow: 15
---

# 平台

OpenClaw core 使用 TypeScript 编写。**推荐使用 Node 作为运行时**。
不建议在 Gateway 网关中使用 Bun（存在 WhatsApp/Telegram bug）。

OpenClaw 提供 macOS 配套应用（菜单栏应用）和移动节点应用（iOS/Android）。Windows 和
Linux 配套应用仍在规划中，但 Gateway 网关目前已完全支持。
Windows 原生配套应用也在规划中；推荐通过 WSL2 运行 Gateway 网关。

## 选择你的操作系统

- macOS： [macOS 应用程序](/zh-CN/platforms/macos)
- iOS： [iOS 应用](/zh-CN/platforms/ios)
- Android： [Android 应用](/zh-CN/platforms/android)
- Windows： [Windows](/zh-CN/platforms/windows)
- Linux： [Linux 应用](/zh-CN/platforms/linux)

## VPS 与托管

- VPS 中心： [Linux ???](/zh-CN/vps)
- Fly.io： [Fly.io](/zh-CN/install/fly)
- Hetzner（Docker）： [Hetzner](/zh-CN/install/hetzner)
- GCP（Compute Engine）： [GCP](/zh-CN/install/gcp)
- Azure（Linux VM）： [Azure](/zh-CN/install/azure)
- exe.dev（VM + HTTPS 代理）： [exe.dev](/zh-CN/install/exe-dev)

## 常用链接

- 安装指南： [入门指南](/zh-CN/start/getting-started)
- Gateway 网关操作手册： [Gateway ??????](/zh-CN/gateway)
- Gateway 网关配置： [??](/zh-CN/gateway/configuration)
- 服务状态： `openclaw gateway status`

## Gateway 网关服务安装（CLI）

使用以下任一方式（都受支持）：

- 向导（推荐）： `openclaw onboard --install-daemon`
- 直接安装： `openclaw gateway install`
- 通过配置流程： `openclaw configure` → 选择 **Gateway service**
- 修复/迁移： `openclaw doctor`（会提供安装或修复服务的选项）

服务目标取决于操作系统：

- macOS：LaunchAgent（`ai.openclaw.gateway` 或 `ai.openclaw.<profile>`；旧版为 `com.openclaw.*`）
- Linux/WSL2：systemd 用户服务（`openclaw-gateway[-<profile>].service`）
- 原生 Windows：计划任务（`OpenClaw Gateway` 或 `OpenClaw Gateway (<profile>)`）；如果创建任务被拒绝，则会回退到每用户 Startup 文件夹登录项
