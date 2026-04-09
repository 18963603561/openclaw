---
read_when:
    - 你想为 zsh/bash/fish/PowerShell 启用 shell 补全
    - 你需要将补全脚本缓存到 OpenClaw 状态目录下
summary: '`openclaw completion` 的 CLI 参考（生成 / 安装 shell 补全脚本）'
title: completion
x-i18n:
    generated_at: "2026-04-08T03:50:45Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7bbf140a880bafdb7140149f85465d66d0d46e5a3da6a1e41fb78be2fd2bd4d0
    source_path: cli\completion.md
    workflow: 15
---

# `openclaw completion`

生成 shell 补全脚本，并可选择将其安装到你的 shell 配置文件中。

## 用法

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 选项

- `-s, --shell <shell>`：shell 目标（`zsh`、`bash`、`powershell`、`fish`；默认：`zsh`）
- `-i, --install`：通过向你的 shell 配置文件添加 source 行来安装补全
- `--write-state`：将补全脚本写入 `$OPENCLAW_STATE_DIR/completions`，而不是输出到 stdout
- `-y, --yes`：跳过安装确认提示

## 说明

- `--install` 会向你的 shell 配置文件写入一个小型的 “OpenClaw Completion” 代码块，并让它指向缓存脚本。
- 如果不使用 `--install` 或 `--write-state`，该命令会将脚本打印到 stdout。
- 补全生成会预先加载命令树，因此嵌套子命令也会被包含在内。
