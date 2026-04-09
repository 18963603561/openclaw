---
read_when:
    - 选择一种新手引导路径
    - 设置一个新环境
sidebarTitle: Onboarding Overview
summary: OpenClaw 新手引导选项与流程概览
title: 新手引导概览
x-i18n:
    generated_at: "2026-04-08T07:11:47Z"
    model: gpt-5.4
    provider: openai
    source_hash: 374697c1dbe0c3871c43164076fbed7119ef032f4a40d0f6e421051f914806e5
    source_path: start\onboarding-overview.md
    workflow: 15
---

# 新手引导概览

OpenClaw 有两种新手引导路径。它们都会配置认证、Gateway 网关以及可选的聊天渠道——区别只在于你与设置流程交互的方式不同。

## 我应该使用哪条路径？

|                | CLI 新手引导                           | macOS 应用新手引导      |
| -------------- | -------------------------------------- | ----------------------- |
| **平台**       | macOS、Linux、Windows（原生或 WSL2）   | 仅 macOS                |
| **界面**       | 终端向导                               | 应用中的引导式 UI       |
| **最适合**     | 服务器、无头环境、完全控制             | 桌面 Mac、可视化设置    |
| **自动化**     | 可用于脚本的 `--non-interactive`       | 仅支持手动              |
| **命令**       | `openclaw onboard`                     | 启动应用                |

大多数用户都应从 **CLI 新手引导** 开始——它适用于所有平台，并且能提供最大的控制力。

## 新手引导会配置什么

无论你选择哪种路径，新手引导都会设置以下内容：

1. **模型提供商与认证** —— 为你选择的提供商配置 API 密钥、OAuth 或设置 token
2. **工作区** —— 用于智能体文件、引导模板和记忆的目录
3. **Gateway 网关** —— 端口、绑定地址、认证模式
4. **渠道**（可选）—— 内置和内置打包的聊天渠道，例如
   BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、
   Telegram、WhatsApp 等
5. **守护进程**（可选）—— 后台服务，使 Gateway 网关能够自动启动

## CLI 新手引导

在任意终端中运行：

```bash
openclaw onboard
```

添加 `--install-daemon`，即可一步同时安装后台服务。

完整参考： [新手引导（CLI）](/zh-CN/start/wizard)
CLI 命令文档：[`openclaw onboard`](/zh-CN/cli/onboard)

## macOS 应用新手引导

打开 OpenClaw 应用。首次运行向导会通过可视化界面带你完成相同的步骤。

完整参考： [新手引导（macOS 应用）](/zh-CN/start/onboarding)

## 自定义或未列出的提供商

如果你的提供商未出现在新手引导中，请选择 **Custom Provider**，然后输入：

- API 兼容模式（兼容 OpenAI、兼容 Anthropic，或自动检测）
- Base URL 和 API 密钥
- 模型 ID 以及可选别名

多个自定义端点可以共存——每个端点都会拥有自己的 endpoint ID。
