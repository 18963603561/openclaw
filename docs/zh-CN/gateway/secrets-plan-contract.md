---
read_when:
    - 生成或审查 `openclaw secrets apply` 计划时
    - 调试 `Invalid plan target path` 错误时
    - 理解目标类型和路径校验行为时
summary: '`secrets apply` 计划的契约：目标校验、路径匹配，以及 `auth-profiles.json` 目标范围'
title: Secrets Apply 计划契约
x-i18n:
    generated_at: "2026-04-08T05:50:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: cb89a426ca937cf4d745f641b43b330c7fbb1aa9e4359b106ecd28d7a65ca327
    source_path: gateway\secrets-plan-contract.md
    workflow: 15
---

# Secrets apply 计划契约

本页定义了 `openclaw secrets apply` 强制执行的严格契约。

如果某个目标不符合这些规则，则会在修改配置之前应用失败。

## 计划文件结构

`openclaw secrets apply --from <plan.json>` 期望接收一个包含计划目标 `targets` 数组的文件：

```json5
{
  version: 1,
  protocolVersion: 1,
  targets: [
    {
      type: "models.providers.apiKey",
      path: "models.providers.openai.apiKey",
      pathSegments: ["models", "providers", "openai", "apiKey"],
      providerId: "openai",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
    {
      type: "auth-profiles.api_key.key",
      path: "profiles.openai:default.key",
      pathSegments: ["profiles", "openai:default", "key"],
      agentId: "main",
      ref: { source: "env", provider: "default", id: "OPENAI_API_KEY" },
    },
  ],
}
```

## 支持的目标范围

计划目标可用于以下位置中受支持的凭证路径：

- [SecretRef 凭证表面](/reference/secretref-credential-surface)

## 目标类型行为

通用规则：

- `target.type` 必须是可识别的，并且必须与规范化后的 `target.path` 结构匹配。

为了兼容现有计划，以下兼容别名仍然被接受：

- `models.providers.apiKey`
- `skills.entries.apiKey`
- `channels.googlechat.serviceAccount`

## 路径校验规则

每个目标都会使用以下所有规则进行校验：

- `type` 必须是受识别的目标类型。
- `path` 必须是非空的点分路径。
- `pathSegments` 可以省略。如果提供，它规范化后必须与 `path` 完全相同。
- 以下被禁止的段会被拒绝：`__proto__`、`prototype`、`constructor`。
- 规范化后的路径必须与该目标类型已注册的路径结构匹配。
- 如果设置了 `providerId` 或 `accountId`，它必须与路径中编码的 id 匹配。
- `auth-profiles.json` 目标要求提供 `agentId`。
- 创建新的 `auth-profiles.json` 映射时，请包含 `authProfileProvider`。

## 失败行为

如果某个目标未通过校验，应用会带着如下错误退出：

```text
Invalid plan target path for models.providers.apiKey: models.providers.openai.baseUrl
```

对于无效计划，不会提交任何写入。

## exec 提供商同意行为

- `--dry-run` 默认会跳过 exec SecretRef 检查。
- 包含 exec SecretRef/提供商的计划在写入模式下会被拒绝，除非设置了 `--allow-exec`。
- 在校验/应用包含 exec 的计划时，请在 dry-run 和写入命令中都传递 `--allow-exec`。

## 运行时和审计范围说明

- 仅含 ref 的 `auth-profiles.json` 条目（`keyRef`/`tokenRef`）会包含在运行时解析和审计覆盖范围内。
- `secrets apply` 会写入受支持的 `openclaw.json` 目标、受支持的 `auth-profiles.json` 目标，以及可选的 scrub 目标。

## 操作检查

```bash
# Validate plan without writes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run

# Then apply for real
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json

# For exec-containing plans, opt in explicitly in both modes
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
```

如果应用因无效目标路径消息而失败，请使用 `openclaw secrets configure` 重新生成计划，或将目标路径修正为上述受支持的结构。

## 相关文档

- [Secrets 管理](/zh-CN/gateway/secrets)
- [CLI `secrets`](/cli/secrets)
- [SecretRef 凭证表面](/reference/secretref-credential-surface)
- [配置参考](/gateway/configuration-reference)
