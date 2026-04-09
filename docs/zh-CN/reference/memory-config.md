---
read_when:
    - 你想配置 Memory 搜索 provider 或 embedding 模型
    - 你想设置 QMD 后端
    - 你想调优混合搜索、MMR 或时间衰减
    - 你想启用多模态 Memory 索引
summary: Memory 搜索、embedding providers、QMD、混合搜索和多模态索引的所有配置项
title: Memory 配置参考
x-i18n:
    generated_at: "2026-04-08T07:04:37Z"
    model: gpt-5.4
    provider: openai
    source_hash: 0de0b85125443584f4e575cf673ca8d9bd12ecd849d73c537f4a17545afa93fd
    source_path: reference\memory-config.md
    workflow: 15
---

# Memory 配置参考

本页列出了 OpenClaw Memory 搜索的所有配置项。有关概念性概览，请参见：

- [??](/zh-CN/concepts/memory) -- Memory 的工作方式
- [内置引擎](/zh-CN/concepts/memory-builtin) -- 默认 SQLite 后端
- [QMD 记忆引擎](/zh-CN/concepts/memory-qmd) -- local-first sidecar
- [记忆搜索](/zh-CN/concepts/memory-search) -- 搜索管线和调优

除非另有说明，所有 Memory 搜索设置都位于 `openclaw.json` 中的
`agents.defaults.memorySearch` 下。

---

## Provider 选择

| 键 | 类型 | 默认值 | 说明 |
| ---------- | --------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `provider` | `string`  | 自动检测 | Embedding adapter ID：`openai`、`gemini`、`voyage`、`mistral`、`bedrock`、`ollama`、`local` |
| `model`    | `string`  | provider 默认值 | Embedding 模型名称 |
| `fallback` | `string`  | `"none"`         | 当主 provider 失败时使用的回退 adapter ID |
| `enabled`  | `boolean` | `true`           | 启用或禁用 Memory 搜索 |

### 自动检测顺序

当未设置 `provider` 时，OpenClaw 会选择第一个可用项：

1. `local` -- 如果已配置 `memorySearch.local.modelPath` 且文件存在。
2. `openai` -- 如果可以解析到 OpenAI key。
3. `gemini` -- 如果可以解析到 Gemini key。
4. `voyage` -- 如果可以解析到 Voyage key。
5. `mistral` -- 如果可以解析到 Mistral key。
6. `bedrock` -- 如果 AWS SDK 凭证链可解析（实例角色、访问密钥、profile、SSO、web identity 或共享配置）。

支持 `ollama`，但不会自动检测（请显式设置）。

### API key 解析

远程 embeddings 需要 API key。Bedrock 则改用 AWS SDK 默认
凭证链（实例角色、SSO、访问密钥）。

| Provider | 环境变量 | 配置键 |
| -------- | ------------------------------ | --------------------------------- |
| OpenAI   | `OPENAI_API_KEY`               | `models.providers.openai.apiKey`  |
| Gemini   | `GEMINI_API_KEY`               | `models.providers.google.apiKey`  |
| Voyage   | `VOYAGE_API_KEY`               | `models.providers.voyage.apiKey`  |
| Mistral  | `MISTRAL_API_KEY`              | `models.providers.mistral.apiKey` |
| Bedrock  | AWS 凭证链 | 不需要 API key |
| Ollama   | `OLLAMA_API_KEY`（占位符） | --                                |

Codex OAuth 仅覆盖 chat/completions，不满足 embedding
请求。

---

## 远程端点配置

用于自定义兼容 OpenAI 的端点或覆盖 provider 默认值：

| 键 | 类型 | 说明 |
| ---------------- | -------- | -------------------------------------------------- |
| `remote.baseUrl` | `string` | 自定义 API base URL |
| `remote.apiKey`  | `string` | 覆盖 API key |
| `remote.headers` | `object` | 额外的 HTTP headers（与 provider 默认值合并） |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
        remote: {
          baseUrl: "https://api.example.com/v1/",
          apiKey: "YOUR_KEY",
        },
      },
    },
  },
}
```

---

## Gemini 专用配置

| 键 | 类型 | 默认值 | 说明 |
| ---------------------- | -------- | ---------------------- | ------------------------------------------ |
| `model`                | `string` | `gemini-embedding-001` | 也支持 `gemini-embedding-2-preview` |
| `outputDimensionality` | `number` | `3072`                 | 对于 Embedding 2：768、1536 或 3072 |

<Warning>
更改模型或 `outputDimensionality` 会触发自动全量重建索引。
</Warning>

---

## Bedrock embedding 配置

Bedrock 使用 AWS SDK 默认凭证链 -- 不需要 API key。
如果 OpenClaw 运行在启用了 Bedrock 实例角色的 EC2 上，只需设置
provider 和模型：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "bedrock",
        model: "amazon.titan-embed-text-v2:0",
      },
    },
  },
}
```

