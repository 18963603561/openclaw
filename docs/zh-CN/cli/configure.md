---
read_when:
    - 你想以交互方式调整凭证、设备或智能体默认设置
summary: '`openclaw configure` 的 CLI 参考（交互式配置提示）'
title: configure
x-i18n:
    generated_at: "2026-04-08T03:51:04Z"
    model: gpt-5.4
    provider: openai
    source_hash: 989569fdb8e1b31ce3438756b3ed9bf18e0c8baf611c5981643ba5925459c98f
    source_path: cli\configure.md
    workflow: 15
---

# `openclaw configure`

用于设置凭证、设备和智能体默认值的交互式提示。

注意：**Model** 部分现在包含一个多选项，用于配置
`agents.defaults.models` allowlist（也就是 `/model` 和模型选择器中显示的内容）。

当配置从提供商身份验证选项开始时，默认模型和
allowlist 选择器会自动优先显示该提供商。对于成对提供商，例如 Volcengine / BytePlus，同样的优先规则也会匹配它们的 coding-plan
变体（`volcengine-plan/*`、`byteplus-plan/*`）。如果按首选提供商
过滤后会得到空列表，则 configure 会回退到未过滤的目录，而不是显示空白选择器。

提示：不带子命令运行 `openclaw config` 会打开相同的向导。对于非交互式编辑，请使用
`openclaw config get|set|unset`。

对于 Web 搜索，`openclaw configure --section web` 可让你选择一个提供商
并配置其凭证。某些提供商还会显示提供商特定的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY`，并
  允许你选择一个 `x_search` 模型。
- **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` 或
  `api.moonshot.cn`）以及默认的 Kimi Web 搜索模型。

相关内容：

- Gateway 网关配置参考：[配置](/zh-CN/gateway/configuration)
- Config CLI：[Config](/zh-CN/cli/config)

## 选项

- `--section <section>`：可重复的分区筛选项

可用分区：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

说明：

- 选择 Gateway 网关运行位置时，总是会更新 `gateway.mode`。如果这就是你唯一需要的内容，你可以在不选择其他分区的情况下直接选择 “Continue”。
- 面向渠道的服务（Slack / Discord / Matrix / Microsoft Teams）在设置期间会提示输入渠道 / 房间 allowlists。你可以输入名称或 ID；向导会在可能时将名称解析为 ID。
- 如果你运行 daemon 安装步骤，而 token 身份验证需要 token，且 `gateway.auth.token` 由 SecretRef 管理，configure 会验证 SecretRef，但不会将已解析的明文 token 值持久化到 supervisor 服务环境元数据中。
- 如果 token 身份验证需要 token，而已配置的 token SecretRef 尚未解析，configure 会阻止 daemon 安装，并提供可执行的修复指引。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password`，但 `gateway.auth.mode` 未设置，configure 会阻止 daemon 安装，直到显式设置 mode。

## 示例

```bash
openclaw configure
openclaw configure --section web
openclaw configure --section model --section channels
openclaw configure --section gateway --section daemon
```
