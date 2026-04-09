---
read_when:
    - 回答常见的设置、安装、新手引导或运行时支持问题
    - 在深入调试前对用户报告的问题进行初步排查
summary: 有关 OpenClaw 设置、配置和使用的常见问题
title: 常见问题
x-i18n:
    generated_at: "2026-04-08T06:06:39Z"
    model: gpt-5.4
    provider: openai
    source_hash: 001b4605966b45b08108606f76ae937ec348c2179b04cf6fb34fef94833705e6
    source_path: help\faq.md
    workflow: 15
---

# 常见问题

针对真实环境部署（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障切换）的快速答案和更深入的故障排查。关于运行时诊断，请参见 [故障排除](/zh-CN/gateway/troubleshooting)。完整配置参考请参见 [??](/zh-CN/gateway/configuration)。

## 如果出了问题，最初的六十秒该做什么

1. **快速状态检查（第一步）**

   ```bash
   openclaw status
   ```

   快速本地摘要：操作系统 + 更新、Gateway 网关/服务可达性、智能体/会话、提供商配置 + 运行时问题（当 Gateway 网关可达时）。

2. **可粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，带日志尾部（token 已脱敏）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示 supervisor 运行状态与 RPC 可达性、探测目标 URL，以及服务可能使用了哪个配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行实时 Gateway 网关健康探测，包括在支持时的渠道探测
   （需要可访问的 Gateway 网关）。参见 [健康检查](/zh-CN/gateway/health)。

5. **查看最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 不可用，则退回到：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；参见 [??](/zh-CN/logging) 和 [故障排除](/zh-CN/gateway/troubleshooting)。

6. **运行 Doctor（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置与状态 + 运行健康检查。参见 [Doctor](/zh-CN/gateway/doctor)。