| 键 | 类型 | 默认值 | 说明 |
| ---------------------- | -------- | ------------------------------ | ------------------------------- |
| `model`                | `string` | `amazon.titan-embed-text-v2:0` | 任意 Bedrock embedding 模型 ID |
| `outputDimensionality` | `number` | 模型默认值 | 对于 Titan V2：256、512 或 1024 |

### 支持的模型

支持以下模型（带 family 检测和维度默认值）：

| 模型 ID | Provider | 默认维度 | 可配置维度 |
| ------------------------------------------ | ---------- | ------------ | -------------------- |
| `amazon.titan-embed-text-v2:0`             | Amazon     | 1024         | 256、512、1024       |
| `amazon.titan-embed-text-v1`               | Amazon     | 1536         | --                   |
| `amazon.titan-embed-g1-text-02`            | Amazon     | 1536         | --                   |
| `amazon.titan-embed-image-v1`              | Amazon     | 1024         | --                   |
| `amazon.nova-2-multimodal-embeddings-v1:0` | Amazon     | 1024         | 256、384、1024、3072 |
| `cohere.embed-english-v3`                  | Cohere     | 1024         | --                   |
| `cohere.embed-multilingual-v3`             | Cohere     | 1024         | --                   |
| `cohere.embed-v4:0`                        | Cohere     | 1536         | 256-1536             |
| `twelvelabs.marengo-embed-3-0-v1:0`        | TwelveLabs | 512          | --                   |
| `twelvelabs.marengo-embed-2-7-v1:0`        | TwelveLabs | 1024         | --                   |

带吞吐量后缀的变体（例如 `amazon.titan-embed-text-v1:2:8k`）会继承
基础模型的配置。

### 认证

Bedrock 认证使用标准 AWS SDK 凭证解析顺序：

1. 环境变量（`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`）
2. SSO token 缓存
3. Web identity token 凭证
4. 共享凭证和配置文件
5. ECS 或 EC2 元数据凭证

区域将从 `AWS_REGION`、`AWS_DEFAULT_REGION`、
`amazon-bedrock` provider 的 `baseUrl` 中解析，或默认使用 `us-east-1`。

### IAM 权限

IAM 角色或用户需要：

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"
}
```

若要最小权限，请将 `InvokeModel` 限定到特定模型：

```
arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0
```

---

## 本地 embedding 配置

| 键 | 类型 | 默认值 | 说明 |
| --------------------- | -------- | ---------------------- | ------------------------------- |
| `local.modelPath`     | `string` | 自动下载 | GGUF 模型文件路径 |
| `local.modelCacheDir` | `string` | node-llama-cpp 默认值 | 已下载模型的缓存目录 |

默认模型：`embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB，自动下载）。
需要原生构建：`pnpm approve-builds` 然后 `pnpm rebuild node-llama-cpp`。

---

## 混合搜索配置

全部位于 `memorySearch.query.hybrid` 下：

| 键 | 类型 | 默认值 | 说明 |
| --------------------- | --------- | ------- | ---------------------------------- |
| `enabled`             | `boolean` | `true`  | 启用混合 BM25 + 向量搜索 |
| `vectorWeight`        | `number`  | `0.7`   | 向量分数权重（0-1） |
| `textWeight`          | `number`  | `0.3`   | BM25 分数权重（0-1） |
| `candidateMultiplier` | `number`  | `4`     | 候选池大小倍数 |

### MMR（多样性）

| 键 | 类型 | 默认值 | 说明 |
| ------------- | --------- | ------- | ------------------------------------ |
| `mmr.enabled` | `boolean` | `false` | 启用 MMR 重排 |
| `mmr.lambda`  | `number`  | `0.7`   | 0 = 最大多样性，1 = 最大相关性 |

### 时间衰减（新近度）

| 键 | 类型 | 默认值 | 说明 |
| ---------------------------- | --------- | ------- | ------------------------- |
| `temporalDecay.enabled`      | `boolean` | `false` | 启用新近度加权 |
| `temporalDecay.halfLifeDays` | `number`  | `30`    | 每 N 天分数减半 |

常青文件（`MEMORY.md`、`memory/` 中非日期命名文件）永不衰减。

### 完整示例

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            vectorWeight: 0.7,
            textWeight: 0.3,
            mmr: { enabled: true, lambda: 0.7 },
            temporalDecay: { enabled: true, halfLifeDays: 30 },
          },
        },
      },
    },
  },
}
```

---

## 额外 Memory 路径

| 键 | 类型 | 说明 |
| ------------ | ---------- | ---------------------------------------- |
| `extraPaths` | `string[]` | 要建立索引的额外目录或文件 |

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        extraPaths: ["../team-docs", "/srv/shared-notes"],
      },
    },
  },
}
```

