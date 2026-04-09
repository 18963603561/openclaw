---
x-i18n:
    generated_at: "2026-04-08T03:38:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: ec8fff07c27d9d6aac3acb99ddb070110e0daf6a0a364811b762567b992dd503
    source_path: .generated\README.md
    workflow: 15
---

# 生成的文档产物

SHA-256 哈希文件是受跟踪的漂移检测产物。完整的 JSON 基线会在本地生成（被 `gitignore` 忽略），仅用于检查。

**受跟踪（已提交到 git）：**

- `config-baseline.sha256` — 配置基线 JSON 产物的哈希值。
- `plugin-sdk-api-baseline.sha256` — 插件 SDK API 基线产物的哈希值。

**仅限本地（被 `gitignore` 忽略）：**

- `config-baseline.json`、`config-baseline.core.json`、`config-baseline.channel.json`、`config-baseline.plugin.json`
- `plugin-sdk-api-baseline.json`、`plugin-sdk-api-baseline.jsonl`

不要手动编辑这些文件中的任何一个。

- 重新生成配置基线：`pnpm config:docs:gen`
- 验证配置基线：`pnpm config:docs:check`
- 重新生成插件 SDK API 基线：`pnpm plugin-sdk:api:gen`
- 验证插件 SDK API 基线：`pnpm plugin-sdk:api:check`
