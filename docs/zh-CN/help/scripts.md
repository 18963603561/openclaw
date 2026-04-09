---
read_when:
    - 运行仓库中的脚本
    - 添加或修改 `./scripts` 下的脚本
summary: 仓库脚本：用途、范围和安全说明
title: 脚本
x-i18n:
    generated_at: "2026-04-08T05:55:18Z"
    model: gpt-5.4
    provider: openai
    source_hash: 3ecf1e9327929948fb75f80e306963af49b353c0aa8d3b6fa532ca964ff8b975
    source_path: help\scripts.md
    workflow: 15
---

# 脚本

`scripts/` 目录包含用于本地工作流和运维任务的辅助脚本。
当某个任务明显与脚本相关时，请使用这些脚本；否则优先使用 CLI。

## 约定

- 除非文档或发布检查清单中有引用，否则脚本都是**可选的**。
- 当存在 CLI 表面时，优先使用 CLI（例如：认证监控使用 `openclaw models status --check`）。
- 假定脚本具有主机特定性；在新机器上运行前请先阅读它们。

## 认证监控脚本

认证监控已在 [??](/zh-CN/gateway/authentication) 中说明。`scripts/` 下的脚本是面向 systemd/Termux 手机工作流的可选补充。

## GitHub 只读辅助器

当你希望 `gh` 在仓库作用域的只读调用中使用 GitHub App 安装 token，同时让常规 `gh` 继续使用你的个人登录执行写入操作时，请使用 `scripts/gh-read`。

必需环境变量：

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

可选环境变量：

- `OPENCLAW_GH_READ_INSTALLATION_ID`，当你想跳过基于仓库的安装查找时使用
- `OPENCLAW_GH_READ_PERMISSIONS`，作为要请求的只读权限子集的逗号分隔覆盖值

仓库解析顺序：

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

示例：

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## 添加脚本时

- 保持脚本聚焦且有文档说明。
- 在相关文档中添加一条简短条目（如果缺失则创建）。