7. **Gateway 网关快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # shows the target URL + config path on errors
   ```

   向正在运行的 Gateway 网关请求完整快照（仅 WS）。参见 [健康检查](/zh-CN/gateway/health)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，最快的脱困方式是什么？">
    使用一个能够**看到你的机器**的本地 AI 智能体。这比在
    Discord 里提问有效得多，因为大多数“我卡住了”的情况其实是**本地配置或环境问题**，
    远程协助者无法直接检查。

    - **Claude Code**： [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**： [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复你机器层面的
    设置问题（PATH、服务、权限、认证文件）。请通过可修改的（git）安装方式，
    将**完整源码检出**提供给它们：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会通过一个 git 检出的仓库安装 OpenClaw，**因此智能体可以读取代码和文档**，
    并针对你当前运行的精确版本进行推理。之后你随时都可以通过不带 `--install-method git`
    重新运行安装器，切回 stable。

    提示：让智能体先**规划并监督**修复过程（逐步执行），然后只运行
    必要命令。这样改动会更小，也更容易审计。

    如果你发现了真实 bug 或修复，请提交 GitHub issue 或发送 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    先从这些命令开始（在求助时共享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：快速查看 Gateway 网关/智能体健康状态 + 基础配置。
    - `openclaw models status`：检查提供商认证 + 模型可用性。
    - `openclaw doctor`：验证并修复常见配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环： [如果出了问题，最初的六十秒该做什么](#first-60-seconds-if-something-is-broken)。
    安装文档： [安装](/zh-CN/install)、[安装器标志](/zh-CN/install/installer)、[更新](/zh-CN/install/updating)。

  </Accordion>

  <Accordion title="Heartbeat 一直被跳过。各个跳过原因是什么意思？">
    常见的 heartbeat 跳过原因：

    - `quiet-hours`：超出已配置的活跃时段窗口
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但只包含空白/仅标题脚手架
    - `no-tasks-due`：`HEARTBEAT.md` 任务模式已启用，但目前没有任何任务到达间隔时间
    - `alerts-disabled`：所有 heartbeat 可见性都被禁用（`showOk`、`showAlerts` 和 `useIndicator` 全都关闭）

    在任务模式下，只有在真正的 heartbeat 运行
    完成后，相关的到期时间戳才会推进。被跳过的运行不会将任务标记为已完成。

    文档： [Heartbeat](/zh-CN/gateway/heartbeat)、[自动化与任务](/zh-CN/automation)。

  </Accordion>

  <Accordion title="安装和设置 OpenClaw 的推荐方式">
    仓库推荐通过源码运行并使用新手引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导也可以自动构建 UI 资源。完成新手引导后，通常会在 **18789** 端口运行 Gateway 网关。

    从源码开始（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # auto-installs UI deps on first run
    openclaw onboard
    ```

    如果你还没有全局安装，请通过 `pnpm openclaw onboard` 运行。

  </Accordion>

  <Accordion title="完成 onboarding 后，如何打开控制面板？">
    向导会在 onboarding 完成后立即为你打开浏览器，访问一个干净的（不带 token 的）控制面板 URL，并且也会在摘要中打印该链接。请保持那个标签页打开；如果它没有自动启动，请在同一台机器上复制/粘贴打印出的 URL。
  </Accordion>

  <Accordion title="我该如何在 localhost 与远程环境中为控制面板认证？">
    **Localhost（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果它要求共享密钥认证，请在 Control UI 设置中粘贴已配置的 token 或 password。
    - token 来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - password 来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果尚未配置共享密钥，可通过 `openclaw doctor --generate-gateway-token` 生成 token。

    **不在 localhost：**

    - **Tailscale Serve**（推荐）：保持绑定到 loopback，运行 `openclaw gateway --tailscale serve`，然后打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份请求头即可满足 Control UI/WebSocket 认证（无需粘贴共享密钥，前提是信任 Gateway 网关主机）；HTTP API 仍然需要共享密钥认证，除非你有意使用私有入口 `none` 或受信任代理 HTTP 认证。
      同一客户端发起的错误并发 Serve 认证尝试会在失败认证限流器记录之前被串行化，因此第二次错误重试可能已经显示 `retry later`。
    - **tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或配置 password 认证），打开 `http://<tailscale-ip>:18789/`，然后在控制面板设置中粘贴对应的共享密钥。
    - **身份感知反向代理**：将 Gateway 网关保留在非 loopback 的受信任代理之后，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。共享密钥认证在隧道上仍然生效；若出现提示，请粘贴已配置的 token 或 password。

    参见 [???](/zh-CN/web/dashboard) 和 [Web ??](/zh-CN/web) 了解绑定模式和认证细节。

  </Accordion>

  <Accordion title="为什么聊天审批会有两个 exec approval 配置？">
    它们控制的是不同层：

    - `approvals.exec`：将审批提示转发到聊天目标
    - `channels.<channel>.execApprovals`：让该渠道作为 exec 审批的原生审批客户端

    宿主机 exec 策略仍然是真正的审批关口。聊天配置只控制审批
    提示出现在哪里，以及人们如何回复。

    在大多数设置中，你**不**需要同时用到两者：

    - 如果聊天本身已经支持命令和回复，同一聊天中的 `/approve` 就可通过共享路径工作。
    - 如果受支持的原生渠道能够安全推断审批者，那么当 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时，OpenClaw 现在会自动启用私信优先的原生审批。
    - 当存在原生审批卡片/按钮时，原生 UI 是主要路径；只有当工具结果表明聊天审批不可用，或手动审批是唯一方式时，智能体才应包含手动 `/approve` 命令。
    - 仅在提示也必须转发到其他聊天或明确的运维房间时，才使用 `approvals.exec`。
    - 仅在你明确希望将审批提示发回原始房间/主题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批又是单独一层：默认使用同一聊天中的 `/approve`，可选 `approvals.plugin` 转发，而且只有部分原生渠道会在此基础上保留插件原生审批处理。

    简短地说：转发用于路由，原生客户端配置用于更丰富的渠道专属 UX。
    参见 [Exec ??](/zh-CN/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。**不推荐**在 Gateway 网关中使用 Bun。
  </Accordion>

  <Accordion title="它能运行在 Raspberry Pi 上吗？">
    可以。Gateway 网关非常轻量——文档中列出的个人使用最低要求是 **512MB-1GB 内存**、**1 核**和大约 **500MB**
    磁盘空间，并说明 **Raspberry Pi 4 可以运行它**。

    如果你希望有更多余量（日志、媒体、其他服务），**推荐 2GB**，但
    这不是硬性最低要求。

    提示：小型 Pi/VPS 可以托管 Gateway 网关，而你可以在笔记本/手机上配对 **nodes**，以获得
    本地屏幕/摄像头/canvas 或命令执行能力。参见 [??](/zh-CN/nodes)。

  </Accordion>

  <Accordion title="安装到 Raspberry Pi 有什么建议吗？">
    简短回答：能运行，但要预期会有一些边角问题。

    - 使用 **64 位**操作系统，并保持 Node >= 22。
    - 优先使用**可修改的（git）安装**，这样你可以查看日志并快速更新。
    - 一开始不要启用渠道/Skills，先逐个添加。
    - 如果碰到奇怪的二进制问题，通常是 **ARM 兼容性** 问题。

    文档： [Linux 应用](/zh-CN/platforms/linux)、[安装](/zh-CN/install)。

  </Accordion>

  <Accordion title="界面卡在 wake up my friend / onboarding 无法 hatch。现在怎么办？">
    该界面依赖 Gateway 网关可达并已认证。TUI 在首次 hatch 时也会自动发送
    “Wake up, my friend!”。如果你看到这一行但**没有回复**，
    而且 token 仍为 0，说明智能体根本没有运行。

    1. 重启 Gateway 网关：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态 + 认证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果仍然卡住，请运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 网关是远程的，请确保隧道/Tailscale 连接已建立，并且 UI
    指向了正确的 Gateway 网关。参见 [????](/zh-CN/gateway/remote)。

  </Accordion>

  <Accordion title="我能把现有设置迁移到新机器（Mac mini）而不用重新走 onboarding 吗？">
    可以。复制**状态目录**和**工作区**，然后运行一次 Doctor。这会
    保持你的机器人“完全一样”（记忆、会话历史、认证和渠道
    状态），前提是你复制了**这两个位置**：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 网关服务。

    这会保留配置、认证配置文件、WhatsApp 凭据、会话和记忆。如果你处于
    远程模式，请记住会话存储和工作区都归 Gateway 网关主机所有。

    **重要：** 如果你只是把工作区提交/推送到 GitHub，那么你备份的是
    **记忆 + 引导文件**，但**不包括**会话历史或认证信息。那些内容位于
    `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关内容： [迁移指南](/zh-CN/install/migrating)、[磁盘上的文件存储位置](#where-things-live-on-disk)、
    [智能体工作区](/zh-CN/concepts/agent-workspace)、[Doctor](/zh-CN/gateway/doctor)、
    [远程模式](/zh-CN/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里可以看到最新版本的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目位于顶部。如果最上方部分标记为 **Unreleased**，则下一节带日期的
    内容就是最新发布版本。条目按 **Highlights**、**Changes** 和
    **Fixes** 分组（必要时还会包含 docs/other 等分组）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接会被 Xfinity
    Advanced Security 错误地阻止访问 `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。
    也请帮助我们解除拦截：在这里报告 [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档在 GitHub 上有镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="stable 和 beta 的区别">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是两条独立代码线：

    - `latest` = stable
    - `beta` = 用于测试的早期构建

    通常，stable 版本会先落到 **beta**，然后通过一次显式
    提升步骤，将同一版本移动到 `latest`。维护者也可以在需要时
    直接发布到 `latest`。这就是为什么 beta 和 stable 在提升后可能会
    指向**同一个版本**。

    查看变更：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于安装一行命令以及 beta 与 dev 的区别，请参见下方折叠项。

  </Accordion>

  <Accordion title="如何安装 beta 版本？beta 和 dev 有什么区别？">
    **Beta** 是 npm dist-tag `beta`（在提升后可能与 `latest` 相同）。
    **Dev** 是 `main` 分支不断前进的最新状态（git）；发布到 npm 时，它使用 dist-tag `dev`。

    一行命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装器（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多细节： [开发渠道](/zh-CN/install/development-channels) 和 [安装器标志](/zh-CN/install/installer)。

  </Accordion>

  <Accordion title="如何尝试最新版本？">
    两种方式：

    1. **Dev 渠道（git 检出）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支，并从源码更新。

    2. **可修改安装（通过安装站点）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这样你会得到一个本地仓库，可自行编辑，然后通过 git 更新。

    如果你更喜欢手动 clean clone，请使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档： [Update](/zh-CN/cli/update)、[开发渠道](/zh-CN/install/development-channels)、
    [安装](/zh-CN/install)。

  </Accordion>

  <Accordion title="安装和 onboarding 通常需要多久？">
    粗略参考：

    - **安装：** 2-5 分钟
    - **Onboarding：** 5-15 分钟，取决于你配置了多少渠道/模型

    如果卡住了，请参考 [安装器卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装器卡住了？如何获得更多反馈？">
    使用**详细输出**重新运行安装器：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带详细输出的 beta 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可修改的（git）安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows（PowerShell）对应方式：

    ```powershell
    # install.ps1 has no dedicated -Verbose flag yet.
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项： [安装器标志](/zh-CN/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示 git not found 或 openclaw not recognized">
    Windows 上有两个常见问题：

    **1）npm 错误 spawn git / git not found**

    - 安装 **Git for Windows**，并确保 `git` 已加入 PATH。
    - 关闭并重新打开 PowerShell，然后重新运行安装器。

    **2）安装后 openclaw is not recognized**

    - 你的 npm 全局 bin 目录没有加入 PATH。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录加入你的用户 PATH（Windows 上不需要加 `\bin` 后缀；大多数系统中它是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果你想要最顺滑的 Windows 安装体验，请使用 **WSL2** 而不是原生 Windows。
    文档： [Windows](/zh-CN/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示中文乱码——我该怎么办？">
    这通常是原生 Windows shell 的控制台代码页不匹配所致。

    症状：

    - `system.run`/`exec` 输出中的中文显示为乱码
    - 同一命令在另一个终端配置中看起来正常

    PowerShell 快速解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Gateway 网关并重试命令：

    ```powershell
    openclaw gateway restart
    ```

    如果在最新版本的 OpenClaw 上仍能复现，请在这里跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题——我该如何得到更好的答案？">
    使用**可修改的（git）安装**，这样你在本地就拥有完整源码和文档，然后
    在_该文件夹内_向你的机器人（或 Claude/Codex）提问，这样它就能读取仓库并给出准确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多细节： [安装](/zh-CN/install) 和 [安装器标志](/zh-CN/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 OpenClaw？">
    简短回答：按 Linux 指南操作，然后运行 onboarding。

    - Linux 快速路径 + 服务安装： [Linux 应用](/zh-CN/platforms/linux)。
    - 完整演练： [入门指南](/zh-CN/start/getting-started)。
    - 安装器 + 更新： [更新](/zh-CN/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安装 OpenClaw？">
    任意 Linux VPS 都可以。在服务器上安装后，再通过 SSH/Tailscale 访问 Gateway 网关。

    指南： [exe.dev](/zh-CN/install/exe-dev)、[Hetzner](/zh-CN/install/hetzner)、[Fly.io](/zh-CN/install/fly)。
    远程访问： [????](/zh-CN/gateway/remote)。

  </Accordion>

  <Accordion title="云端/VPS 安装指南在哪里？">
    我们保留了一个**托管中心**，收录常见提供商。选择一个并跟随指南：

    - [Linux ???](/zh-CN/vps)（所有提供商集中在一处）
    - [Fly.io](/zh-CN/install/fly)
    - [Hetzner](/zh-CN/install/hetzner)
    - [exe.dev](/zh-CN/install/exe-dev)

    它在云端的工作方式是：**Gateway 网关运行在服务器上**，而你通过
    Control UI（或 Tailscale/SSH）从笔记本/手机访问它。你的状态 + 工作区
    存储在服务器上，所以请将主机视为事实来源并进行备份。

    你可以将 **nodes**（Mac/iOS/Android/headless）配对到该云端 Gateway 网关，
    以访问本地屏幕/摄像头/canvas，或在笔记本上运行命令，同时仍将
    Gateway 网关保留在云端。

    中心页： [平台](/zh-CN/platforms)。远程访问： [????](/zh-CN/gateway/remote)。
    节点： [??](/zh-CN/nodes)、[Nodes CLI](/zh-CN/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自己更新自己吗？">
    简短回答：**可以，但不推荐**。更新流程可能会重启
    Gateway 网关（这会断开当前会话），可能需要一个干净的 git 检出，还
    可能要求确认。更安全的做法是由操作员在 shell 中运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果你必须从智能体自动化执行：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档： [Update](/zh-CN/cli/update)、[更新](/zh-CN/install/updating)。

  </Accordion>

  <Accordion title="onboarding 实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导你完成：

    - **模型/认证设置**（提供商 OAuth、API 密钥、Anthropic setup-token，以及 LM Studio 等本地模型选项）
    - **工作区**位置 + 引导文件
    - **Gateway 网关设置**（绑定/端口/认证/Tailscale）
    - **渠道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及内置渠道插件如 QQ Bot）
    - **守护进程安装**（macOS 上为 LaunchAgent；Linux/WSL2 上为 systemd user unit）
    - **健康检查**和 **Skills** 选择

    如果你配置的模型未知或缺少认证信息，它还会给出警告。

  </Accordion>

  <Accordion title="运行这个需要 Claude 或 OpenAI 订阅吗？">
    不需要。你可以通过**API 密钥**（Anthropic/OpenAI/其他）运行 OpenClaw，或者使用
    **纯本地模型**，这样你的数据会保留在设备上。订阅（Claude
    Pro/Max 或 OpenAI Codex）只是用于认证这些提供商的可选方式。

    对于 OpenClaw 中的 Anthropic，实际区分是：

    - **Anthropic API key**：普通 Anthropic API 计费
    - **OpenClaw 中的 Claude CLI / Claude 订阅认证**：Anthropic 工作人员
      告诉我们这种用法再次被允许，且除非 Anthropic 发布新
      政策，否则 OpenClaw 会将 `claude -p`
      用法视为对该集成已获认可的方式

    对于长期运行的 Gateway 网关主机来说，Anthropic API key 仍然是
    更可预测的设置方式。OpenAI Codex OAuth 被明确支持用于
    OpenClaw 这类外部工具。

    OpenClaw 还支持其他托管的订阅式选项，包括
    **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和
    **Z.AI / GLM Coding Plan**。

    文档： [Anthropic](/zh-CN/providers/anthropic)、[OpenAI](/zh-CN/providers/openai)、
    [Qwen Cloud](/zh-CN/providers/qwen)、
    [MiniMax](/zh-CN/providers/minimax)、[GLM 模型](/zh-CN/providers/glm)、
    [本地模型](/zh-CN/gateway/local-models)、[模型](/zh-CN/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    可以。

    Anthropic 工作人员告诉我们，OpenClaw 风格的 Claude CLI 用法再次被允许，因此
    除非 Anthropic 发布新政策，否则 OpenClaw 会将 Claude 订阅认证和 `claude -p`
    用法视为该集成已获认可的方式。如果你希望得到最可预测的服务器端设置，
    仍建议改用 Anthropic API key。

  </Accordion>

  <Accordion title="支持 Claude 订阅认证（Claude Pro 或 Max）吗？">
    支持。

    Anthropic 工作人员告诉我们，这种用法再次被允许，因此 OpenClaw 会将
    Claude CLI 复用和 `claude -p` 用法视为该集成中已获认可的方式，
    除非 Anthropic 发布新的政策。

    Anthropic setup-token 仍然是 OpenClaw 支持的 token 路径之一，但在条件允许时，OpenClaw 现在更偏好复用 Claude CLI 和 `claude -p`。
    对于生产或多用户工作负载，Anthropic API key 认证仍然是
    更安全、更可预测的选择。如果你想在 OpenClaw 中使用其他订阅式托管
    选项，请参见 [OpenAI](/zh-CN/providers/openai)、[Qwen / Model
    Cloud](/zh-CN/providers/qwen)、[MiniMax](/zh-CN/providers/minimax) 和 [GLM
    Models](/zh-CN/providers/glm)。

  </Accordion>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>
<Accordion title="为什么我会看到来自 Anthropic 的 HTTP 429 rate_limit_error？">
这意味着你当前窗口内的 **Anthropic 配额/速率限制** 已耗尽。如果你
使用的是 **Claude CLI**，请等待窗口重置或升级你的套餐。如果你
使用的是 **Anthropic API key**，请检查 Anthropic Console
中的使用量/计费情况，并在需要时提高限制。

    如果消息具体是：
    `Extra usage is required for long context requests`，说明请求正在尝试使用
    Anthropic 的 1M 上下文 beta（`context1m: true`）。这只有在你的
    凭据具备长上下文计费资格时才可用（API key 计费，或
    启用了 Extra Usage 的 OpenClaw Claude 登录路径）。

    提示：设置一个**回退模型**，这样在某个提供商遭遇速率限制时，OpenClaw 仍可继续回复。
    参见 [Models](/zh-CN/cli/models)、[OAuth](/zh-CN/concepts/oauth)，以及
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/zh-CN/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion title="支持 AWS Bedrock 吗？">
    支持。OpenClaw 内置了 **Amazon Bedrock (Converse)** 提供商。当存在 AWS 环境标记时，OpenClaw 可自动发现支持流式/文本的 Bedrock 模型目录，并将其合并为隐式的 `amazon-bedrock` 提供商；否则你也可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或手动添加一个提供商条目。参见 [Amazon Bedrock](/zh-CN/providers/bedrock) 和 [模型提供商](/zh-CN/providers/models)。如果你更偏好托管式密钥流程，在 Bedrock 前面放一个兼容 OpenAI 的代理也仍是有效方案。
  </Accordion>

  <Accordion title="Codex 认证是如何工作的？">
    OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code (Codex)**。Onboarding 可运行 OAuth 流程，并会在适当时将默认模型设为 `openai-codex/gpt-5.4`。参见 [模型提供商](/zh-CN/concepts/model-providers) 和 [新手引导（CLI）](/zh-CN/start/wizard)。
  </Accordion>

  <Accordion title="为什么 ChatGPT GPT-5.4 不会在 OpenClaw 中解锁 openai/gpt-5.4？">
    OpenClaw 将这两条路径分开处理：

    - `openai-codex/gpt-5.4` = ChatGPT/Codex OAuth
    - `openai/gpt-5.4` = 直接 OpenAI Platform API

    在 OpenClaw 中，ChatGPT/Codex 登录接入的是 `openai-codex/*` 路径，
    而不是直接的 `openai/*` 路径。如果你想在
    OpenClaw 中使用直接 API 路径，请设置 `OPENAI_API_KEY`（或等效的 OpenAI 提供商配置）。
    如果你想在 OpenClaw 中使用 ChatGPT/Codex 登录，请使用 `openai-codex/*`。

  </Accordion>

  <Accordion title="为什么 Codex OAuth 限额可能与 ChatGPT 网页版不同？">
    `openai-codex/*` 使用 Codex OAuth 路径，其可用配额窗口由
    OpenAI 管理，并取决于套餐。在实践中，即使两者绑定的是同一账号，
    这些限制也可能与 ChatGPT 网站/应用中的体验不同。

    OpenClaw 可以在
    `openclaw models status` 中显示当前可见的提供商使用量/配额窗口，但它不会虚构或标准化
    ChatGPT 网页版权益来充当直接 API 访问。如果你想使用直接的 OpenAI Platform
    计费/限额路径，请使用带 API key 的 `openai/*`。

  </Accordion>

  <Accordion title="支持 OpenAI 订阅认证（Codex OAuth）吗？">
    支持。OpenClaw 完全支持 **OpenAI Code (Codex) 订阅 OAuth**。
    OpenAI 明确允许在 OpenClaw 这类外部工具/工作流中
    使用订阅 OAuth。Onboarding 可以为你运行 OAuth 流程。

    参见 [OAuth](/zh-CN/concepts/oauth)、[模型提供商](/zh-CN/concepts/model-providers) 和 [新手引导（CLI）](/zh-CN/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是**插件认证流程**，而不是在 `openclaw.json` 中配置 client id 或 secret。

    步骤：

    1. 在本地安装 Gemini CLI，使 `gemini` 出现在 `PATH` 中
       - Homebrew：`brew install gemini-cli`
       - npm：`npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，请在 Gateway 网关主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会将 OAuth token 存储到 Gateway 网关主机上的认证配置文件中。详细信息： [模型提供商](/zh-CN/concepts/model-providers)。

  </Accordion>

  <Accordion title="本地模型适合日常闲聊吗？">
    通常不适合。OpenClaw 需要大上下文 + 强安全性；小模型会截断并泄漏。如果你一定要用，请在本地（LM Studio）运行你能支持的**最大**模型版本，并参见 [/gateway/local-models](/zh-CN/gateway/local-models)。更小/量化更重的模型会增加 prompt injection 风险——参见 [??](/zh-CN/gateway/security)。
  </Accordion>

  <Accordion title="如何让托管模型流量保留在特定地区？">
    请选择固定地区的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供了美国托管选项；选择美国托管变体即可将数据保留在该区域。你仍可通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些提供商一并列出，这样在遵循你选定区域提供商的同时，也能保留回退能力。
  </Accordion>

  <Accordion title="安装这个一定要买一台 Mac Mini 吗？">
    不需要。OpenClaw 可运行在 macOS 或 Linux 上（Windows 通过 WSL2）。Mac mini 是可选项——有些人
    会买一台作为长期在线主机，但小型 VPS、家用服务器或 Raspberry Pi 级别设备也都可以。

    只有在你需要 **仅限 macOS 的工具** 时才一定要有 Mac。对于 iMessage，请使用 [BlueBubbles](/zh-CN/channels/bluebubbles)（推荐）——BlueBubbles 服务器运行在任意 Mac 上，而 Gateway 网关可以运行在 Linux 或其他地方。如果你还想使用其他仅限 macOS 的工具，请在 Mac 上运行 Gateway 网关，或配对一个 macOS 节点。

    文档： [BlueBubbles](/zh-CN/channels/bluebubbles)、[??](/zh-CN/nodes)、[远程控制](/zh-CN/platforms/mac/remote)。

  </Accordion>

  <Accordion title="要支持 iMessage，一定需要 Mac mini 吗？">
    你需要**某种 macOS 设备**并登录到 Messages。它**不一定**是 Mac mini——
    任意 Mac 都可以。对于 iMessage，**请使用 [BlueBubbles](/zh-CN/channels/bluebubbles)**（推荐）——BlueBubbles 服务器运行在 macOS 上，而 Gateway 网关可运行在 Linux 或其他地方。

    常见设置：

    - 在 Linux/VPS 上运行 Gateway 网关，在任意已登录 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果你想要最简单的单机设置，也可以把所有内容都运行在这台 Mac 上。

    文档： [BlueBubbles](/zh-CN/channels/bluebubbles)、[??](/zh-CN/nodes)、
    [远程控制](/zh-CN/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我买一台 Mac mini 来运行 OpenClaw，我可以把它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway 网关**，而你的 MacBook Pro 可以作为
    **节点**（配套设备）连接。节点不运行 Gateway 网关——它们提供
    额外能力，例如该设备上的屏幕/摄像头/canvas 和 `system.run`。

    常见模式：

    - Gateway 网关运行在 Mac mini 上（长期在线）。
    - MacBook Pro 运行 macOS 应用或 node host，并与 Gateway 网关配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档： [??](/zh-CN/nodes)、[Nodes CLI](/zh-CN/cli/nodes)。

  </Accordion>

  <Accordion title="可以使用 Bun 吗？">
    **不推荐**使用 Bun。我们观察到了运行时 bug，特别是在 WhatsApp 和 Telegram 方面。
    对于稳定运行的 Gateway 网关，请使用 **Node**。

    如果你仍想试验 Bun，请只在非生产 Gateway 网关上尝试，
    并且不要启用 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 里应该填什么？">
    `channels.telegram.allowFrom` 应填写**人工发送者的 Telegram 用户 ID**（数字），而不是机器人用户名。

    Onboarding 接受 `@username` 输入，并会将其解析为数字 ID，但 OpenClaw 授权只使用数字 ID。

    更安全的方式（无需第三方机器人）：

    - 先给你的机器人发私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 给你的机器人发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方方式（隐私性更差）：

    - 私信 `@userinfobot` 或 `@getidsbot`。

    参见 [/channels/telegram](/zh-CN/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion title="多个人可以用同一个 WhatsApp 号码配不同的 OpenClaw 实例吗？">
    可以，通过**多智能体路由**实现。将每个发送者的 WhatsApp **私信**（peer `kind: "direct"`，发送者 E.164 如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都会拥有自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账号**，而私信访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）则在每个 WhatsApp 账号层面全局生效。参见 [多智能体路由](/zh-CN/concepts/multi-agent) 和 [WhatsApp](/zh-CN/channels/whatsapp)。
  </Accordion>

  <Accordion title='我可以运行一个“快速聊天”智能体，再运行一个“用于编码的 Opus”智能体吗？'>
    可以。使用多智能体路由：给每个智能体分配自己的默认模型，然后将入站路由（提供商账号或特定 peer）绑定到各自智能体。配置示例见 [多智能体路由](/zh-CN/concepts/multi-agent)。另见 [模型](/zh-CN/concepts/models) 和 [??](/zh-CN/gateway/configuration)。
  </Accordion>

  <Accordion title="Homebrew 在 Linux 上可用吗？">
    可以。Homebrew 支持 Linux（Linuxbrew）。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样在非登录 shell 中也能解析 `brew` 安装的工具。
    较新的构建版本还会在 Linux systemd 服务中预置常见用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在已设置时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可修改的 git 安装与 npm install 的区别">
    - **可修改的（git）安装：** 完整源码检出，可编辑，最适合贡献者。
      你可在本地构建，也可修改代码/文档。
    - **npm install：** 全局 CLI 安装，不包含仓库，最适合“只想直接跑起来”。
      更新来自 npm dist-tags。

    文档： [入门指南](/zh-CN/start/getting-started)、[更新](/zh-CN/install/updating)。

  </Accordion>

  <Accordion title="以后可以在 npm 安装和 git 安装之间切换吗？">
    可以。安装另一种形式后，运行 Doctor，让 Gateway 网关服务指向新的入口点。
    这**不会删除你的数据**——它只会更改 OpenClaw 的代码安装方式。你的状态
    （`~/.openclaw`）和工作区（`~/.openclaw/workspace`）都不会受到影响。

    从 npm 切换到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    从 git 切换到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 会检测 Gateway 网关服务入口点不匹配，并提供重写服务配置以匹配当前安装的选项（在自动化场景中请使用 `--repair`）。

    备份提示：参见 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="Gateway 网关应该运行在我的笔记本上还是 VPS 上？">
    简短回答：**如果你希望 24/7 稳定运行，就用 VPS**。如果你想要
    最低门槛，并且可以接受睡眠/重启带来的影响，那就在本地运行。

    **笔记本（本地 Gateway 网关）**

    - **优点：** 无服务器成本、可直接访问本地文件、能看到实时浏览器窗口。
    - **缺点：** 睡眠/网络中断 = 断开连接，操作系统更新/重启会中断，机器必须保持唤醒。

    **VPS / 云端**

    - **优点：** 长期在线、网络稳定、不会受笔记本睡眠影响、更容易持续运行。
    - **缺点：** 通常是无头环境（需用截图代替）、只能远程访问文件、你必须通过 SSH 更新。

    **OpenClaw 专属说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都可正常运行。唯一真正的权衡是 **无头浏览器** 还是可见窗口。参见 [?????](/zh-CN/tools/browser)。

    **推荐默认方案：** 如果你之前遇到过 Gateway 网关断连，选 VPS。若你正在主动使用 Mac，并且希望访问本地文件或通过可见浏览器进行 UI 自动化，本地运行也非常适合。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    不是必须，但**为了可靠性和隔离性，推荐这样做**。

    - **专用主机（VPS/Mac mini/Pi）：** 长期在线、较少受睡眠/重启影响、权限更干净、更容易持续运行。
    - **共享的笔记本/台式机：** 完全可以用于测试和主动使用，但机器睡眠或更新时要预期出现暂停。

    如果你想兼顾两者，可以将 Gateway 网关保留在专用主机上，并将你的笔记本配对为 **node**，提供本地 screen/camera/exec 工具。参见 [??](/zh-CN/nodes)。
    安全建议请阅读 [??](/zh-CN/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低要求和推荐操作系统是什么？">
    OpenClaw 非常轻量。对于基本的 Gateway 网关 + 一个聊天渠道：

    - **绝对最低：** 1 vCPU、1GB 内存、约 500MB 磁盘。
    - **推荐：** 1-2 vCPU、2GB 内存或更多，以获得额外余量（日志、媒体、多渠道）。Node 工具和浏览器自动化可能比较吃资源。

    操作系统：使用 **Ubuntu LTS**（或任意现代 Debian/Ubuntu）。Linux 安装路径在这些系统上测试最充分。

    文档： [Linux 应用](/zh-CN/platforms/linux)、[Linux ???](/zh-CN/vps)。

  </Accordion>

  <Accordion title="我可以在虚拟机中运行 OpenClaw 吗？需要什么配置？">
    可以。把虚拟机视为 VPS 即可：它需要保持在线、可访问，并拥有足够的
    内存来运行 Gateway 网关以及你启用的任何渠道。

    基本建议：

    - **绝对最低：** 1 vCPU、1GB 内存。
    - **推荐：** 如果你运行多个渠道、浏览器自动化或媒体工具，请使用 2GB 或更多内存。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果你使用 Windows，**WSL2 是最容易的类虚拟机部署方式**，并且工具兼容性最好。
    参见 [Windows](/zh-CN/platforms/windows)、[Linux ???](/zh-CN/vps)。
    如果你是在虚拟机中运行 macOS，请参见 [macOS VM](/zh-CN/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段话解释，什么是 OpenClaw？">
    OpenClaw 是一个运行在你自己设备上的个人 AI 助手。它可在你已经使用的消息界面中回复你（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及内置渠道插件如 QQ Bot），并且还可以在受支持的平台上提供语音 + 实时 Canvas。**Gateway 网关** 是长期在线的控制平面；这个助手本身才是产品。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不是“只是一个 Claude 包装器”。它是一个**本地优先的控制平面**，让你可以在**自己的硬件上**
    运行功能强大的助手，并通过你已经使用的聊天应用访问它，同时拥有
    有状态会话、记忆和工具——而无需把你的工作流控制权交给托管式
    SaaS。

    亮点：

    - **你的设备，你的数据：** Gateway 网关可运行在任何你想放置的位置（Mac、Linux、VPS），并将
      工作区 + 会话历史保留在本地。
    - **真正的渠道，而不是网页沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      以及受支持平台上的移动端语音和 Canvas。
    - **模型无关：** 可使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持按智能体路由
      和故障切换。
    - **纯本地选项：** 可运行本地模型，从而让**所有数据都保留在你的设备上**。
    - **多智能体路由：** 可按渠道、账号或任务拆分不同智能体，每个智能体拥有自己的
      工作区和默认设置。
    - **开源且可修改：** 可检查、扩展、自托管，不受厂商锁定。

    文档： [Gateway ??????](/zh-CN/gateway)、[??](/zh-CN/channels)、[多智能体](/zh-CN/concepts/multi-agent)、
    [记忆](/zh-CN/concepts/memory)。

  </Accordion>

  <Accordion title="我刚搭建好——第一步应该做什么？">
    很适合的第一批项目有：

    - 搭建一个网站（WordPress、Shopify，或简单静态站点）。
    - 做一个移动应用原型（大纲、界面、API 规划）。
    - 整理文件和文件夹（清理、命名、打标签）。
    - 连接 Gmail 并自动生成摘要或后续跟进。

    它可以处理大型任务，但最佳方式仍是将任务拆分成多个阶段，并
    使用子智能体并行完成。

  </Accordion>

  <Accordion title="OpenClaw 最常见的五个日常使用场景是什么？">
    日常中的高价值场景通常包括：

    - **个人简报：** 对你关心的收件箱、日历和新闻进行摘要。
    - **调研和起草：** 快速调研、总结，以及邮件或文档的初稿。
    - **提醒和跟进：** 由 cron 或 heartbeat 驱动的提示和检查清单。
    - **浏览器自动化：** 填表、收集数据、重复执行网页任务。
    - **跨设备协作：** 从手机发出任务，让 Gateway 网关在服务器上执行，然后在聊天中收回结果。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 做获客、外联、广告和博客吗？">
    可以用于**调研、筛选和起草**。它可以扫描网站、建立短名单、
    总结潜在客户信息，并撰写外联或广告文案草稿。

    对于**外联或广告投放**，请始终让人参与其中。避免垃圾信息，遵守当地法律和
    平台政策，并在发送前检查所有内容。最安全的模式是让
    OpenClaw 起草，而由你审批。

    文档： [??](/zh-CN/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，它在 Web 开发方面有什么优势？">
    OpenClaw 是一个**个人助手**和协同层，而不是 IDE 替代品。若你想在仓库中获得
    最快的直接编码循环，请使用 Claude Code 或 Codex。需要
    持久记忆、跨设备访问和工具编排时，请使用 OpenClaw。

    优势：

    - **持久记忆 + 工作区**，跨会话保留
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、hooks）
    - **始终在线的 Gateway 网关**（可运行在 VPS 上，随时随地交互）
    - 通过 **Nodes** 获取本地浏览器/屏幕/摄像头/exec

    展示页： [https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 和自动化

<AccordionGroup>
  <Accordion title="如何自定义 Skills，同时不把仓库弄脏？">
    使用托管覆盖，而不是直接编辑仓库副本。将你的修改放到 `~/.openclaw/skills/<name>/SKILL.md`（或通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加一个文件夹）。优先级顺序为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置 → `skills.load.extraDirs`，因此托管覆盖会在不触碰 git 的情况下优先于内置 Skills。如果你需要全局安装某个 skill，但只希望部分智能体可见，请把共享副本放在 `~/.openclaw/skills` 中，再用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有真正适合上游的修改，才应该放进仓库并以 PR 形式提交。
  </Accordion>

  <Accordion title="可以从自定义文件夹加载 Skills 吗？">
    可以。在 `~/.openclaw/openclaw.json` 中通过 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 会在下一次会话中将其视为 `<workspace>/skills`。如果某个 skill 只应对特定智能体可见，请结合 `agents.defaults.skills` 或 `agents.list[].skills` 使用。
  </Accordion>

  <Accordion title="如何为不同任务使用不同模型？">
    当前支持的模式包括：

    - **Cron jobs**：隔离任务可为每个任务设置 `model` 覆盖。
    - **子智能体**：将任务路由到拥有不同默认模型的独立智能体。
    - **按需切换**：使用 `/model` 随时切换当前会话模型。

    参见 [????](/zh-CN/automation/cron-jobs)、[多智能体路由](/zh-CN/concepts/multi-agent) 和 [????](/zh-CN/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行重任务时卡住了。如何把这些工作卸载出去？">
    对于长时间运行或并行任务，请使用**子智能体**。子智能体会在自己的会话中运行，
    返回摘要，并让你的主聊天保持响应。

    你可以让机器人“为这个任务生成一个子智能体”，或者使用 `/subagents`。
    在聊天中使用 `/status` 可查看 Gateway 网关当前正在做什么（以及它是否繁忙）。

    token 提示：长任务和子智能体都会消耗 token。如果成本是重点，请通过 `agents.defaults.subagents.model` 为子智能体设置一个
    更便宜的模型。

    文档： [子智能体](/zh-CN/tools/subagents)、[后台任务](/zh-CN/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 中绑定到线程的子智能体会话是如何工作的？">
    使用线程绑定。你可以将一个 Discord 线程绑定到某个子智能体或会话目标，这样该线程中的后续消息会一直留在那个已绑定会话上。

    基本流程：

    - 使用 `sessions_spawn` 时传入 `thread: true`（如需持久后续跟进，还可加上 `mode: "session"`）进行生成。
    - 或手动通过 `/focus <target>` 绑定。
    - 使用 `/agents` 查看绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消 focus。
    - 使用 `/unfocus` 解除线程绑定。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档： [子智能体](/zh-CN/tools/subagents)、[Discord](/zh-CN/channels/discord)、[????](/zh-CN/gateway/configuration-reference)、[????](/zh-CN/tools/slash-commands)。

  </Accordion>

  <Accordion title="子智能体已经完成，但完成通知发错地方了，或者根本没发出来。我该检查什么？">
    先检查解析出的请求方路由：

    - 完成模式的子智能体投递会优先选择任何已绑定的线程或对话路由（如果存在）。
    - 如果完成来源只携带了渠道，OpenClaw 会回退到请求方会话存储的路由（`lastChannel` / `lastTo` / `lastAccountId`），从而让定向投递仍然可能成功。
    - 如果既没有已绑定路由，也没有可用的已存储路由，定向投递可能失败，结果会回退到排队式会话投递，而不是立即发到聊天中。
    - 无效或过期目标仍可能强制回退到队列，或导致最终投递失败。
    - 如果子任务最后一条可见 assistant 回复恰好是静默标记 `NO_REPLY` / `no_reply`，或恰好是 `ANNOUNCE_SKIP`，OpenClaw 会有意抑制该通知，而不是发布先前陈旧的进度信息。
    - 如果子任务在只进行了工具调用后超时，则通知可能会折叠成一个简短的部分进度摘要，而不是重放原始工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档： [子智能体](/zh-CN/tools/subagents)、[后台任务](/zh-CN/automation/tasks)、[会话工具](/zh-CN/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发。我该检查什么？">
    Cron 在 Gateway 网关进程内运行。如果 Gateway 网关没有持续运行，
    定时任务就不会执行。

    检查清单：

    - 确认已启用 cron（`cron.enabled`），且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway 网关是否 24/7 运行（没有睡眠/重启）。
    - 验证任务的时区设置（`--tz` 与宿主机时区）。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档： [????](/zh-CN/automation/cron-jobs)、[自动化与任务](/zh-CN/automation)。

  </Accordion>

  <Accordion title="Cron 触发了，但没有向渠道发送任何内容。为什么？">
    先检查投递模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不期望有任何外部消息。
    - 缺失或无效的通知目标（`channel` / `to`）表示执行器跳过了出站投递。
    - 渠道认证失败（`unauthorized`、`Forbidden`）表示执行器尝试投递了，但被凭据阻止。
    - 静默的隔离结果（仅有 `NO_REPLY` / `no_reply`）会被视为有意不投递，因此执行器也会抑制排队回退投递。

    对于隔离的 cron job，执行器负责最终投递。智能体应返回
    一段纯文本摘要，由执行器发送。`--no-deliver` 会使
    结果保持内部使用；它并不会让智能体改为直接通过
    message 工具自行发送。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档： [????](/zh-CN/automation/cron-jobs)、[后台任务](/zh-CN/automation/tasks)。

  </Accordion>

  <Accordion title="为什么某次隔离的 cron 运行切换了模型，或重试了一次？">
    这通常是实时模型切换路径，而不是重复调度。

    隔离的 cron 可在运行中遇到 `LiveSessionModelSwitchError` 时，持久化
    运行时模型切换并重试。该重试会保留切换后的
    provider/model；如果切换还携带了新的认证配置文件覆盖，cron
    也会先持久化它，然后再重试。

    相关选择规则：

    - 若适用，Gmail hook 模型覆盖优先级最高。
    - 然后是每个任务的 `model`。
    - 然后是任何已存储的 cron 会话模型覆盖。
    - 最后才是普通的智能体/默认模型选择。

    重试循环是有边界的。初次尝试后再加 2 次切换重试，
    cron 就会中止，而不是无限循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档： [????](/zh-CN/automation/cron-jobs)、[cron CLI](/zh-CN/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 Skills？">
    使用原生 `openclaw skills` 命令，或直接将 Skills 放入你的工作区。macOS 的 Skills UI 在 Linux 上不可用。
    Skills 浏览地址： [https://clawhub.ai](https://clawhub.ai)。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 会写入当前工作区下的 `skills/`
    目录。只有当你想发布或
    同步自己的 Skills 时，才需要单独安装 `clawhub` CLI。对于多个智能体共享的安装，请将 skill 放在
    `~/.openclaw/skills` 下，并在需要缩小可见范围时使用 `agents.defaults.skills` 或
    `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划运行任务，或持续在后台运行吗？">
    可以。使用 Gateway 网关调度器：

    - **Cron jobs**：用于定时或周期性任务（重启后仍然保留）。
    - **Heartbeat**：用于“主会话”的周期性检查。
    - **Isolated jobs**：用于自主智能体，可发布摘要或投递到聊天中。

    文档： [????](/zh-CN/automation/cron-jobs)、[自动化与任务](/zh-CN/automation)、
    [Heartbeat](/zh-CN/gateway/heartbeat)。

  </Accordion>

  <Accordion title="可以从 Linux 运行仅限 Apple macOS 的 Skills 吗？">
    不能直接运行。macOS Skills 由 `metadata.openclaw.os` 加上所需二进制进行限制，且只有当技能在**Gateway 网关主机**上满足条件时，它们才会出现在系统提示词中。在 Linux 上，`darwin` 专属的 Skills（例如 `apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非你覆盖该限制。

    你有三种受支持的模式：

    **选项 A - 在 Mac 上运行 Gateway 网关（最简单）。**
    在存在 macOS 二进制的地方运行 Gateway 网关，然后从 Linux 通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 连接。由于 Gateway 网关主机是 macOS，这些 Skills 会正常加载。

    **选项 B - 使用 macOS 节点（无需 SSH）。**
    在 Linux 上运行 Gateway 网关，配对一个 macOS 节点（菜单栏应用），并将 **Node Run Commands** 设置为 “Always Ask” 或 “Always Allow”。当节点上存在所需二进制时，OpenClaw 可以将仅限 macOS 的 Skills 视为可用。智能体会通过 `nodes` 工具运行这些 Skills。如果你选择 “Always Ask”，在提示中批准 “Always Allow” 后，该命令会被加入允许列表。

    **选项 C - 通过 SSH 代理 macOS 二进制（高级）。**
    保持 Gateway 网关运行在 Linux 上，但让所需的 CLI 二进制解析为 SSH 包装器，在 Mac 上执行。然后覆盖该 skill，使其允许 Linux，从而保持可用。

    1. 为该二进制创建 SSH 包装器（示例：`memo` 用于 Apple Notes）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将该包装器放入 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
    3. 覆盖该 skill 的 metadata（在工作区或 `~/.openclaw/skills` 中），使其允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动新会话，以刷新 Skills 快照。

  </Accordion>

  <Accordion title="有 Notion 或 HeyGen 集成吗？">
    目前没有内置。

    选项：

    - **自定义 skill / plugin：** 最适合稳定的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：** 无需写代码，但更慢，也更脆弱。

    如果你想按客户保留上下文（代理/机构工作流），一个简单模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好 + 当前工作）。
    - 让智能体在会话开始时先抓取该页面。

    如果你想要原生集成，可以提交功能请求，或构建一个
    面向这些 API 的 skill。

    安装 Skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会落到当前工作区的 `skills/` 目录中。对于多智能体共享的 Skills，请将其放在 `~/.openclaw/skills/<name>/SKILL.md`。如果只希望部分智能体看到某个共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。部分 Skills 依赖通过 Homebrew 安装的二进制；在 Linux 上这意味着 Linuxbrew（见上方 Homebrew Linux 常见问题项）。参见 [Skills](/zh-CN/tools/skills)、[Skills ??](/zh-CN/tools/skills-config) 和 [ClawHub](/zh-CN/tools/clawhub)。

  </Accordion>

  <Accordion title="如何让 OpenClaw 使用我已登录的 Chrome？">
    使用内置的 `user` 浏览器配置文件，它会通过 Chrome DevTools MCP 进行附着：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想使用自定义名称，可创建一个显式 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    这条路径仅限宿主机本地。如果 Gateway 网关运行在其他地方，你需要在浏览器所在机器上运行 node host，或改用远程 CDP。

    `existing-session` / `user` 当前的限制：

    - 操作为 ref 驱动，而不是 CSS 选择器驱动
    - 上传需要 `ref` / `inputRef`，且当前一次仅支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱隔离和记忆

<AccordionGroup>
  <Accordion title="有专门的沙箱隔离文档吗？">
    有。参见 [沙箱隔离](/zh-CN/gateway/sandboxing)。对于 Docker 专属设置（完整 Docker 中的 Gateway 网关或沙箱镜像），请参见 [Docker](/zh-CN/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉功能受限——如何启用完整功能？">
    默认镜像以安全为先，并以 `node` 用户运行，因此它不
    包含系统软件包、Homebrew 或内置浏览器。若要获得更完整的设置：

    - 通过 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，以保留缓存。
    - 通过 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖构建进镜像。
    - 使用内置 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径被持久化。

    文档： [Docker](/zh-CN/install/docker)、[?????](/zh-CN/tools/browser)。

  </Accordion>

  <Accordion title="我能用一个智能体，让私信保持私有，而群组公开/沙箱隔离吗？">
    可以——前提是你的私有流量是**私信**，公开流量是**群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，这样群组/渠道会话（非主键）会在 Docker 中运行，而主私信会话仍保留在宿主机。然后通过 `tools.sandbox.tools` 限制沙箱隔离会话中可用的工具。

    设置演练 + 示例配置： [群组：私有私信 + 公共群组](/zh-CN/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考： [????](/zh-CN/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何把宿主机文件夹绑定到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局与每个智能体的 binds 会合并；当 `scope: "shared"` 时，每个智能体的 bind 会被忽略。对敏感内容请使用 `:ro`，并记住 binds 会绕过沙箱文件系统边界。

    OpenClaw 会同时针对规范化路径与通过最深现有祖先路径解析出的规范路径来验证 bind 源。这意味着即使最后一段路径尚不存在，通过符号链接父路径逃逸仍会默认拒绝；并且允许根路径检查在符号链接解析后仍然适用。

    示例和安全说明请参见 [沙箱隔离](/zh-CN/gateway/sandboxing#custom-bind-mounts) 和 [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="记忆是如何工作的？">
    OpenClaw 的记忆其实就是智能体工作区中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中人工整理的长期笔记（仅适用于主/私有会话）

    OpenClaw 还会执行一次**静默的压缩前记忆刷新**，用于提醒模型
    在自动压缩前写入持久笔记。只有在工作区可写时
    才会运行该逻辑（只读沙箱会跳过）。参见 [??](/zh-CN/concepts/memory)。

  </Accordion>

  <Accordion title="记忆总在忘事。怎样才能让它记住？">
    直接让机器人**把这个事实写入记忆**。长期笔记应写入 `MEMORY.md`，
    短期上下文写入 `memory/YYYY-MM-DD.md`。

    这是我们仍在持续改进的区域。提醒模型去保存记忆通常会有帮助；
    它会知道该如何处理。如果它还是忘记，请确认 Gateway 网关在每次运行时
    使用的是同一个工作区。

    文档： [??](/zh-CN/concepts/memory)、[智能体工作区](/zh-CN/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="记忆会永久保存吗？有什么限制？">
    记忆文件存储在磁盘上，在你删除前都会一直保留。限制来自于你的
    存储空间，而不是模型本身。**会话上下文**仍受模型
    上下文窗口限制，因此长对话可能会被压缩或截断。这也是
    为什么需要记忆搜索——它只会将相关部分重新拉回上下文中。

    文档： [??](/zh-CN/concepts/memory)、[???](/zh-CN/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索一定需要 OpenAI API key 吗？">
    只有当你使用 **OpenAI embeddings** 时才需要。Codex OAuth 只覆盖聊天/补全，
    **不**授予 embeddings 访问权限，因此**使用 Codex 登录（OAuth 或
    Codex CLI 登录）**对语义记忆搜索没有帮助。OpenAI embeddings
    仍然需要真实的 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果你没有显式设置提供商，只要 OpenClaw 能解析出 API key（来自
    auth 配置文件、`models.providers.*.apiKey` 或环境变量），它就会自动选择提供商。
    如果能解析出 OpenAI key，它会优先选 OpenAI；否则若能解析出 Gemini key，
    则选 Gemini；再然后是 Voyage，最后是 Mistral。如果没有可用的远程 key，
    记忆搜索会保持禁用，直到你配置完成。如果你已配置了本地模型路径，
    且该路径存在，OpenClaw
    会优先选择 `local`。当你显式设置
    `memorySearch.provider = "ollama"` 时，也支持 Ollama。

    如果你更希望保持本地化，请设置 `memorySearch.provider = "local"`（可选
    再设置 `memorySearch.fallback = "none"`）。如果你想使用 Gemini embeddings，请设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或 local** embeddings
    模型——设置细节请参见 [??](/zh-CN/concepts/memory)。

  </Accordion>
</AccordionGroup>

## 磁盘上的文件存储位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有数据都会保存在本地吗？">
    不会——**OpenClaw 的状态在本地**，但**外部服务仍会看到你发送给它们的内容**。

    - **默认保存在本地：** 会话、记忆文件、配置和工作区都位于 Gateway 网关主机上
      （`~/.openclaw` + 你的工作区目录）。
    - **必须远程处理：** 你发送给模型提供商（Anthropic/OpenAI 等）的消息会进入
      它们的 API，而聊天平台（WhatsApp/Telegram/Slack 等）也会在它们自己的
      服务器上存储消息数据。
    - **你可以控制数据范围：** 使用本地模型可让提示词保留在你的机器上，但渠道
      流量仍会经过对应渠道的服务器。

    相关内容： [智能体工作区](/zh-CN/concepts/agent-workspace)、[??](/zh-CN/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 将数据存储在哪里？">
    一切都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | 路径                                                            | 用途 |
    | --------------------------------------------------------------- | ---- |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置（JSON5） |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到 auth 配置文件中） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 认证配置文件（OAuth、API key，以及可选的 `keyRef`/`tokenRef`） |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | `file` SecretRef 提供商使用的可选文件型 secret 负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容文件（静态 `api_key` 条目会被清理） |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供商状态（例如 `whatsapp/<accountId>/creds.json`） |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个智能体的状态（agentDir + 会话） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（按智能体区分） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（按智能体区分） |

    旧版单智能体路径： `~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    你的**工作区**（AGENTS.md、记忆文件、Skills 等）是分离的，并通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于**智能体工作区**中，而不是 `~/.openclaw`。

    - **工作区（按智能体区分）：** `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（如果没有 `MEMORY.md`，则使用旧版回退 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
    - **状态目录（`~/.openclaw`）：** 配置、渠道/提供商状态、认证配置文件、会话、日志，
      以及共享 Skills（`~/.openclaw/skills`）。

    默认工作区是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘事”，请确认 Gateway 网关每次启动
    使用的是同一个工作区（并记住：远程模式使用的是**Gateway 网关主机上的**
    工作区，而不是你的本地笔记本）。

    提示：如果你希望某种行为或偏好能够持久保留，请让机器人**把它写入
    AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

    参见 [智能体工作区](/zh-CN/concepts/agent-workspace) 和 [??](/zh-CN/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    请将你的**智能体工作区**放入一个**私有** git 仓库，并备份到某个
    私有位置（例如 GitHub 私有仓库）。这样可以保存记忆 + AGENTS/SOUL/USER
    文件，并让你日后恢复这个助手的“心智”。

    **不要**提交 `~/.openclaw` 下的任何内容（凭据、会话、token 或加密 secret 负载）。
    如果你需要完整恢复，请分别备份工作区和状态目录
    （参见上文中的迁移问题）。

    文档： [智能体工作区](/zh-CN/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="如何彻底卸载 OpenClaw？">
    请参见专门指南： [卸载](/zh-CN/install/uninstall)。
  </Accordion>

  <Accordion title="智能体可以在工作区之外工作吗？">
    可以。工作区是**默认 cwd** 和记忆锚点，而不是硬性沙箱。
    相对路径会在工作区内解析，但绝对路径仍可访问其他
    宿主机位置，除非你启用了沙箱隔离。如果你需要隔离，请使用
    [`agents.defaults.sandbox`](/zh-CN/gateway/sandboxing) 或每个智能体的沙箱设置。如果你
    想将某个仓库作为默认工作目录，请将该智能体的
    `workspace` 指向仓库根目录。OpenClaw 仓库本身只是源代码；除非你有意让智能体在其中工作，否则请将
    工作区与仓库分开。

    示例（将仓库作为默认 cwd）：

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="远程模式下：会话存储在哪里？">
    会话状态归**Gateway 网关主机**所有。如果你处于远程模式，你关心的会话存储在远程机器上，而不是本地笔记本上。参见 [会话管理](/zh-CN/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置是什么格式？在哪里？">
    OpenClaw 会从 `$OPENCLAW_CONFIG_PATH`（默认：`~/.openclaw/openclaw.json`）读取一个可选的 **JSON5** 配置：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件不存在，它会使用相对安全的默认值（包括默认工作区 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），现在没有任何监听 / UI 显示 unauthorized'>
    非 loopback 绑定**必须有有效的 Gateway 网关认证路径**。在实践中，这意味着：

    - 共享密钥认证：token 或 password
    - `gateway.auth.mode: "trusted-proxy"`，并且位于配置正确的非 loopback 身份感知反向代理之后

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    注意：

    - `gateway.remote.token` / `.password` **本身不会**启用本地 Gateway 网关认证。
    - 只有在 `gateway.auth.*` 未设置时，本地调用路径才可将 `gateway.remote.*` 用作回退。
    - 对于 password 认证，请设置 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置，但解析失败，则系统会默认关闭（不会被远程回退掩盖）。
    - 共享密钥的 Control UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password` 进行认证（存储于应用/UI 设置中）。Tailscale Serve 或 `trusted-proxy` 等携带身份的模式使用请求头代替。避免把共享密钥放入 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机的 loopback 反向代理仍然**不满足**受信任代理认证要求。受信任代理必须是已配置的非 loopback 来源。

  </Accordion>

  <Accordion title="为什么现在在 localhost 上也需要 token？">
    OpenClaw 默认强制启用 Gateway 网关认证，包括 loopback。正常的默认路径意味着 token 认证：如果没有显式配置认证路径，Gateway 网关启动时会解析为 token 模式并自动生成一个 token，将其保存到 `gateway.auth.token` 中，因此**本地 WS 客户端也必须认证**。这可以阻止其他本地进程调用 Gateway 网关。

    如果你更喜欢其他认证路径，也可以显式选择 password 模式（或者针对非 loopback 身份感知反向代理使用 `trusted-proxy`）。如果你**确实**想要开放 loopback，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 随时可以为你生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="修改配置后必须重启吗？">
    Gateway 网关会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更重启
    - 也支持 `hot`、`restart`、`off`

  </Accordion>

  <Accordion title="如何禁用 CLI 的搞笑标语？">
    在配置中设置 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隐藏标语文本，但保留 banner 标题/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换显示有趣/季节性标语（默认行为）。
    - 如果你想完全不显示 banner，请设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用 web search（以及 web fetch）？">
    `web_fetch` 不需要 API key。`web_search` 则取决于你所选的
    提供商：

    - Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity 和 Tavily 等基于 API 的提供商，需要按正常方式配置 API key。
    - Ollama Web 搜索 不需要 key，但它会使用你配置的 Ollama 主机，并要求执行 `ollama signin`。
    - DuckDuckGo 不需要 key，但它是一个非官方的基于 HTML 的集成。
    - SearXNG 不需要 key/可自托管；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个提供商。
    环境变量方式：

    - Brave：`BRAVE_API_KEY`
    - Exa：`EXA_API_KEY`
    - Firecrawl：`FIRECRAWL_API_KEY`
    - Gemini：`GEMINI_API_KEY`
    - Grok：`XAI_API_KEY`
    - Kimi：`KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - MiniMax Search：`MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY`
    - Perplexity：`PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`
    - SearXNG：`SEARXNG_BASE_URL`
    - Tavily：`TAVILY_API_KEY`

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
        },
        tools: {
          web: {
            search: {
              enabled: true,
              provider: "brave",
              maxResults: 5,
            },
            fetch: {
              enabled: true,
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    提供商专属的 web-search 配置现在位于 `plugins.entries.<plugin>.config.webSearch.*`。
    旧版 `tools.web.search.*` 提供商路径目前仍会为兼容性而暂时加载，但不应再用于新配置。
    Firecrawl 的 web-fetch 回退配置位于 `plugins.entries.firecrawl.config.webFetch.*`。

    注意：

    - 如果你使用允许列表，请加入 `web_search` / `web_fetch` / `x_search` 或 `group:web`。
    - `web_fetch` 默认启用（除非显式禁用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会从可用凭据中自动检测第一个可用的 fetch 回退提供商。当前内置提供商是 Firecrawl。
    - 守护进程会从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档： [Web ??](/zh-CN/tools/web)。

  </Accordion>

  <Accordion title="config.apply 把我的配置清空了。如何恢复并避免再次发生？">
    `config.apply` 会替换**整个配置**。如果你发送的是部分对象，其余所有内容
    都会被移除。

    恢复方式：

    - 从备份恢复（git 或你复制出的 `~/.openclaw/openclaw.json`）。
    - 如果你没有备份，请重新运行 `openclaw doctor`，然后重新配置渠道/模型。
    - 如果这不是你的预期，请提交 bug，并附上你最后已知的配置或任何备份。
    - 本地编码智能体通常也能根据日志或历史重建一个可工作的配置。

    避免方式：

    - 对小改动使用 `openclaw config set`。
    - 对交互式编辑使用 `openclaw configure`。
    - 当你不确定准确路径或字段结构时，先使用 `config.schema.lookup`；它会返回一个浅层 schema 节点以及直接子节点摘要，便于逐层钻取。
    - 对局部 RPC 编辑使用 `config.patch`；只在你确实要整体替换完整配置时使用 `config.apply`。
    - 如果你是在智能体运行中使用仅限 owner 的 `gateway` 工具，它仍会拒绝对 `tools.exec.ask` / `tools.exec.security` 的写入（包括会被归一化到同一受保护 exec 路径的旧版 `tools.bash.*` 别名）。

    文档： [Config](/zh-CN/cli/config)、[Configure](/zh-CN/cli/configure)、[Doctor](/zh-CN/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在多个设备之间运行一个中央 Gateway 网关，并配上专门的工作节点？">
    常见模式是**一个 Gateway 网关**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway 网关（中央）：** 持有渠道（Signal/WhatsApp）、路由和会话。
    - **Nodes（设备）：** Mac、iOS、Android 作为外设连接，暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents（工作节点）：** 负责特定角色的独立“大脑/工作区”（例如“Hetzner 运维”“个人数据”）。
    - **子智能体：** 当你需要并行时，可由主智能体生成后台工作。
    - **TUI：** 连接到 Gateway 网关并切换智能体/会话。

    文档： [??](/zh-CN/nodes)、[????](/zh-CN/gateway/remote)、[多智能体路由](/zh-CN/concepts/multi-agent)、[子智能体](/zh-CN/tools/subagents)、[TUI](/zh-CN/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头运行吗？">
    可以。这是一个配置项：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    默认值为 `false`（有头模式）。无头模式在某些网站上更容易触发反机器人检查。参见 [?????](/zh-CN/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，适用于大多数自动化任务（表单、点击、抓取、登录）。主要差异包括：

    - 没有可见的浏览器窗口（如果需要视觉反馈，请使用截图）。
    - 某些网站在无头模式下对自动化更严格（CAPTCHA、反机器人）。
      例如，X/Twitter 往往会阻止无头会话。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为你的 Brave 二进制路径（或任意基于 Chromium 的浏览器），然后重启 Gateway 网关。
    完整配置示例参见 [?????](/zh-CN/tools/browser#use-brave-or-another-chromium-based-browser)。
  </Accordion>
</AccordionGroup>

## 远程 Gateway 网关和节点

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、Gateway 网关和节点之间传播？">
    Telegram 消息由**Gateway 网关**处理。Gateway 网关运行智能体，只有在需要节点工具时，
    才会通过 **Gateway WebSocket** 调用节点：

    Telegram → Gateway 网关 → 智能体 → `node.*` → 节点 → Gateway 网关 → Telegram

    节点不会看到入站提供商流量；它们只接收节点 RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway 网关托管在远程，我的智能体如何访问我的电脑？">
    简短回答：**把你的电脑配对为一个节点**。Gateway 网关运行在别处，但它可以
    通过 Gateway WebSocket 调用你本地机器上的 `node.*` 工具（screen、camera、system）。

    典型设置：

    1. 在长期在线的主机上运行 Gateway 网关（VPS/家庭服务器）。
    2. 将 Gateway 网关主机和你的电脑放到同一个 tailnet 中。
    3. 确保 Gateway 网关 WS 可达（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用，并以 **Remote over SSH** 模式（或直接 tailnet）
       连接，使其可以注册为节点。
    5. 在 Gateway 网关上批准节点：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；节点通过 Gateway WebSocket 连接。

    安全提醒：配对 macOS 节点意味着允许在该机器上执行 `system.run`。只
    配对你信任的设备，并查看 [??](/zh-CN/gateway/security)。

    文档： [??](/zh-CN/nodes)、[Gateway ????](/zh-CN/gateway/protocol)、[远程控制](/zh-CN/platforms/mac/remote)、[??](/zh-CN/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接，但我收不到任何回复。现在怎么办？">
    先检查基础项：

    - Gateway 网关是否正在运行：`openclaw gateway status`
    - Gateway 网关健康状态：`openclaw status`
    - 渠道健康状态：`openclaw channels status`

    然后验证认证和路由：

    - 如果你使用 Tailscale Serve，请确认 `gateway.auth.allowTailscale` 设置正确。
    - 如果你通过 SSH 隧道连接，请确认本地隧道已建立并指向正确端口。
    - 确认你的允许列表（私信或群组）中包含你的账号。

    文档： [Tailscale](/zh-CN/gateway/tailscale)、[????](/zh-CN/gateway/remote)、[??](/zh-CN/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例（本地 + VPS）可以互相通信吗？">
    可以。虽然没有内置的“bot-to-bot”桥接，但你可以通过几种
    可靠方式把它们连起来：

    **最简单：** 使用两个机器人都可访问的普通聊天渠道（Telegram/Slack/WhatsApp）。
    让机器人 A 给机器人 B 发消息，然后让机器人 B 正常回复。

    **CLI 桥接（通用）：** 运行脚本调用另一个 Gateway 网关的
    `openclaw agent --message ... --deliver`，并将目标指向另一个机器人
    正在监听的聊天。如果其中一个机器人位于远程 VPS，请让你的 CLI
    通过 SSH/Tailscale 指向该远程 Gateway 网关（见 [????](/zh-CN/gateway/remote)）。

    示例模式（在能访问目标 Gateway 网关的机器上运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加一个防护机制，避免两个机器人无休止地相互循环（例如仅在被提及时响应、渠道
    允许列表，或“不要回复机器人消息”的规则）。

    文档： [????](/zh-CN/gateway/remote)、[Agent CLI](/zh-CN/cli/agent)、[?????](/zh-CN/tools/agent-send)。

  </Accordion>

  <Accordion title="多个智能体需要分别用不同 VPS 吗？">
    不需要。一个 Gateway 网关可以托管多个智能体，每个都有自己的工作区、默认模型
    和路由。这是常规设置，比为每个智能体各跑一个 VPS
    更便宜也更简单。

    只有在你需要硬隔离（安全边界）或非常不同、且不希望共享的配置时，
    才应该使用多个 VPS。否则，请保留一个 Gateway 网关，并
    使用多个智能体或子智能体。

  </Accordion>

  <Accordion title="对于远程 VPS，通过 SSH 访问我的个人笔记本，与使用 node 哪个更有好处？">
    有——节点是从远程 Gateway 网关访问你笔记本的一等方案，而且
    它解锁的不只是 shell 访问。Gateway 网关运行在 macOS/Linux（Windows 通过 WSL2）上，并且
    本身很轻量（小型 VPS 或 Raspberry Pi 级设备就够了；4 GB 内存绰绰有余），所以常见
    配置是一个长期在线主机，再加上你的笔记本作为一个 node。

    - **无需入站 SSH。** 节点会主动连接到 Gateway WebSocket，并使用设备配对。
    - **执行控制更安全。** 笔记本上的 `system.run` 受节点允许列表/审批控制。
    - **更多设备工具。** 除了 `system.run`，节点还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 可将 Gateway 网关保留在 VPS 上，但通过笔记本上的 node host 在本地运行 Chrome，或通过 Chrome MCP 连接宿主机上的本地 Chrome。

    SSH 适合临时 shell 访问，但对于持续性的智能体工作流和
    设备自动化来说，节点更简单。

    文档： [??](/zh-CN/nodes)、[Nodes CLI](/zh-CN/cli/nodes)、[?????](/zh-CN/tools/browser)。

  </Accordion>

  <Accordion title="节点会运行一个 gateway 服务吗？">
    不会。除非你有意运行隔离配置文件（参见 [多个 Gateway 网关](/zh-CN/gateway/multiple-gateways)），否则每台主机只应运行**一个 gateway**。节点是连接到
    gateway 的外设（iOS/Android 节点，或菜单栏应用中的 macOS “node mode”）。对于无头 node
    host 和 CLI 控制，请参见 [Node host CLI](/zh-CN/cli/node)。

    对于 `gateway`、`discovery` 和 `canvasHost` 的更改，需要执行完整重启。

  </Accordion>

  <Accordion title="有没有通过 API / RPC 应用配置的方法？">
    有。

    - `config.schema.lookup`：在写入前检查某个配置子树，以及其浅层 schema 节点、匹配到的 UI 提示和直接子节点摘要
    - `config.get`：获取当前快照 + hash
    - `config.patch`：安全的局部更新（大多数 RPC 编辑的首选）；可热重载时热重载，必要时重启
    - `config.apply`：验证并替换整个配置；可热重载时热重载，必要时重启
    - 仅限 owner 的 `gateway` 运行时工具仍然拒绝改写 `tools.exec.ask` / `tools.exec.security`；旧版 `tools.bash.*` 别名会归一化到相同的受保护 exec 路径

  </Accordion>

  <Accordion title="首次安装的最小合理配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的工作区，并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale，并从我的 Mac 连接？">
    最小步骤：

    1. **在 VPS 上安装并登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安装并登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中启用 MagicDNS，这样 VPS 就会有一个稳定名称。
    4. **使用 tailnet 主机名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway 网关 WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想在不通过 SSH 的情况下使用 Control UI，请在 VPS 上启用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会保持 gateway 绑定到 loopback，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/zh-CN/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac 节点连接到远程 Gateway 网关（Tailscale Serve）？">
    Serve 暴露的是 **Gateway Control UI + WS**。节点通过同一个 Gateway 网关 WS 端点连接。

    推荐设置：

    1. **确保 VPS 和 Mac 位于同一 tailnet 中**。
    2. **在 macOS 应用中使用 Remote 模式**（SSH 目标可填写 tailnet 主机名）。
       应用会隧道化 Gateway 网关端口并以节点身份连接。
    3. **在 gateway 上批准该节点：**

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档： [Gateway ????](/zh-CN/gateway/protocol)、[设备发现 + 传输协议](/zh-CN/gateway/discovery)、[远程控制](/zh-CN/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该在第二台笔记本上再安装一套，还是只添加一个 node？">
    如果你只需要在第二台笔记本上获得**本地工具**（screen/camera/exec），那就把它作为
    **node** 添加进来。这样可以保持单一 Gateway 网关，避免重复配置。目前本地 node 工具
    只支持 macOS，但我们计划扩展到其他操作系统。

    只有在你需要**硬隔离**或完全独立的两个机器人时，才应安装第二个 Gateway 网关。

    文档： [??](/zh-CN/nodes)、[Nodes CLI](/zh-CN/cli/nodes)、[多个 Gateway 网关](/zh-CN/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 `.env` 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 会从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录中的 `.env`
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局回退 `.env`

    这两个 `.env` 文件都不会覆盖已有环境变量。

    你也可以在配置中定义内联环境变量（仅当进程环境中缺失时才应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    完整优先级和来源请参见 [/environment](/zh-CN/help/environment)。

  </Accordion>

  <Accordion title="我通过 service 启动 Gateway 网关后，环境变量消失了。怎么办？">
    两个常见解决方法：

    1. 把缺失的键放到 `~/.openclaw/.env` 中，这样即使服务没有继承你的 shell 环境，也能读取到。
    2. 启用 shell 导入（可选的便利功能）：

    ```json5
    {
      env: {
        shellEnv: {
          enabled: true,
          timeoutMs: 15000,
        },
      },
    }
    ```

    这会运行你的登录 shell，并仅导入缺失的预期键名（绝不覆盖）。对应环境变量：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但 models status 显示 "Shell env: off."。为什么？'>
    `openclaw models status` 报告的是是否启用了 **shell 环境导入**。`"Shell env: off"`
    **不**意味着你的环境变量缺失——它只是表示 OpenClaw 不会自动加载
    你的登录 shell。

    如果 Gateway 网关作为服务运行（launchd/systemd），它不会继承你的 shell
    环境。可按以下方式修复：

    1. 将 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或将其加入配置 `env` 块中（仅在缺失时应用）。

    然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 从 `COPILOT_GITHUB_TOKEN` 读取（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
    参见 [?????](/zh-CN/concepts/model-providers) 和 [/environment](/zh-CN/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="如何开始一段全新的对话？">
    发送 `/new` 或 `/reset` 作为单独消息。参见 [会话管理](/zh-CN/concepts/session)。
  </Accordion>

  <Accordion title="如果我从不发送 /new，会话会自动重置吗？">
    会话可在 `session.idleMinutes` 后过期，但该功能**默认禁用**（默认值 **0**）。
    将其设为正值即可启用空闲过期。启用后，空闲期后的**下一条**
    消息会为该聊天键启动一个新的会话 id。
    这不会删除转录内容——只是开始一个新会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法组建一个 OpenClaw 实例团队（一个 CEO 和很多智能体）？">
    有，通过**多智能体路由**和**子智能体**。你可以创建一个协调者
    智能体和多个工作智能体，每个都有自己的工作区和模型。

    不过，最好把它看作一种**有趣的实验**。它会大量消耗 token，而且通常
    不如一个机器人配多个会话高效。我们更推荐的模式是：一个机器人与你对话，
    使用不同会话处理并行工作。必要时，这个机器人
    也可以生成子智能体。

    文档： [多智能体路由](/zh-CN/concepts/multi-agent)、[子智能体](/zh-CN/tools/subagents)、[agents](/zh-CN/cli/agents)。

  </Accordion>

  <Accordion title="为什么任务做到一半时上下文被截断了？如何避免？">
    会话上下文受模型窗口限制。长聊天、大量工具输出或太多
    文件都可能触发压缩或截断。

    有帮助的做法：

    - 让机器人总结当前状态并写入一个文件。
    - 在长任务前使用 `/compact`，切换主题时使用 `/new`。
    - 将重要上下文保存在工作区中，并让机器人重新读取。
    - 对长任务或并行任务使用子智能体，以便主聊天保持更小。
    - 如果这种情况经常发生，请选择上下文窗口更大的模型。

  </Accordion>

  <Accordion title="如何彻底重置 OpenClaw 但保留安装？">
    使用 reset 命令：

    ```bash
    openclaw reset
    ```

    非交互式完整重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行设置：

    ```bash
    openclaw onboard --install-daemon
    ```

    注意：

    - 如果检测到现有配置，Onboarding 也会提供 **Reset**。参见 [新手引导（CLI）](/zh-CN/start/wizard)。
    - 如果你使用了配置文件（`--profile` / `OPENCLAW_PROFILE`），请分别重置每个状态目录（默认是 `~/.openclaw-<profile>`）。
    - Dev 重置：`openclaw gateway --dev --reset`（仅限 dev；会清空 dev 配置 + 凭据 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='我收到 "context too large" 错误——如何重置或压缩？'>
    使用以下方式之一：

    - **压缩**（保留对话，但总结较早的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来指导摘要内容。

    - **重置**（对同一聊天键创建新的会话 ID）：

      ```
      /new
      /reset
      ```

    如果问题持续发生：

    - 启用或调整**会话裁剪**（`agents.defaults.contextPruning`）以裁掉旧工具输出。
    - 使用上下文窗口更大的模型。

    文档： [??](/zh-CN/concepts/compaction)、[会话裁剪](/zh-CN/concepts/session-pruning)、[会话管理](/zh-CN/concepts/session)。

  </Accordion>

  <Accordion title='为什么我会看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    这是提供商校验错误：模型发出了一个缺少必需
    `input` 的 `tool_use` block。通常意味着会话历史已过时或损坏（经常出现在长线程
    或工具/schema 变化之后）。

    修复方式：用 `/new`（单独消息）启动一个新会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟就会收到 heartbeat 消息？">
    Heartbeat 默认每 **30m** 运行一次（使用 OAuth 认证时为 **1h**）。可进行调节或禁用：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在，但实际上为空（只有空行和 Markdown
    标题如 `# Heading`），OpenClaw 会跳过 heartbeat 运行，以节省 API 调用。
    如果文件不存在，heartbeat 仍会运行，并由模型决定接下来做什么。

    每个智能体的覆盖使用 `agents.list[].heartbeat`。文档： [Heartbeat](/zh-CN/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要把“机器人账号”添加进 WhatsApp 群组吗？'>
    不需要。OpenClaw 运行在**你自己的账号**上，所以只要你在群里，OpenClaw 就能看到消息。
    默认情况下，群组回复会被阻止，直到你允许某些发送者（`groupPolicy: "allowlist"`）。

    如果你只希望**你自己**能触发群组回复：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="如何获取 WhatsApp 群组的 JID？">
    方式 1（最快）：查看日志尾部，并在群里发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    找到以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    方式 2（如果已配置/已加入允许列表）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档： [WhatsApp](/zh-CN/channels/whatsapp)、[Directory](/zh-CN/cli/directory)、[Logs](/zh-CN/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 不在群组里回复？">
    两个常见原因：

    - 提及门控已启用（默认）。你必须 @ 提及机器人（或匹配 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups`，但其中没有 `"*"`，且当前群组未加入允许列表。

    参见 [群组](/zh-CN/channels/groups) 和 [群组消息](/zh-CN/channels/group-messages)。

  </Accordion>

  <Accordion title="群组/线程与私信共享上下文吗？">
    直接聊天默认会折叠到主会话。群组/渠道拥有自己的会话键，而 Telegram 主题 / Discord 线程则是独立会话。参见 [群组](/zh-CN/channels/groups) 和 [群组消息](/zh-CN/channels/group-messages)。
  </Accordion>

  <Accordion title="我可以创建多少个工作区和智能体？">
    没有硬性上限。几十个（甚至几百个）都没问题，但请注意：

    - **磁盘增长：** 会话 + 转录内容位于 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **token 成本：** 智能体越多，模型并发使用越多。
    - **运维开销：** 每个智能体都有认证配置文件、工作区和渠道路由。

    提示：

    - 每个智能体保持一个**活跃**工作区（`agents.defaults.workspace`）。
    - 如果磁盘增长明显，请清理旧会话（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 检查散落的工作区和配置文件不匹配问题。

  </Accordion>

  <Accordion title="可以同时运行多个机器人或聊天（Slack）吗？应该如何设置？">
    可以。使用**多智能体路由**来运行多个隔离智能体，并按
    渠道/账号/peer 路由入站消息。Slack 作为渠道受支持，也可绑定到特定智能体。

    浏览器访问功能强大，但并不是“人类能做的一切都能做”——反机器人、CAPTCHA 和 MFA
    仍可能阻止自动化。若想获得最稳定的浏览器控制，请在宿主机上使用本地 Chrome MCP，
    或在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 长期在线的 Gateway 网关主机（VPS/Mac mini）。
    - 每个角色一个智能体（bindings）。
    - 将 Slack 渠道绑定到对应智能体。
    - 在需要时，通过 Chrome MCP 或 node 使用本地浏览器。

    文档： [多智能体路由](/zh-CN/concepts/multi-agent)、[Slack](/zh-CN/channels/slack)、
    [?????](/zh-CN/tools/browser)、[??](/zh-CN/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型就是你在下面字段中设置的模型：

    ```
    agents.defaults.model.primary
    ```

    模型以 `provider/model` 的形式引用（例如：`openai/gpt-5.4`）。如果你省略提供商，OpenClaw 会先尝试别名，然后尝试已配置提供商中对该确切模型 id 的唯一匹配，最后才退回到已配置的默认提供商作为弃用的兼容路径。如果该提供商已不再暴露已配置的默认模型，OpenClaw 会退回到第一个已配置的 provider/model，而不是保留一个陈旧的已删除提供商默认值。你仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="你推荐什么模型？">
    **推荐默认方案：** 使用你提供商栈中可用的最强最新一代模型。
    **对于启用工具或处理不受信任输入的智能体：** 模型强度优先于成本。
    **对于例行/低风险聊天：** 使用更便宜的回退模型，并按智能体角色路由。

    MiniMax 有自己的文档： [MiniMax](/zh-CN/providers/minimax) 和
    [本地模型](/zh-CN/gateway/local-models)。

    经验法则：高风险工作请尽量使用你能负担得起的**最佳模型**，而例行聊天或摘要
    则使用更便宜的模型。你可以按智能体路由模型，并使用子智能体
    对长任务并行化（每个子智能体都会消耗 token）。参见 [模型](/zh-CN/concepts/models) 和
    [子智能体](/zh-CN/tools/subagents)。

    强烈警告：较弱或过度量化的模型更容易受到 prompt
    injection 和不安全行为影响。参见 [??](/zh-CN/gateway/security)。

    更多背景： [模型](/zh-CN/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清空配置的情况下切换模型？">
    使用**模型命令**，或只编辑**模型**字段。避免整体替换配置。

    安全方式：

    - 在聊天中使用 `/model`（快捷、按会话生效）
    - `openclaw models set ...`（只更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 编辑 `~/.openclaw/openclaw.json` 中的 `agents.defaults.model`

    除非你明确想整体替换整个配置，否则请避免向 `config.apply` 传入部分对象。
    对于 RPC 编辑，请先用 `config.schema.lookup` 检查，并优先使用 `config.patch`。lookup 返回的数据会给你归一化路径、浅层 schema 文档/约束，以及直接子节点摘要，
    用于局部更新。
    如果你确实覆盖掉了配置，请从备份恢复，或重新运行 `openclaw doctor` 修复。

    文档： [模型](/zh-CN/concepts/models)、[Configure](/zh-CN/cli/configure)、[Config](/zh-CN/cli/config)、[Doctor](/zh-CN/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是使用本地模型最简单的路径。

    最快设置：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果你还想使用云模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意：

    - `Cloud + Local` 会同时提供云模型和你的本地 Ollama 模型
    - `kimi-k2.5:cloud` 这类云模型不需要本地 pull
    - 若要手动切换，请使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全说明：更小或高度量化的模型更容易受到 prompt
    injection 影响。对于任何可以使用工具的机器人，我们强烈建议使用**大模型**。
    如果你仍想使用小模型，请启用沙箱隔离并使用严格的工具允许列表。

    文档： [Ollama](/zh-CN/providers/ollama)、[本地模型](/zh-CN/gateway/local-models)、
    [模型提供商](/zh-CN/concepts/model-providers)、[??](/zh-CN/gateway/security)、
    [沙箱隔离](/zh-CN/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能不同，而且会随时间变化；没有固定的提供商推荐。
    - 可在每个 gateway 上运行 `openclaw models status` 查看当前运行时设置。
    - 对于安全敏感/启用工具的智能体，请使用可用的最强最新一代模型。
  </Accordion>

  <Accordion title="如何动态切换模型（无需重启）？">
    发送 `/model` 命令作为单独消息：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些是内置别名。可通过 `agents.defaults.models` 添加自定义别名。

    你可以通过 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）会显示一个紧凑的带编号选择器。你可以按编号选择：

    ```
    /model 3
    ```

    你还可以为该提供商强制指定一个认证配置文件（按会话生效）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 会显示当前处于活动状态的智能体、正在使用的 `auth-profiles.json` 文件，以及下一步将尝试哪个认证配置文件。
    如果可用，它还会显示已配置的提供商端点（`baseUrl`）和 API 模式（`api`）。

    **如何取消通过 @profile 设置的固定配置文件？**

    重新运行不带 `@profile` 后缀的 `/model`：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想回到默认值，可在 `/model` 中重新选择（或发送 `/model <default provider/model>`）。
    使用 `/model status` 可确认当前活动的认证配置文件。

  </Accordion>

  <Accordion title="我可以用 GPT 5.2 处理日常任务，再用 Codex 5.3 做编码吗？">
    可以。将一个设为默认，需要时再切换：

    - **快速切换（按会话）：** 日常任务用 `/model gpt-5.4`，编码时用 `/model openai-codex/gpt-5.4`（通过 Codex OAuth）。
    - **默认 + 切换：** 将 `agents.defaults.model.primary` 设为 `openai/gpt-5.4`，编码时再切换到 `openai-codex/gpt-5.4`（反过来也可以）。
    - **子智能体：** 将编码任务路由给拥有不同默认模型的子智能体。

    参见 [模型](/zh-CN/concepts/models) 和 [????](/zh-CN/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.4 配置 fast mode？">
    可使用会话级开关或配置默认值：

    - **按会话：** 当会话使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.4` 时，发送 `/fast on`。
    - **按模型默认值：** 将 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 设为 `true`。
    - **Codex OAuth 也一样：** 如果你也使用 `openai-codex/gpt-5.4`，同样设置对应标志。

    示例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
            "openai-codex/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    对于 OpenAI，fast mode 会在受支持的原生 Responses 请求上映射到 `service_tier = "priority"`。会话级 `/fast` 覆盖优先于配置默认值。

    参见 [思考级别](/zh-CN/tools/thinking) 和 [OpenAI fast mode](/zh-CN/providers/openai#openai-fast-mode)。

  </Accordion>

  <Accordion title='为什么我会看到 "Model ... is not allowed"，然后就没有回复了？'>
    如果设置了 `agents.defaults.models`，它就会成为 `/model` 以及任何
    会话覆盖的**允许列表**。选择一个不在该列表中的模型会返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误会**替代**正常回复返回。修复方式：将该模型加入
    `agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    这意味着**提供商尚未配置**（未找到 MiniMax 提供商配置或认证
    配置文件），因此无法解析该模型。

    修复清单：

    1. 升级到较新的 OpenClaw 版本（或直接从源码 `main` 运行），然后重启 gateway。
    2. 确保 MiniMax 已配置（通过向导或 JSON），或环境/认证配置文件中
       已存在 MiniMax 认证，使系统可以注入匹配的提供商
       （`minimax` 使用 `MINIMAX_API_KEY`，`minimax-portal` 使用 `MINIMAX_OAUTH_TOKEN` 或已存储的 MiniMax
       OAuth）。
    3. 使用与你的认证路径完全匹配的模型 id（区分大小写）：
       对于 API key 设置，使用 `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed`；
       对于 OAuth 设置，使用 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/zh-CN/providers/minimax) 和 [模型](/zh-CN/concepts/models)。

  </Accordion>

  <Accordion title="可以把 MiniMax 设为默认，而把 OpenAI 用于复杂任务吗？">
    可以。将 **MiniMax 设为默认**，并在需要时**按会话**切换模型。
    回退机制只用于**错误场景**，不是“高难任务”，因此复杂任务请使用 `/model` 或单独的智能体。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：拆分智能体**

    - 智能体 A 默认：MiniMax
    - 智能体 B 默认：OpenAI
    - 通过智能体路由，或使用 `/agent` 切换

    文档： [模型](/zh-CN/concepts/models)、[多智能体路由](/zh-CN/concepts/multi-agent)、[MiniMax](/zh-CN/providers/minimax)、[OpenAI](/zh-CN/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷别名吗？">
    是。OpenClaw 内置了一些默认简写（仅当模型存在于 `agents.defaults.models` 中时生效）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你设置了同名的自定义别名，会以你的值为准。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷别名（aliases）？">
    别名来自 `agents.defaults.models.<modelId>.alias`。示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后，`/model sonnet`（或在支持时使用 `/<alias>`）就会解析到对应模型 ID。

  </Accordion>

  <Accordion title="如何添加 OpenRouter 或 Z.AI 等其他提供商的模型？">
    OpenRouter（按 token 计费；支持很多模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果你引用了 provider/model，但缺少该提供商所需的 key，就会收到运行时认证错误（例如 `No API key found for provider "zai"`）。

    **添加新智能体后出现 No API key found for provider**

    这通常表示**新智能体**的认证存储是空的。认证是按智能体区分的，
    存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复方式：

    - 运行 `openclaw agents add <id>`，并在向导中配置认证。
    - 或将主智能体 `agentDir` 中的 `auth-profiles.json` 复制到新智能体的 `agentDir` 中。

    **不要**在多个智能体之间复用同一个 `agentDir`；这会导致认证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障切换和 “All models failed”

<AccordionGroup>
  <Accordion title="故障切换是如何工作的？">
    故障切换分两阶段进行：

    1. **同一 provider 内部的 auth 配置文件轮换**
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型

    失败的配置文件会进入冷却期（指数退避），因此即使某个提供商被速率限制或临时失败，OpenClaw 仍能继续回复。

    限速桶不仅包含普通 `429` 响应。OpenClaw
    还会将诸如 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted`，以及周期性
    用量窗口限制（`weekly/monthly limit reached`）等信息，视为值得故障切换的
    速率限制。

    有些看起来像计费错误的响应并不是 `402`，而有些 HTTP `402`
    响应也仍会被归入瞬态错误桶。如果提供商在 `401` 或 `403` 上返回了明确的
    计费文本，OpenClaw 仍然可以将其保留在
    billing 路径中，但 provider 专属的文本匹配器只会作用于
    拥有它们的 provider（例如 OpenRouter 的 `Key limit exceeded`）。如果某条 `402`
    消息看起来更像可重试的使用量窗口或
    组织/工作区消费限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期 billing 禁用。

    上下文溢出错误则不同：像
    `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length
    exceeded` 这类特征会进入压缩/重试路径，而不是推进模型回退。

    通用服务器错误文本的判断范围会刻意收窄，不会把“任何带
    unknown/error 的内容”都算进去。OpenClaw 的确会把 provider 范围内的瞬态形态
    视作值得故障切换的超时/过载信号，例如 Anthropic 的裸 `An unknown error occurred`、OpenRouter 的裸
    `Provider returned error`、stop-reason 错误如 `Unhandled stop reason:
    error`、带有瞬态服务器文本的 JSON `api_error` 负载
    （`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`），以及 provider 繁忙错误如 `ModelNotReadyException`，前提是 provider 上下文
    匹配。
    类似 `LLM request failed with an unknown
    error.` 这种通用的内部回退文本则保持保守，不会仅凭它本身触发模型回退。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default” 是什么意思？'>
    这表示系统尝试使用 auth 配置文件 ID `anthropic:default`，但在预期的认证存储中找不到对应凭据。

    **修复清单：**

    - **确认 auth 配置文件的存储位置**（新路径与旧路径）
      - 当前路径：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认 Gateway 网关是否加载了你的环境变量**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY`，但 Gateway 网关通过 systemd/launchd 运行，它可能不会继承该变量。请将它放入 `~/.openclaw/.env` 或启用 `env.shellEnv`。
    - **确认你编辑的是正确的智能体**
      - 多智能体设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **检查模型/认证状态**
      - 使用 `openclaw models status` 查看已配置模型以及提供商是否已认证。

    **针对 “No credentials found for profile anthropic” 的修复清单**

    这表示运行被固定到了一个 Anthropic 认证配置文件，但 Gateway 网关
    无法在它的认证存储中找到它。

    - **使用 Claude CLI**
      - 在 Gateway 网关主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果你想改用 API key**
      - 在**Gateway 网关主机**上的 `~/.openclaw/.env` 中放入 `ANTHROPIC_API_KEY`。
      - 清除任何会强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你是在 Gateway 网关主机上运行命令**
      - 在远程模式下，auth 配置文件位于 Gateway 网关机器上，而不是你的笔记本上。

  </Accordion>

  <Accordion title="为什么它还尝试了 Google Gemini 并失败了？">
    如果你的模型配置里包含 Google Gemini 作为回退项（或你切换到了 Gemini 简写），OpenClaw 会在模型回退时尝试它。如果你尚未配置 Google 凭据，就会看到 `No API key found for provider "google"`。

    修复方法：要么提供 Google 认证，要么从 `agents.defaults.model.fallbacks` / aliases 中删除或避免使用 Google 模型，这样回退就不会走到那里。

    **LLM request rejected: thinking signature required（Google Antigravity）**

    原因：会话历史中包含**没有签名的 thinking blocks**（通常来自
    被中止/不完整的流）。Google Antigravity 要求 thinking blocks 必须带签名。

    修复：OpenClaw 现在会为 Google Antigravity Claude 去除未签名的 thinking blocks。如果仍然出现，请开启一个**新会话**，或为该智能体设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## Auth 配置文件：是什么，以及如何管理

相关内容： [OAuth](/zh-CN/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

<AccordionGroup>
  <Accordion title="什么是 auth 配置文件？">
    auth 配置文件是一个绑定到 provider 的命名凭据记录（OAuth 或 API key）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么样的？">
    OpenClaw 使用带 provider 前缀的 ID，例如：

    - `anthropic:default`（当没有 email 身份时很常见）
    - `anthropic:<email>` 用于 OAuth 身份
    - 你自行选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我能控制优先尝试哪个 auth 配置文件吗？">
    可以。配置支持为配置文件添加可选元数据，并按 provider 设置顺序（`auth.order.<provider>`）。这**不会**存储 secrets；它只是把 ID 映射到 provider/mode，并设置轮换顺序。

    如果某个配置文件处于短期**冷却**状态（速率限制/超时/认证失败）或较长的**禁用**状态（计费/余额不足），OpenClaw 可能会临时跳过它。要检查这一点，请运行 `openclaw models status --json`，查看 `auth.unusableProfiles`。调节项：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却可以按模型作用域进行。某个配置文件即使对某一模型仍在
    冷却中，也可能仍可用于同一 provider 下的其他兄弟模型；但 billing/禁用窗口
    仍会阻止整个配置文件。

    你也可以通过 CLI 设置**每个智能体**的顺序覆盖（存储在该智能体的 `auth-state.json` 中）：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile (only try this one)
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic
    ```

    如要指定某个智能体：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际会尝试什么，请使用：

    ```bash
    openclaw models status --probe
    ```

    如果某个已存储配置文件未包含在显式顺序中，probe 会对其报告
    `excluded_by_auth_order`，而不是悄悄尝试它。

  </Accordion>

  <Accordion title="OAuth 和 API key 有什么区别？">
    OpenClaw 同时支持两者：

    - **OAuth** 往往可复用订阅访问（在适用的情况下）。
    - **API keys** 使用按 token 计费。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API keys。

  </Accordion>
</AccordionGroup>

## Gateway 网关：端口、“已在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway 网关使用哪个端口？">
    `gateway.port` 控制单一复用端口，用于 WebSocket + HTTP（Control UI、hooks 等）。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示 "Runtime: running"，但 "RPC probe: failed"？'>
    因为 “running” 指的是 **supervisor** 的视角（launchd/systemd/schtasks）。RPC probe 则是 CLI 真正去连接 gateway WebSocket 并调用 `status`。

    使用 `openclaw gateway status`，并重点看这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上真正绑定了什么）
    - `Last gateway error:`（当进程还活着但端口未监听时，这通常是根因）

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 里 "Config (cli)" 和 "Config (service)" 不一样？'>
    你正在编辑一个配置文件，而服务运行的却是另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复：

    ```bash
    openclaw gateway install --force
    ```

    请在你希望服务使用的同一 `--profile` / 环境下运行该命令。

  </Accordion>

  <Accordion title='“another gateway instance is already listening” 是什么意思？'>
    OpenClaw 会在启动时立即绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`），从而强制运行时锁。如果绑定因 `EADDRINUSE` 失败，就会抛出 `GatewayLockError`，表示已有另一个实例正在监听。

    修复方式：停止另一个实例，释放端口，或使用 `openclaw gateway --port <port>` 在其他端口运行。

  </Accordion>

  <Accordion title="如何以远程模式运行 OpenClaw（客户端连接到别处的 Gateway 网关）？">
    将 `gateway.mode` 设为 `"remote"`，并指向远程 WebSocket URL，如有需要可附带共享密钥远程凭据：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    注意：

    - 仅当 `gateway.mode` 为 `local`（或你传入了覆盖标志）时，`openclaw gateway` 才会启动。
    - macOS 应用会监视配置文件，并在这些值变化时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧的远程凭据；它们本身不会启用本地 gateway 认证。

  </Accordion>

  <Accordion title='Control UI 显示 "unauthorized"（或持续重连）。怎么办？'>
    你的 gateway 认证路径与 UI 使用的认证方式不匹配。

    已知事实（来自代码）：

    - Control UI 将 token 保存在 `sessionStorage` 中，并与当前浏览器标签页会话及所选 Gateway 网关 URL 绑定，因此在同一标签页中刷新仍然可用，而不需要恢复长期的 localStorage token 持久化。
    - 在 `AUTH_TOKEN_MISMATCH` 情况下，受信任客户端可在 gateway 返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，使用缓存的设备 token 发起一次有界重试。
    - 该缓存 token 重试现在会复用与设备 token 一起缓存的已批准 scopes。显式传入 `deviceToken` / 显式传入 `scopes` 的调用方仍会保留自己请求的 scope 集合，而不是继承缓存 scopes。
    - 除了该重试路径外，connect 认证优先级为：显式共享 token/password，其次显式 `deviceToken`，然后存储的设备 token，最后 bootstrap token。
    - Bootstrap token 的 scope 检查带有角色前缀。内置的 bootstrap operator 允许列表只满足 operator 请求；node 或其他非 operator 角色仍需要带有对应角色前缀的 scopes。

    修复方式：

    - 最快方法：`openclaw dashboard`（会打印并复制控制面板 URL，尝试自动打开；如果是无头环境会显示 SSH 提示）。
    - 如果你还没有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是远程环境，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在 Control UI 设置中粘贴对应密钥。
    - Tailscale Serve 模式：确认已启用 `gateway.auth.allowTailscale`，并且你打开的是 Serve URL，而不是绕过 Tailscale 身份请求头的原始 loopback/tailnet URL。
    - trusted-proxy 模式：确认你是通过配置好的非 loopback 身份感知代理访问，而不是同主机 loopback 代理或原始 gateway URL。
    - 如果一次重试后仍然不匹配，请轮换/重新批准已配对设备 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果 rotate 调用提示被拒绝，请检查两点：
      - 已配对设备会话只能轮换它们**自己的**设备，除非它们还具备 `operator.admin`
      - 显式 `--scope` 值不能超过调用方当前拥有的 operator scopes
    - 仍然卡住？运行 `openclaw status --all`，并按 [故障排除](/zh-CN/gateway/troubleshooting) 继续排查。认证细节参见 [???](/zh-CN/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet，但它无法绑定，也没有任何监听">
    `tailnet` 绑定会从网络接口中选择一个 Tailscale IP（100.64.0.0/10）。如果机器未接入 Tailscale（或接口未启动），就没有可供绑定的地址。

    修复方式：

    - 在该主机上启动 Tailscale（使其拥有一个 100.x 地址），或
    - 改用 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式指定的。`auto` 会优先选择 loopback；如果你想使用仅限 tailnet 的绑定，请设置 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="可以在同一台主机上运行多个 Gateway 网关吗？">
    通常不需要——一个 Gateway 网关就能运行多个消息渠道和智能体。只有在你需要冗余（例如救援机器人）或硬隔离时，才应该使用多个 Gateway 网关。

    可以，但你必须隔离以下内容：

    - `OPENCLAW_CONFIG_PATH`（每个实例一份配置）
    - `OPENCLAW_STATE_DIR`（每个实例一份状态）
    - `agents.defaults.workspace`（工作区隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 对每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`）。
    - 在每个配置文件中设置唯一的 `gateway.port`（或手动运行时传入 `--port`）。
    - 安装按 profile 区分的服务：`openclaw --profile <name> gateway install`。

    Profiles 还会给服务名加后缀（`ai.openclaw.<profile>`；旧版为 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南： [多个 Gateway 网关](/zh-CN/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / code 1008 是什么意思？'>
    Gateway 网关是一个**WebSocket 服务器**，它期望收到的第一条消息
    必须是一个 `connect` frame。如果收到其他内容，它就会使用
    **code 1008**（策略违规）关闭连接。

    常见原因：

    - 你在浏览器中打开了 **HTTP** URL（`http://...`），而不是用 WS 客户端。
    - 你使用了错误的端口或路径。
    - 某个代理或隧道剥离了认证请求头，或发送了非 Gateway 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则为 `wss://...`）。
    2. 不要在普通浏览器标签页中直接打开 WS 端口。
    3. 如果启用了认证，请在 `connect` frame 中包含 token/password。

    如果你使用 CLI 或 TUI，URL 应该类似：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节： [Gateway ????](/zh-CN/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志和调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    你可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快查看日志尾部：

    ```bash
    openclaw logs --follow
    ```

    服务/supervisor 日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；profile 则使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多内容请参见 [故障排除](/zh-CN/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway 网关服务？">
    使用 gateway 辅助命令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你是手动运行 gateway，`openclaw gateway --force` 可以回收端口。参见 [Gateway ??????](/zh-CN/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端——如何重新启动 OpenClaw？">
    Windows 上有**两种安装模式**：

    **1）WSL2（推荐）：** Gateway 网关运行在 Linux 内部。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你从未安装服务，请在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **2）原生 Windows（不推荐）：** Gateway 网关直接运行在 Windows 中。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你是手动运行（无服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档： [Windows（WSL2）](/zh-CN/platforms/windows)、[Gateway ??????](/zh-CN/gateway)。

  </Accordion>

  <Accordion title="Gateway 网关启动了，但回复始终没有到达。我该检查什么？">
    从快速健康检查开始：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - **Gateway 网关主机**上未加载模型认证（检查 `models status`）。
    - 渠道配对/允许列表阻止了回复（检查渠道配置 + 日志）。
    - WebChat/Dashboard 打开时未使用正确 token。

    如果是远程环境，请确认隧道/Tailscale 连接已建立，并且
    Gateway WebSocket 可达。

    文档： [??](/zh-CN/channels)、[故障排除](/zh-CN/gateway/troubleshooting)、[????](/zh-CN/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason"——怎么办？'>
    这通常意味着 UI 丢失了 WebSocket 连接。请检查：

    1. Gateway 网关是否在运行？`openclaw gateway status`
    2. Gateway 网关是否健康？`openclaw status`
    3. UI 是否使用了正确 token？`openclaw dashboard`
    4. 如果是远程环境，隧道/Tailscale 连接是否已建立？

    然后查看日志尾部：

    ```bash
    openclaw logs --follow
    ```

    文档： [???](/zh-CN/web/dashboard)、[????](/zh-CN/gateway/remote)、[故障排除](/zh-CN/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败了。我该检查什么？">
    先查看日志和渠道状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对应错误类型：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单项过多。OpenClaw 已经会裁剪到 Telegram 限额并使用更少的命令重试，但某些菜单项仍需进一步删除。请减少 plugin/skill/custom commands，或者在不需要菜单时禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果你在 VPS 上运行或位于代理之后，请确认允许访问 `api.telegram.org` 的出站 HTTPS，并确保 DNS 正常。

    如果 Gateway 网关是远程的，请确保你查看的是 Gateway 网关主机上的日志。

    文档： [Telegram](/zh-CN/channels/telegram)、[渠道故障排除](/zh-CN/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 没有任何输出。我该检查什么？">
    先确认 Gateway 网关可达，并且智能体能正常运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望回复发到某个聊天
    渠道中，请确保投递已启用（`/deliver on`）。

    文档： [TUI](/zh-CN/web/tui)、[????](/zh-CN/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何先完全停止，再重新启动 Gateway 网关？">
    如果你已经安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这会停止/启动**受管理的服务**（macOS 上是 launchd，Linux 上是 systemd）。
    当 Gateway 网关作为后台守护进程运行时，请使用这种方式。

    如果你是在前台运行，按 Ctrl-C 停止，然后执行：

    ```bash
    openclaw gateway run
    ```

    文档： [Gateway ??????](/zh-CN/gateway)。

  </Accordion>

  <Accordion title="用最简单的话解释：openclaw gateway restart 和 openclaw gateway 有什么区别？">
    - `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
    - `openclaw gateway`：在当前终端会话中**以前台方式**运行 gateway。

    如果你已经安装了服务，请使用 gateway 服务命令。想临时前台运行时，再用 `openclaw gateway`。

  </Accordion>

  <Accordion title="出问题时，最快获得更多细节的方法是什么？">
    使用 `--verbose` 启动 Gateway 网关，以获得更多控制台细节。然后检查日志文件，查看渠道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="我的 skill 生成了图片/PDF，但没有发送出去">
    智能体发出的附件必须包含一行独立的 `MEDIA:<path-or-url>`。参见 [OpenClaw ????](/zh-CN/start/openclaw) 和 [?????](/zh-CN/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还请检查：

    - 目标渠道支持出站媒体，且未被允许列表阻止。
    - 文件未超出提供商大小限制（图片会缩放到最大 2048px）。
    - `tools.fs.workspaceOnly=true` 会将本地路径发送限制在工作区、temp/media-store 和经过沙箱校验的文件中。
    - `tools.fs.workspaceOnly=false` 允许 `MEDIA:` 发送智能体已可读取的宿主机本地文件，但仅限媒体和安全文档类型（图片、音频、视频、PDF 和 Office 文档）。纯文本和疑似 secret 文件仍会被阻止。

    参见 [图像与媒体支持](/zh-CN/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全和访问控制

<AccordionGroup>
  <Accordion title="将 OpenClaw 暴露给入站私信安全吗？">
    请将入站私信视为不受信任输入。默认设置旨在降低风险：

    - 具备私信能力的渠道默认行为是**配对**：
      - 未知发送者会收到一个配对码；机器人不会处理其消息。
      - 批准方式：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 每个渠道待处理请求上限为 **3 个**；如果配对码没到达，请用 `openclaw pairing list --channel <channel> [--account <id>]` 检查。
    - 若要公开开放私信，必须显式选择加入（`dmPolicy: "open"` 且 allowlist 为 `"*"`）。

    运行 `openclaw doctor` 可发现有风险的私信策略。

  </Accordion>

  <Accordion title="prompt injection 只对公共机器人有风险吗？">
    不。prompt injection 针对的是**不受信任内容**，而不仅仅是谁能给机器人发私信。
    只要你的助手会读取外部内容（web search/fetch、浏览器页面、邮件、
    文档、附件、粘贴日志），这些内容就可能包含试图
    劫持模型的指令。即使**只有你一个发送者**，这种情况也会发生。

    当工具启用时，风险最大：模型可能被诱导
    泄露上下文，或代你调用工具。降低影响范围的方法包括：

    - 使用只读或禁用工具的“阅读器”智能体来总结不受信任内容
    - 对启用工具的智能体关闭 `web_search` / `web_fetch` / `browser`
    - 也将解码后的文件/文档文本视为不受信任内容：OpenResponses
      `input_file` 和媒体附件提取都会将提取出的文本包裹在
      显式的外部内容边界标记中，而不是直接传入原始文件文本
    - 使用沙箱隔离并设置严格的工具允许列表

    详情： [??](/zh-CN/gateway/security)。

  </Accordion>

  <Accordion title="我的机器人应该有自己的邮箱、GitHub 账号或手机号吗？">
    对大多数设置来说，是的。使用单独的账号和手机号
    可在出问题时降低影响范围。这也更容易轮换
    凭据或撤销访问，而不会影响你的个人账号。

    从小规模开始。只授予实际需要的工具和账号访问权限，之后
    再按需扩展。

    文档： [??](/zh-CN/gateway/security)、[??](/zh-CN/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自主处理我的短信吗？这样安全吗？">
    我们**不建议**让它对你的个人消息拥有完全自主权。最安全的模式是：

    - 将私信保持在**配对模式**或严格允许列表中。
    - 如果你希望它代表你发送消息，请使用**单独的号码或账号**。
    - 让它起草，然后**发送前由你审批**。

    如果你想试验，请在专用账号上进行，并保持隔离。参见
    [??](/zh-CN/gateway/security)。

  </Accordion>

  <Accordion title="个人助手任务可以用更便宜的模型吗？">
    可以，**前提是**该智能体仅用于聊天，且输入是可信的。较小档位
    更容易受到指令劫持，因此不适用于启用工具的智能体，
    或会读取不受信任内容的场景。如果你必须使用小模型，请锁定
    工具并在沙箱中运行。参见 [??](/zh-CN/gateway/security)。
  </Accordion>

  <Accordion title="我在 Telegram 里运行了 /start，但没有收到配对码">
    只有当未知发送者给机器人发消息，且
    `dmPolicy: "pairing"` 已启用时，才会发送配对码。单独发送 `/start` 不会生成配对码。

    查看待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果你想立即获得访问权限，请将你的发送者 id 加入允许列表，或为该账号设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对是如何工作的？">
    不会。WhatsApp 的默认私信策略是**配对**。未知发送者只会收到一个配对码，其消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或回复你显式触发的发送。

    使用以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    查看待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导里的手机号提示：它用于设置你的**允许列表/owner**，以便允许你自己的私信。这并不会用于自动发送。如果你运行在自己的 WhatsApp 号码上，请使用该号码，并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、终止任务，以及“它停不下来”

<AccordionGroup>
  <Accordion title="如何阻止内部系统消息显示在聊天中？">
    大多数内部或工具消息只有在该会话启用了 **verbose** 或 **reasoning** 时
    才会显示。

    在出现该问题的聊天中这样做：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然很吵，请检查 Control UI 中的会话设置，并将 verbose
    设为 **inherit**。同时确认你使用的 bot 配置中没有将 `verboseDefault` 设为 `on`。

    文档： [思考级别](/zh-CN/tools/thinking)、[??](/zh-CN/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    将以下任意内容作为**单独消息**发送（不要加斜杠）：

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    这些都是中止触发词（不是 slash 命令）。

    对于后台进程（由 exec 工具启动），你可以让智能体运行：

    ```
    process action:kill sessionId:XXX
    ```

    Slash 命令概览：参见 [????](/zh-CN/tools/slash-commands)。

    大多数命令必须作为**单独消息**发送，并以 `/` 开头，但也有少数快捷方式（如 `/status`）对允许列表中的发送者支持内联使用。

  </Accordion>

  <Accordion title='如何从 Telegram 发送 Discord 消息？（"Cross-context messaging denied"）'>
    OpenClaw 默认会阻止**跨提供商**消息发送。如果某个工具调用绑定到了
    Telegram，它就不会发送到 Discord，除非你显式允许。

    为该智能体启用跨提供商消息发送：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    编辑配置后请重启 gateway。

  </Accordion>

  <Accordion title='为什么机器人会“忽略”我连续快速发送的多条消息？'>
    队列模式决定新消息如何与正在进行中的运行交互。使用 `/queue` 可切换模式：

    - `steer` - 新消息会重定向当前任务
    - `followup` - 消息按顺序逐个运行
    - `collect` - 批量收集消息后一次性回复（默认）
    - `steer-backlog` - 先立即重定向，然后处理积压消息
    - `interrupt` - 中止当前运行并重新开始

    对于 followup 模式，你还可以附加 `debounce:2s cap:25 drop:summarize` 这类选项。

  </Accordion>
</AccordionGroup>

## 杂项

<AccordionGroup>
  <Accordion title='对于带 API key 的 Anthropic，默认模型是什么？'>
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在 auth 配置文件中存储 Anthropic API key）只会启用认证，而实际默认模型取决于你在 `agents.defaults.model.primary` 中的配置（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果你看到 `No credentials found for profile "anthropic:default"`，说明 Gateway 网关无法在当前运行智能体对应的 `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

如果仍然卡住？请到 [Discord](https://discord.com/invite/clawd) 提问，或打开 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。
