---
read_when:
    - 你想安全地更新一个源码检出副本
    - 你需要了解 `--update` 简写行为
summary: '`openclaw update` 的 CLI 参考（相对安全的源码更新 + gateway 自动重启）'
title: update
x-i18n:
    generated_at: "2026-04-08T03:57:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: b94bb057dad2e9bf73dd80c9e13cc9366f221534ad08c9f442d4356673c89fc8
    source_path: cli\update.md
    workflow: 15
---

# `openclaw update`

安全地更新 OpenClaw，并在 stable/beta/dev 渠道之间切换。

如果你是通过 **npm/pnpm/bun** 安装的（全局安装，没有 git 元数据），
更新会走 [更新](/zh-CN/install/updating) 中的包管理器流程。

## 用法

```bash
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --tag main
openclaw update --dry-run
openclaw update --no-restart
openclaw update --yes
openclaw update --json
openclaw --update
```

## 选项

- `--no-restart`：成功更新后跳过重启 Gateway 网关服务。
- `--channel <stable|beta|dev>`：设置更新渠道（git + npm；会持久化到配置中）。
- `--tag <dist-tag|version|spec>`：仅对此次更新覆盖包目标。对于包安装，`main` 会映射为 `github:openclaw/openclaw#main`。
- `--dry-run`：预览计划中的更新操作（channel/tag/target/restart 流程），但不写配置、不安装、不同步插件，也不重启。
- `--json`：输出机器可读的 `UpdateRunResult` JSON。
- `--timeout <seconds>`：每一步的超时时间（默认 1200 秒）。
- `--yes`：跳过确认提示（例如降级确认）

注意：降级需要确认，因为旧版本可能会破坏配置。

## `update status`

显示当前活动的更新渠道 + git tag/branch/SHA（用于源码检出副本），以及更新可用性。

```bash
openclaw update status
openclaw update status --json
openclaw update status --timeout 10
```

选项：

- `--json`：输出机器可读的状态 JSON。
- `--timeout <seconds>`：检查超时时间（默认 3 秒）。

## `update wizard`

交互式流程，用于选择更新渠道，并确认更新后是否重启 Gateway 网关
（默认会重启）。如果你在没有 git 检出副本的情况下选择 `dev`，
它会提供创建一个检出副本的选项。

选项：

- `--timeout <seconds>`：每个更新步骤的超时时间（默认 `1200`）

## 它会做什么

当你显式切换渠道（`--channel ...`）时，OpenClaw 也会保持
安装方式一致：

- `dev` → 确保存在一个 git 检出副本（默认：`~/openclaw`，可通过 `OPENCLAW_GIT_DIR` 覆盖），
  更新它，并从该检出副本安装全局 CLI。
- `stable` → 使用 `latest` 从 npm 安装。
- `beta` → 优先使用 npm dist-tag `beta`，但当 beta
  缺失或比当前 stable 发布更旧时，会回退到 `latest`。

Gateway 网关核心自动更新器（当在配置中启用时）会复用这一路径。

## Git 检出流程

渠道：

- `stable`：检出最新的非 beta tag，然后构建 + Doctor。
- `beta`：优先选择最新的 `-beta` tag，但当 beta 缺失或更旧时，会回退到最新 stable tag。
- `dev`：检出 `main`，然后 fetch + rebase。

高层流程：

1. 要求工作树是干净的（没有未提交更改）。
2. 切换到所选渠道（tag 或 branch）。
3. 获取上游更新（仅 `dev`）。
4. 仅 `dev`：在临时工作树中执行预检 lint + TypeScript 构建；如果最新提交失败，则最多向后回退 10 个提交，以找到最近一个可干净构建的提交。
5. 仅 `dev`：rebase 到所选提交。
6. 使用仓库包管理器安装依赖。对于 pnpm 检出副本，更新器会按需引导 `pnpm`（优先通过 `corepack`，然后回退到临时执行 `npm install pnpm@10`），而不是在 pnpm workspace 中运行 `npm run build`。
7. 构建 + 构建 Control UI。
8. 运行 `openclaw doctor`，作为最终的“安全更新”检查。
9. 将插件同步到当前活动渠道（`dev` 使用内置扩展；stable/beta 使用 npm），并更新通过 npm 安装的插件。

如果 pnpm 引导仍然失败，更新器现在会提前停止，并给出包管理器专用错误，而不是尝试在检出副本中执行 `npm run build`。

## `--update` 简写

`openclaw --update` 会重写为 `openclaw update`（对 shell 和启动脚本很有用）。

## 另请参见

- `openclaw doctor`（在 git 检出副本上会先提供运行更新）
- [开发渠道](/zh-CN/install/development-channels)
- [更新](/zh-CN/install/updating)
- [CLI 参考](/zh-CN/cli)
