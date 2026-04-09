---
read_when:
    - 你想以非交互方式读取或编辑配置
summary: '`openclaw config` 的 CLI 参考（get/set/unset/file/schema/validate）'
title: config
x-i18n:
    generated_at: "2026-04-08T03:51:33Z"
    model: gpt-5.4
    provider: openai
    source_hash: e4de30f41e15297019151ad1a5b306cb331fd5c2beefd5ce5b98fcc51e95f0de
    source_path: cli\config.md
    workflow: 15
---

# `openclaw config`

用于在 `openclaw.json` 中进行非交互式编辑的配置辅助命令：按路径执行 get/set/unset/file/schema/validate
取值，并打印当前活动的配置文件。若运行时不带子命令，则会打开配置向导（与 `openclaw configure` 相同）。

根选项：

- `--section <section>`：当你在不带子命令的情况下运行 `openclaw config` 时，可重复使用的引导式设置分区过滤器

支持的引导分区：

- `workspace`
- `model`
- `web`
- `gateway`
- `daemon`
- `channels`
- `plugins`
- `skills`
- `health`

## 示例

```bash
openclaw config file
openclaw config --section model
openclaw config --section gateway --section daemon
openclaw config schema
openclaw config get browser.executablePath
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config set agents.list[0].tools.exec.node "node-id-or-name"
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set secrets.providers.vaultfile --provider-source file --provider-path /etc/openclaw/secrets.json --provider-mode json
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN --dry-run
openclaw config validate
openclaw config validate --json
```

### `config schema`

将为 `openclaw.json` 生成的 JSON schema 以 JSON 形式输出到 stdout。

其包含内容：

- 当前的根配置 schema，以及供编辑器工具使用的根 `$schema` 字符串字段
- Control UI 使用的字段 `title` 和 `description` 文档元数据
- 当存在匹配字段文档时，嵌套对象、通配符（`*`）和数组项（`[]`）节点会继承相同的 `title` / `description` 元数据
- 当存在匹配字段文档时，`anyOf` / `oneOf` / `allOf` 分支也会继承相同的文档元数据
- 当可加载运行时 manifest 时，尽力提供实时插件 + 渠道 schema 元数据
- 即使当前配置无效，也会提供一个干净的回退 schema

相关运行时 RPC：

- `config.schema.lookup` 会返回一个规范化后的配置路径及其浅层
  schema 节点（`title`、`description`、`type`、`enum`、`const`、常见边界），
  匹配到的 UI hint 元数据，以及直接子项摘要。可将其用于
  Control UI 或自定义客户端中的按路径下钻。

```bash
openclaw config schema
```

如果你想将其保存到文件中进行检查，或用其他工具验证，请使用管道：

```bash
openclaw config schema > openclaw.schema.json
```

### 路径

路径支持点号或方括号表示法：

```bash
openclaw config get agents.defaults.workspace
openclaw config get agents.list[0].id
```

使用智能体列表索引来定位特定智能体：

```bash
openclaw config get agents.list
openclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## 值

值会在可能时按 JSON5 解析；否则会被视为字符串。
使用 `--strict-json` 可强制要求按 JSON5 解析。`--json` 作为旧版别名仍受支持。

```bash
openclaw config set agents.defaults.heartbeat.every "0m"
openclaw config set gateway.port 19001 --strict-json
openclaw config set channels.whatsapp.groups '["*"]' --strict-json
```

`config get <path> --json` 会以 JSON 输出原始值，而不是终端格式化文本。

## `config set` 模式

`openclaw config set` 支持四种赋值方式：

1. 值模式：`openclaw config set <path> <value>`
2. SecretRef 构造模式：

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN
```

3. 提供商构造模式（仅适用于 `secrets.providers.<alias>` 路径）：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-timeout-ms 5000
```

4. 批量模式（`--batch-json` 或 `--batch-file`）：

```bash
openclaw config set --batch-json '[
  {
    "path": "secrets.providers.default",
    "provider": { "source": "env" }
  },
  {
    "path": "channels.discord.token",
    "ref": { "source": "env", "provider": "default", "id": "DISCORD_BOT_TOKEN" }
  }
]'
```

```bash
openclaw config set --batch-file ./config-set.batch.json --dry-run
```

策略说明：

- 在不支持运行时可变更的接口上，SecretRef 赋值会被拒绝（例如 `hooks.token`、`commands.ownerDisplaySecret`、Discord 线程绑定 webhook token，以及 WhatsApp creds JSON）。参见 [SecretRef Credential Surface](/reference/secretref-credential-surface)。

批量解析始终以批量负载（`--batch-json`/`--batch-file`）作为事实来源。
`--strict-json` / `--json` 不会改变批量解析行为。

JSON 路径/值模式对于 SecretRef 和提供商也仍然受支持：

```bash
openclaw config set channels.discord.token \
  '{"source":"env","provider":"default","id":"DISCORD_BOT_TOKEN"}' \
  --strict-json

openclaw config set secrets.providers.vaultfile \
  '{"source":"file","path":"/etc/openclaw/secrets.json","mode":"json"}' \
  --strict-json
