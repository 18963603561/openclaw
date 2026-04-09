---
read_when:
    - 设置一台新机器
    - 你想获得“最新 + 最强”体验，同时不破坏你的个人设置
summary: OpenClaw 的高级设置与开发工作流
title: 设置
x-i18n:
    generated_at: "2026-04-08T07:13:50Z"
    model: gpt-5.4
    provider: openai
    source_hash: be4e280dde7f3a224345ca557ef2fb35a9c9db8520454ff63794ac6f8d4e71e7
    source_path: start\setup.md
    workflow: 15
---

# 设置

<Note>
如果你是第一次设置，请从 [入门指南](/zh-CN/start/getting-started) 开始。
关于新手引导细节，请参见 [新手引导（CLI）](/zh-CN/start/wizard)。
</Note>

## TL;DR

- **个性化内容放在仓库外部：** `~/.openclaw/workspace`（工作区）+ `~/.openclaw/openclaw.json`（配置）。
- **稳定工作流：** 安装 macOS 应用；让它运行内置的 Gateway 网关。
- **前沿工作流：** 通过 `pnpm gateway:watch` 自己运行 Gateway 网关，然后让 macOS 应用在本地模式下附加上来。

## 前置条件（从源码运行）

- 推荐 Node 24（仍支持 Node 22 LTS，当前为 `22.14+`）
- 优先使用 `pnpm`（或者如果你有意使用 [Bun（实验性）](/zh-CN/install/bun)，也可以用 Bun）
- Docker（可选；仅用于容器化设置/端到端场景 —— 见 [Docker](/zh-CN/install/docker)）

## 个性化策略（这样更新就不会伤到你）

如果你想做到“100% 按我定制”_同时_又便于更新，请将你的定制内容放在：

- **配置：** `~/.openclaw/openclaw.json`（JSON/近似 JSON5）
- **工作区：** `~/.openclaw/workspace`（skills、prompts、记忆；建议将其做成一个私有 git 仓库）

初始化一次：

```bash
openclaw setup
```

在当前仓库中，使用本地 CLI 入口：

```bash
openclaw setup
```

如果你还没有全局安装，请通过 `pnpm openclaw setup` 运行（如果你在使用 Bun 工作流，则用 `bun run openclaw setup`）。

## 从当前仓库运行 Gateway 网关

在 `pnpm build` 之后，你可以直接运行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（优先使用 macOS 应用）

1. 安装并启动 **OpenClaw.app**（菜单栏应用）。
2. 完成新手引导/权限检查清单（TCC 提示）。
3. 确保 Gateway 网关处于**本地**模式并已运行（由应用负责管理）。
4. 连接界面（示例：WhatsApp）：

```bash
openclaw channels login
```

5. 完整性检查：

```bash
openclaw health
```

如果你的构建中没有提供新手引导：

- 运行 `openclaw setup`，然后运行 `openclaw channels login`，接着手动启动 Gateway 网关（`openclaw gateway`）。

## 前沿工作流（在终端中运行 Gateway 网关）

目标：开发 TypeScript Gateway 网关，获得热重载，同时保持 macOS 应用 UI 附加。

### 0）（可选）也从源码运行 macOS 应用

如果你也想使用前沿版 macOS 应用：

```bash
./scripts/restart-mac.sh
```

### 1）启动开发版 Gateway 网关

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 会以 watch 模式运行 gateway，并在相关源码、
配置和内置插件元数据变化时重新加载。

如果你有意使用 Bun 工作流，对应命令是：

```bash
bun install
bun run gateway:watch
```

### 2）让 macOS 应用指向你正在运行的 Gateway 网关

在 **OpenClaw.app** 中：

- Connection Mode：**Local**
  应用会附加到配置端口上的正在运行的 gateway。

### 3）验证

- 应用内 Gateway 网关状态应显示为 **“Using existing gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### 常见坑点

- **端口错误：** Gateway 网关 WS 默认是 `ws://127.0.0.1:18789`；请让应用和 CLI 使用同一个端口。
- **状态存储位置：**
  - 渠道/provider 状态：`~/.openclaw/credentials/`
  - 模型 auth profiles：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

在调试凭证问题或决定备份哪些内容时，请参考这里：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：配置/环境变量，或 `channels.telegram.tokenFile`（仅常规文件；符号链接会被拒绝）
- **Discord bot token**：配置/环境变量，或 SecretRef（env/file/exec providers）
- **Slack tokens**：配置/环境变量（`channels.slack.*`）
- **配对 allowlists**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账号）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账号）
- **模型 auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **基于文件的 secrets 载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多细节： [安全](/zh-CN/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你自己的内容”；不要把个人 prompts/配置放进 `openclaw` 仓库。
- 更新源码：`git pull` + 你所选 package manager 的安装步骤（默认 `pnpm install`；Bun 工作流使用 `bun install`）+ 继续使用对应的 `gateway:watch` 命令。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 会在用户
登出/空闲时停止用户服务，这会杀掉 Gateway 网关。新手引导会尝试为你启用
lingering（可能需要 sudo）。如果仍未开启，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于常驻运行或多用户服务器，请考虑使用**系统**服务，而不是
用户服务（这样就不需要 lingering）。关于 systemd 的说明，请参见 [Gateway ??????](/zh-CN/gateway)。

## 相关文档

- [Gateway ??????](/zh-CN/gateway)（标志、监管、端口）
- [??](/zh-CN/gateway/configuration)（配置 schema + 示例）
- [Discord](/zh-CN/channels/discord) 和 [Telegram](/zh-CN/channels/telegram)（reply 标签 + replyToMode 设置）
- [OpenClaw ????](/zh-CN/start/openclaw)
- [macOS 应用程序](/zh-CN/platforms/macos)（gateway 生命周期）
