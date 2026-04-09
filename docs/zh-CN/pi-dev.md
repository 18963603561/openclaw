---
read_when:
    - 开发 Pi 集成代码或测试时
    - 运行 Pi 专用的 lint、typecheck 和实时测试流程时
summary: Pi 集成的开发工作流：构建、测试与实时验证
title: Pi 开发工作流
x-i18n:
    generated_at: "2026-04-08T06:11:32Z"
    model: gpt-5.4
    provider: openai
    source_hash: f61ebe29ea38ac953a03fe848fe5ac6b6de4bace5e6955b76ae9a7d093eb0cc5
    source_path: pi-dev.md
    workflow: 15
---

# Pi 开发工作流

本指南总结了在 OpenClaw 中开发 Pi 集成时的一套合理工作流。

## 类型检查与 Lint

- 默认本地门禁：`pnpm check`
- 构建门禁：当改动可能影响构建输出、打包或 lazy-loading/module 边界时，运行 `pnpm build`
- 面向 Pi 的重度改动的完整合入门禁：`pnpm check && pnpm test`

## 运行 Pi 测试

使用 Vitest 直接运行聚焦于 Pi 的测试集：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

如需包含实时 provider 验证：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

这覆盖了主要的 Pi 单元测试套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## 手动测试

推荐流程：

- 以开发模式运行 gateway：
  - `pnpm gateway:dev`
- 直接触发智能体：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，请提示执行 `read` 或 `exec` 动作，这样你就可以看到工具流式输出和负载处理。

## 清空状态重置

状态存储在 OpenClaw 状态目录下。默认是 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则改用该目录。

如需重置所有内容：

- 用于配置的 `openclaw.json`
- 用于模型 auth profiles（API keys + OAuth）的 `agents/<agentId>/agent/auth-profiles.json`
- 用于仍存储在 auth profile 存储之外的 provider/渠道状态的 `credentials/`
- 用于智能体会话历史的 `agents/<agentId>/sessions/`
- 用于会话索引的 `agents/<agentId>/sessions/sessions.json`
- 如果存在旧路径，则删除 `sessions/`
- 如果你希望工作区为空白状态，则删除 `workspace/`

如果你只想重置会话，请删除该智能体的 `agents/<agentId>/sessions/`。如果你希望保留认证信息，请保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何 provider 状态。

## 参考

- [测试](/zh-CN/help/testing)
- [入门指南](/zh-CN/start/getting-started)