```

## 提供商构造标志

提供商构造目标路径必须使用 `secrets.providers.<alias>`。

通用标志：

- `--provider-source <env|file|exec>`
- `--provider-timeout-ms <ms>`（`file`、`exec`）

Env 提供商（`--provider-source env`）：

- `--provider-allowlist <ENV_VAR>`（可重复）

File 提供商（`--provider-source file`）：

- `--provider-path <path>`（必填）
- `--provider-mode <singleValue|json>`
- `--provider-max-bytes <bytes>`

Exec 提供商（`--provider-source exec`）：

- `--provider-command <path>`（必填）
- `--provider-arg <arg>`（可重复）
- `--provider-no-output-timeout-ms <ms>`
- `--provider-max-output-bytes <bytes>`
- `--provider-json-only`
- `--provider-env <KEY=VALUE>`（可重复）
- `--provider-pass-env <ENV_VAR>`（可重复）
- `--provider-trusted-dir <path>`（可重复）
- `--provider-allow-insecure-path`
- `--provider-allow-symlink-command`

加固后的 exec 提供商示例：

```bash
openclaw config set secrets.providers.vault \
  --provider-source exec \
  --provider-command /usr/local/bin/openclaw-vault \
  --provider-arg read \
  --provider-arg openai/api-key \
  --provider-json-only \
  --provider-pass-env VAULT_TOKEN \
  --provider-trusted-dir /usr/local/bin \
  --provider-timeout-ms 5000
```

## Dry run

使用 `--dry-run` 可在不写入 `openclaw.json` 的情况下验证更改。

```bash
openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run

openclaw config set channels.discord.token \
  --ref-provider default \
  --ref-source env \
  --ref-id DISCORD_BOT_TOKEN \
  --dry-run \
  --json

openclaw config set channels.discord.token \
  --ref-provider vault \
  --ref-source exec \
  --ref-id discord/token \
  --dry-run \
  --allow-exec
```

Dry-run 行为：

- 构造模式：对变更后的 refs/providers 执行 SecretRef 可解析性检查。
- JSON 模式（`--strict-json`、`--json` 或批量模式）：执行 schema 校验以及 SecretRef 可解析性检查。
- 也会对已知不支持 SecretRef 的目标接口执行策略校验。
- 策略检查会评估变更后的完整配置，因此父对象写入（例如将 `hooks` 设为对象）无法绕过不支持接口校验。
- 默认会跳过 dry-run 期间的 exec SecretRef 检查，以避免命令副作用。
- 如需启用 exec SecretRef 检查，请在 `--dry-run` 时加入 `--allow-exec`（这可能会执行提供商命令）。
- `--allow-exec` 仅适用于 dry-run；若不与 `--dry-run` 一起使用则会报错。

`--dry-run --json` 会输出机器可读报告：

- `ok`：dry-run 是否通过
- `operations`：评估的赋值操作数量
- `checks`：是否运行了 schema/可解析性检查
- `checks.resolvabilityComplete`：可解析性检查是否完整执行（当跳过 exec refs 时为 false）
- `refsChecked`：dry-run 期间实际解析的 ref 数量
- `skippedExecRefs`：由于未设置 `--allow-exec` 而跳过的 exec ref 数量
- `errors`：当 `ok=false` 时输出结构化的 schema/可解析性失败信息

### JSON 输出结构

```json5
{
  ok: boolean,
  operations: number,
  configPath: string,
  inputModes: ["value" | "json" | "builder", ...],
  checks: {
    schema: boolean,
    resolvability: boolean,
    resolvabilityComplete: boolean,
  },
  refsChecked: number,
  skippedExecRefs: number,
  errors?: [
    {
      kind: "schema" | "resolvability",
      message: string,
      ref?: string, // 存在于可解析性错误中
    },
  ],
}
```

成功示例：

```json
{
  "ok": true,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0
}
```

失败示例：

```json
{
  "ok": false,
  "operations": 1,
  "configPath": "~/.openclaw/openclaw.json",
  "inputModes": ["builder"],
  "checks": {
    "schema": false,
    "resolvability": true,
    "resolvabilityComplete": true
  },
  "refsChecked": 1,
  "skippedExecRefs": 0,
  "errors": [
    {
      "kind": "resolvability",
      "message": "Error: Environment variable \"MISSING_TEST_SECRET\" is not set.",
      "ref": "env:default:MISSING_TEST_SECRET"
    }
  ]
}
```

如果 dry-run 失败：

- `config schema validation failed`：变更后的配置结构无效；请修正路径/值，或修正 provider/ref 对象结构。
- `Config policy validation failed: unsupported SecretRef usage`：请将该凭证改回明文/字符串输入，并仅在受支持的接口上使用 SecretRef。
- `SecretRef assignment(s) could not be resolved`：被引用的 provider/ref 当前无法解析（缺少环境变量、文件指针无效、exec provider 失败，或 provider/source 不匹配）。
- `Dry run note: skipped <n> exec SecretRef resolvability check(s)`：dry-run 跳过了 exec refs；若你需要验证 exec 可解析性，请使用 `--allow-exec` 重新运行。
- 对于批量模式，请修复失败条目后，再次执行 `--dry-run`，确认无误后再写入。

## 子命令

- `config file`：打印当前活动配置文件路径（从 `OPENCLAW_CONFIG_PATH` 或默认位置解析）。

编辑后请重启 Gateway 网关。

## Validate

在不启动 Gateway 网关 的情况下，使用当前活动 schema 校验当前配置。

```bash
openclaw config validate
openclaw config validate --json
```
