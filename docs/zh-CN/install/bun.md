---
read_when:
    - 你想要最快的本地开发循环（bun + watch）
    - 你遇到了 Bun 安装/补丁/lifecycle 脚本问题
summary: Bun 工作流（实验性）：与 pnpm 相比的安装方式和注意事项
title: Bun（实验性）
x-i18n:
    generated_at: "2026-04-08T05:59:50Z"
    model: gpt-5.4
    provider: openai
    source_hash: b0845567834124bb9206db64df013dc29f3b61a04da4f7e7f0c2823a9ecd67a6
    source_path: install\bun.md
    workflow: 15
---

# Bun（实验性）

<Warning>
不推荐将 Bun 用于 Gateway 网关运行时（已知存在 WhatsApp 和 Telegram 相关问题）。生产环境请使用 Node。
</Warning>

Bun 是一个可选的本地运行时，可用于直接运行 TypeScript（`bun run ...`、`bun --watch ...`）。默认的包管理器仍然是 `pnpm`，它受到完整支持，并用于文档工具链。Bun 不能使用 `pnpm-lock.yaml`，并且会忽略它。

## 安装

<Steps>
  <Step title="安装依赖">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已加入 gitignore，因此不会造成仓库变更。如果你想完全跳过 lockfile 写入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="构建和测试">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命周期脚本

除非被显式信任，否则 Bun 会阻止依赖的生命周期脚本。对于这个仓库，常见被阻止的脚本并不是必需的：

- `@whiskeysockets/baileys` `preinstall` -- 检查 Node 主版本是否 >= 20（OpenClaw 默认使用 Node 24，且仍支持 Node 22 LTS，目前为 `22.14+`）
- `protobufjs` `postinstall` -- 发出关于版本方案不兼容的警告（不会生成构建产物）

如果你遇到需要这些脚本的运行时问题，请显式信任它们：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事项

有些脚本仍然硬编码了 pnpm（例如 `docs:build`、`ui:*`、`protocol:check`）。目前请通过 pnpm 运行这些脚本。
