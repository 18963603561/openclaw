---
read_when:
    - 你遇到连接/认证问题并希望获得引导式修复
    - 你已完成更新并想做一次安装完整性检查
summary: '`openclaw doctor` 的 CLI 参考（健康检查 + 引导修复）'
title: Doctor
x-i18n:
    generated_at: "2026-04-08T03:51:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: d257a9e2797b4b0b50c1020165c8a1cd6a2342381bf9c351645ca37494c881e1
    source_path: cli\doctor.md
    workflow: 15
---

# `openclaw doctor`

用于 Gateway 网关和渠道的健康检查 + 快速修复。

相关内容：

- 故障排除： [故障排除](/gateway/troubleshooting)
- 安全审计： [安全](/gateway/security)

## 示例

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

## 选项

- `--no-workspace-suggestions`：禁用工作区记忆/搜索建议
- `--yes`：接受默认值而不提示
- `--repair`：不经提示直接应用推荐修复
- `--fix`：`--repair` 的别名
- `--force`：应用激进修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`：无提示运行；仅执行安全迁移
- `--generate-gateway-token`：生成并配置 gateway token
- `--deep`：扫描系统服务以查找额外的 Gateway 网关安装

说明：

- 交互式提示（如钥匙串/OAuth 修复）仅在 stdin 是 TTY 且**未**设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每一项删除内容。
- 状态完整性检查现在会检测会话目录中的孤立转录文件，并可将其归档为 `.deleted.<timestamp>` 以安全回收空间。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron job 结构，并可在调度器运行时自动规范化之前原地重写它们。
- Doctor 会自动将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。
- 当唯一差异只是对象键顺序时，重复运行 `doctor --fix` 不再报告/应用 Talk 规范化。
- Doctor 包含 memory-search 就绪性检查，并可在缺少嵌入凭证时建议运行 `openclaw configure --section model`。
- 如果已启用沙箱模式但 Docker 不可用，doctor 会报告高信号警告，并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，而不会写入明文回退凭证。
- 如果在修复路径中渠道 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是提前退出。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）要求当前命令路径中存在可解析的 Telegram token。如果 token 检查不可用，doctor 会报告警告，并在本次运行中跳过自动解析。

## macOS：`launchctl` 环境变量覆盖

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件，并可能导致持续性的“unauthorized”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