路径可以是绝对路径或相对于工作区的路径。目录会递归扫描
`.md` 文件。符号链接处理取决于当前后端：
内置引擎会忽略符号链接，而 QMD 会遵循底层 QMD
扫描器的行为。

对于按智能体作用域的跨智能体转录搜索，请使用
`agents.list[].memorySearch.qmd.extraCollections`，而不是 `memory.qmd.paths`。
这些额外集合采用相同的 `{ path, name, pattern? }` 结构，但会按智能体合并，并且当路径指向当前工作区之外时可以保留显式共享名称。
如果同一解析后路径同时出现在 `memory.qmd.paths` 和
`memorySearch.qmd.extraCollections` 中，QMD 会保留第一项并跳过
重复项。

---

## 多模态 Memory（Gemini）

使用 Gemini Embedding 2 在 Markdown 之外为图像和音频建立索引：

| 键 | 类型 | 默认值 | 说明 |
| ------------------------- | ---------- | ---------- | -------------------------------------- |
| `multimodal.enabled`      | `boolean`  | `false`    | 启用多模态索引 |
| `multimodal.modalities`   | `string[]` | --         | `["image"]`、`["audio"]` 或 `["all"]` |
| `multimodal.maxFileBytes` | `number`   | `10000000` | 可建立索引的最大文件大小 |

仅适用于 `extraPaths` 中的文件。默认 Memory 根目录仍然仅支持 Markdown。
需要 `gemini-embedding-2-preview`。`fallback` 必须为 `"none"`。

