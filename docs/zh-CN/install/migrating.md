---
read_when:
    - 你正在将 OpenClaw 迁移到新的笔记本电脑/服务器
    - 你希望保留会话、认证和渠道登录状态（WhatsApp 等）
summary: 将 OpenClaw 安装从一台机器迁移到另一台机器
title: 迁移指南
x-i18n:
    generated_at: "2026-04-08T06:05:39Z"
    model: gpt-5.4
    provider: openai
    source_hash: 403f0b9677ce723c84abdbabfad20e0f70fd48392ebf23eabb7f8a111fd6a26d
    source_path: install\migrating.md
    workflow: 15
---

# 将 OpenClaw 迁移到新机器

本指南帮助你将 OpenClaw Gateway 网关迁移到新机器，而无需重新执行新手引导。

## 会迁移哪些内容

当你复制**状态目录**（默认是 `~/.openclaw/`）和你的**工作区**时，你会保留下列内容：

- **配置** -- `openclaw.json` 和所有 Gateway 网关设置
- **认证** -- 每智能体 `auth-profiles.json`（API keys + OAuth），以及 `credentials/` 下的所有渠道/提供商状态
- **会话** -- 对话历史和智能体状态
- **渠道状态** -- WhatsApp 登录、Telegram 会话等
- **工作区文件** -- `MEMORY.md`、`USER.md`、Skills 和 prompts

<Tip>
在旧机器上运行 `openclaw status`，以确认你的状态目录路径。
自定义 profile 会使用 `~/.openclaw-<profile>/` 或通过 `OPENCLAW_STATE_DIR` 设置的路径。
</Tip>

## 迁移步骤

<Steps>
  <Step title="停止 Gateway 网关并备份">
    在**旧**机器上，先停止 Gateway 网关，以避免复制过程中文件仍在变化，然后执行归档：

    ```bash
    openclaw gateway stop
    cd ~
    tar -czf openclaw-state.tgz .openclaw
    ```

    如果你使用多个 profiles（例如 `~/.openclaw-work`），请分别归档每一个。

  </Step>

  <Step title="在新机器上安装 OpenClaw">
    在新机器上[安装](/zh-CN/install) CLI（如有需要，也安装 Node）。
    即使新手引导创建了一个新的 `~/.openclaw/` 也没关系 —— 你接下来会覆盖它。
  </Step>

  <Step title="复制状态目录和工作区">
    通过 `scp`、`rsync -a` 或外部硬盘传输归档文件，然后解压：

    ```bash
    cd ~
    tar -xzf openclaw-state.tgz
    ```

    请确保隐藏目录已包含在内，并且文件所有权与将要运行 Gateway 网关的用户一致。

  </Step>

  <Step title="运行 Doctor 并验证">
    在新机器上，运行 [Doctor](/zh-CN/gateway/doctor) 以应用配置迁移并修复服务：

    ```bash
    openclaw doctor
    openclaw gateway restart
    openclaw status
    ```

  </Step>
</Steps>

## 常见陷阱

<AccordionGroup>
  <Accordion title="Profile 或状态目录不匹配">
    如果旧 Gateway 网关使用了 `--profile` 或 `OPENCLAW_STATE_DIR`，而新的没有使用，
    那么渠道会显示为已登出，会话也会显示为空。
    请使用**与你迁移过来的内容相同**的 profile 或状态目录启动 Gateway 网关，然后重新运行 `openclaw doctor`。
  </Accordion>

  <Accordion title="只复制 openclaw.json">
    仅复制配置文件是不够的。模型认证 profiles 位于
    `agents/<agentId>/agent/auth-profiles.json` 下，而渠道/提供商状态仍然
    存放在 `credentials/` 下。请始终迁移**整个**状态目录。
  </Accordion>

  <Accordion title="权限和所有权">
    如果你以 root 身份复制，或者切换了用户，Gateway 网关可能无法读取凭证。
    请确保状态目录和工作区归运行 Gateway 网关的用户所有。
  </Accordion>

  <Accordion title="远程模式">
    如果你的 UI 指向的是**远程** Gateway 网关，那么会话和工作区都归远程主机所有。
    你应该迁移 Gateway 网关主机本身，而不是你的本地笔记本。参见 [常见问题](/zh-CN/help/faq#where-things-live-on-disk)。
  </Accordion>

  <Accordion title="备份中的 secrets">
    状态目录包含认证 profiles、渠道凭证以及其他
    提供商状态。
    请使用加密方式存储备份，避免通过不安全的传输渠道传输，如果你怀疑发生泄露，请轮换 keys。
  </Accordion>
</AccordionGroup>

## 验证检查清单

在新机器上，确认：

- [ ] `openclaw status` 显示 Gateway 网关正在运行
- [ ] 渠道仍然处于已连接状态（无需重新配对）
- [ ] 仪表板可以打开，并显示现有会话
- [ ] 工作区文件（memory、配置）存在
