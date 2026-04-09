---
read_when:
    - 你需要检查原始模型输出以排查推理泄漏
    - 你希望在迭代时以 watch 模式运行 Gateway 网关
    - 你需要一套可重复的调试工作流
summary: 用于调试的工具：watch 模式、原始模型流，以及推理泄漏追踪
title: 调试
x-i18n:
    generated_at: "2026-04-08T05:53:50Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4bc72e8d6cad3a1acaad066f381c82309583fabf304c589e63885f2685dc704e
    source_path: help\debugging.md
    workflow: 15
---

# 调试

本页介绍用于调试流式输出的辅助工具，尤其适用于
提供商将推理内容混入普通文本的情况。

## 运行时调试覆盖

在聊天中使用 `/debug` 可设置**仅运行时生效**的配置覆盖（存储于内存，而非磁盘）。
`/debug` 默认禁用；使用 `commands.debug: true` 启用。
当你需要切换一些不常见设置、又不想编辑 `openclaw.json` 时，这会很方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖，并恢复到磁盘上的配置。

## Gateway 网关 watch 模式

为了实现快速迭代，请在文件监视器下运行 Gateway 网关：

```bash
pnpm gateway:watch
```

这对应于：

```bash
node scripts/watch-node.mjs gateway --force
```

文件监视器会在 `src/` 下与构建相关的文件、扩展源码文件、
扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、
`package.json` 以及 `tsdown.config.ts` 发生变化时重启。
扩展元数据变更会重启 Gateway 网关，但不会强制执行 `tsdown` 重建；
源码和配置变更仍会先重建 `dist`。

你可以在 `gateway:watch` 后附加任何 Gateway 网关 CLI 标志，这些标志都会在
每次重启时继续传递。现在，如果针对同一仓库/标志集重复运行相同的 watch 命令，
它会替换旧的监视器，而不是留下重复的监视器父进程。

## dev 配置文件 + dev Gateway 网关（`--dev`）

使用 dev 配置文件可以隔离状态，并为
调试启动一套安全、可随时丢弃的环境。这里有**两个** `--dev` 标志：

- **全局 `--dev`（配置文件）**：将状态隔离到 `~/.openclaw-dev` 下，并且
  默认将 Gateway 网关端口设置为 `19001`（派生端口也会随之偏移）。
- **`gateway --dev`**：告诉 Gateway 网关在缺失时自动创建默认配置 +
  工作区（并跳过 `BOOTSTRAP.md`）。

推荐流程（dev 配置文件 + dev 引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果你还没有全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

它会执行以下操作：

1. **配置文件隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 端口也会相应偏移）

2. **dev 引导**（`gateway --dev`）
   - 如果缺失则写入最小配置（`gateway.mode=local`，绑定 loopback）。
   - 将 `agent.workspace` 设置为 dev 工作区。
   - 将 `agent.skipBootstrap=true`（不使用 `BOOTSTRAP.md`）。
   - 如果工作区文件缺失，则写入初始文件：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（协议机器人）。
   - 在 dev 模式下跳过渠道提供商（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是一个**全局**配置文件标志，某些运行器会吞掉它。
如果你需要显式写出它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会清除配置、凭证、会话以及 dev 工作区（使用
`trash`，而不是 `rm`），然后重新创建默认的 dev 设置。

提示：如果已有一个非 dev 的 Gateway 网关正在运行（launchd/systemd），请先停止它：

```bash
openclaw gateway stop
```

## 原始流日志记录（OpenClaw）

OpenClaw 可以在任何过滤/格式化之前记录**原始 assistant 流**。
这是查看推理内容是否以普通文本增量形式到达
（或作为单独 thinking 块到达）的最佳方式。

通过 CLI 启用：

```bash
pnpm gateway:watch --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效的环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始分块日志记录（pi-mono）

要在分块被解析为 blocks 之前捕获**原始 OpenAI 兼容分块**，
pi-mono 提供了一个单独的日志记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：这仅由使用 pi-mono
> `openai-completions` 提供商的进程输出。

## 安全说明

- 原始流日志可能包含完整提示词、工具输出和用户数据。
- 请将日志保留在本地，并在调试完成后删除。
- 如果你需要共享日志，请先清除 secrets 和 PII。