支持格式：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`
（图像）；`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`（音频）。

---

## Embedding 缓存

| 键 | 类型 | 默认值 | 说明 |
| ------------------ | --------- | ------- | -------------------------------- |
| `cache.enabled`    | `boolean` | `false` | 在 SQLite 中缓存 chunk embeddings |
| `cache.maxEntries` | `number`  | `50000` | 最大缓存 embedding 数量 |

可防止在重建索引或转录更新时，对未变更文本重复进行 embedding。

---

## 批量索引

| 键 | 类型 | 默认值 | 说明 |
| ----------------------------- | --------- | ------- | -------------------------- |
| `remote.batch.enabled`        | `boolean` | `false` | 启用批量 embedding API |
| `remote.batch.concurrency`    | `number`  | `2`     | 并行批处理任务数 |
| `remote.batch.wait`           | `boolean` | `true`  | 等待批处理完成 |
| `remote.batch.pollIntervalMs` | `number`  | --      | 轮询间隔 |
| `remote.batch.timeoutMinutes` | `number`  | --      | 批处理超时 |

适用于 `openai`、`gemini` 和 `voyage`。对于大型回填场景，OpenAI 批处理通常
最快且最便宜。

---

## 会话 Memory 搜索（实验性）

为会话转录建立索引，并通过 `memory_search` 暴露：

| 键 | 类型 | 默认值 | 说明 |
| ----------------------------- | ---------- | ------------ | --------------------------------------- |
| `experimental.sessionMemory`  | `boolean`  | `false`      | 启用会话索引 |
| `sources`                     | `string[]` | `["memory"]` | 添加 `"sessions"` 以包含转录 |
| `sync.sessions.deltaBytes`    | `number`   | `100000`     | 触发重建索引的字节阈值 |
| `sync.sessions.deltaMessages` | `number`   | `50`         | 触发重建索引的消息阈值 |

会话索引为显式启用，且异步运行。结果可能会有轻微滞后。
会话日志存储在磁盘上，因此请将文件系统访问视为信任边界。

---

## SQLite 向量加速（sqlite-vec）

| 键 | 类型 | 默认值 | 说明 |
| ---------------------------- | --------- | ------- | --------------------------------- |
| `store.vector.enabled`       | `boolean` | `true`  | 使用 sqlite-vec 进行向量查询 |
| `store.vector.extensionPath` | `string`  | 内置 | 覆盖 sqlite-vec 路径 |

当 sqlite-vec 不可用时，OpenClaw 会自动回退到进程内 cosine
similarity。

---

## 索引存储

| 键 | 类型 | 默认值 | 说明 |
| --------------------- | -------- | ------------------------------------- | ------------------------------------------- |
| `store.path`          | `string` | `~/.openclaw/memory/{agentId}.sqlite` | 索引位置（支持 `{agentId}` token） |
| `store.fts.tokenizer` | `string` | `unicode61`                           | FTS5 tokenizer（`unicode61` 或 `trigram`） |

---

## QMD 后端配置

设置 `memory.backend = "qmd"` 以启用。所有 QMD 设置都位于
`memory.qmd` 下：

| 键 | 类型 | 默认值 | 说明 |
| ------------------------ | --------- | -------- | -------------------------------------------- |
| `command`                | `string`  | `qmd`    | QMD 可执行文件路径 |
| `searchMode`             | `string`  | `search` | 搜索命令：`search`、`vsearch`、`query` |
| `includeDefaultMemory`   | `boolean` | `true`   | 自动索引 `MEMORY.md` + `memory/**/*.md` |
| `paths[]`                | `array`   | --       | 额外路径：`{ name, path, pattern? }` |
| `sessions.enabled`       | `boolean` | `false`  | 索引会话转录 |
| `sessions.retentionDays` | `number`  | --       | 转录保留期 |
| `sessions.exportDir`     | `string`  | --       | 导出目录 |

OpenClaw 优先使用当前的 QMD collection 和 MCP 查询结构，但仍通过在需要时回退到旧版 `--mask` collection 标志和旧版 MCP 工具名称，保持对旧版 QMD 发布的兼容。

QMD 模型覆盖保留在 QMD 侧，而不是 OpenClaw 配置中。如果你需要
全局覆盖 QMD 的模型，请在 Gateway 网关运行时环境中设置环境变量，例如
`QMD_EMBED_MODEL`、`QMD_RERANK_MODEL` 和 `QMD_GENERATE_MODEL`。

### 更新计划

| 键 | 类型 | 默认值 | 说明 |
| ------------------------- | --------- | ------- | ------------------------------------- |
| `update.interval`         | `string`  | `5m`    | 刷新间隔 |
| `update.debounceMs`       | `number`  | `15000` | 文件变更去抖时间 |
| `update.onBoot`           | `boolean` | `true`  | 启动时刷新 |
| `update.waitForBootSync`  | `boolean` | `false` | 在刷新完成前阻塞启动 |
| `update.embedInterval`    | `string`  | --      | 单独的 embedding 周期 |
| `update.commandTimeoutMs` | `number`  | --      | QMD 命令超时 |
| `update.updateTimeoutMs`  | `number`  | --      | QMD 更新操作超时 |
| `update.embedTimeoutMs`   | `number`  | --      | QMD embedding 操作超时 |

### 限制

| 键 | 类型 | 默认值 | 说明 |
| ------------------------- | -------- | ------- | -------------------------- |
| `limits.maxResults`       | `number` | `6`     | 最大搜索结果数 |
| `limits.maxSnippetChars`  | `number` | --      | 截断 snippet 长度 |
| `limits.maxInjectedChars` | `number` | --      | 截断注入字符总数 |
| `limits.timeoutMs`        | `number` | `4000`  | 搜索超时 |

### 作用域

控制哪些会话可以接收 QMD 搜索结果。schema 与
[`session.sendPolicy`](/zh-CN/gateway/configuration-reference#session) 相同：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

默认仅限私信。`match.keyPrefix` 匹配标准化后的 session key；
`match.rawKeyPrefix` 匹配包含 `agent:<id>:` 的原始 key。

### 引用

`memory.citations` 适用于所有后端：

| 值 | 行为 |
| ---------------- | --------------------------------------------------- |
| `auto`（默认） | 在 snippets 中包含 `Source: <path#line>` 页脚 |
| `on`             | 始终包含页脚 |
| `off`            | 省略页脚（路径仍会在内部传递给智能体） |

### 完整 QMD 示例

```json5
{
  memory: {
    backend: "qmd",
    citations: "auto",
    qmd: {
      includeDefaultMemory: true,
      update: { interval: "5m", debounceMs: 15000 },
      limits: { maxResults: 6, timeoutMs: 4000 },
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

---

## Dreaming（实验性）

Dreaming 配置位于 `plugins.entries.memory-core.config.dreaming` 下，
而不是 `agents.defaults.memorySearch` 下。

Dreaming 会作为一次计划内扫描运行，并将内部的 light/deep/REM 阶段作为
实现细节使用。

有关概念行为和斜杠命令，请参见 [Dreaming（实验性）](/zh-CN/concepts/dreaming)。

### 用户设置

| 键 | 类型 | 默认值 | 说明 |
| ----------- | --------- | ----------- | ------------------------------------------------- |
| `enabled`   | `boolean` | `false`     | 完全启用或禁用 Dreaming |
| `frequency` | `string`  | `0 3 * * *` | 完整 Dreaming 扫描的可选 cron 周期 |

### 示例

```json5
{
  plugins: {
    entries: {
      "memory-core": {
        config: {
          dreaming: {
            enabled: true,
            frequency: "0 3 * * *",
          },
        },
      },
    },
  },
}
```

说明：

- Dreaming 会将机器状态写入 `memory/.dreams/`。
- Dreaming 会将人类可读的叙事输出写入 `DREAMS.md`（或现有的 `dreams.md`）。
- light/deep/REM 阶段策略和阈值属于内部行为，不是面向用户的配置。
