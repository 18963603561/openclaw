---
read_when:
    - 你想将 Exa 用于 `web_search`
    - 你需要一个 `EXA_API_KEY`
    - 你想使用神经搜索或内容提取
summary: Exa AI 搜索 —— 带内容提取的神经搜索和关键词搜索
title: Exa Search
x-i18n:
    generated_at: "2026-04-09T00:54:39Z"
    model: gpt-5.4
    provider: openai
    source_hash: 307b727b4fb88756cac51c17ffd73468ca695c4481692e03d0b4a9969982a2a8
    source_path: tools\exa-search.md
    workflow: 15
---

# Exa Search

OpenClaw 支持将 [Exa AI](https://exa.ai/) 用作 `web_search` 提供商。Exa
提供神经搜索、关键词搜索和混合搜索模式，并内置内容提取功能
（高亮、正文文本、摘要）。

## 获取 API 密钥

<Steps>
  <Step title="创建账号">
    在 [exa.ai](https://exa.ai/) 注册，并在你的控制台中生成一个 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 网关环境中设置 `EXA_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // 如果已设置 EXA_API_KEY，则此项可选
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**环境变量替代方式：** 在 Gateway 网关环境中设置 `EXA_API_KEY`。
对于 Gateway 网关安装，请将其放入 `~/.openclaw/.env`。

## 工具参数

| 参数 | 说明 |
| ------------- | ----------------------------------------------------------------------------- |
| `query` | 搜索查询（必填） |
| `count` | 返回结果数量（1-100） |
| `type` | 搜索模式：`auto`、`neural`、`fast`、`deep`、`deep-reasoning` 或 `instant` |
| `freshness` | 时间过滤器：`day`、`week`、`month` 或 `year` |
| `date_after` | 该日期之后的结果（YYYY-MM-DD） |
| `date_before` | 该日期之前的结果（YYYY-MM-DD） |
| `contents` | 内容提取选项（见下文） |

### 内容提取

Exa 可以在搜索结果旁返回提取出的内容。传入一个 `contents`
对象即可启用：

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // full page text
    highlights: { numSentences: 3 }, // key sentences
    summary: true, // AI summary
  },
});
```

| 内容选项 | 类型 | 说明 |
| --------------- | --------------------------------------------------------------------- | ---------------------- |
| `text` | `boolean \| { maxCharacters }` | 提取整页正文文本 |
| `highlights` | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取关键句 |
| `summary` | `boolean \| { query }` | AI 生成摘要 |

### 搜索模式

| 模式 | 说明 |
| ---------------- | --------------------------------- |
| `auto` | Exa 选择最佳模式（默认） |
| `neural` | 基于语义/含义的搜索 |
| `fast` | 快速关键词搜索 |
| `deep` | 深度全面搜索 |
| `deep-reasoning` | 带推理的深度搜索 |
| `instant` | 最快返回结果 |

## 说明

- 如果未提供 `contents` 选项，Exa 默认使用 `{ highlights: true }`
  以便结果包含关键句摘录
- 在可用时，结果会保留来自 Exa API
  响应中的 `highlightScores` 和 `summary` 字段
- 结果描述会优先从 highlights 解析，其次是 summary，再其次是
  完整正文文本——使用其中可用的内容
- `freshness` 与 `date_after`/`date_before` 不能组合使用——请选择一种
  时间过滤模式
- 每次查询最多可返回 100 条结果（受 Exa 搜索类型限制）
- 结果默认缓存 15 分钟（可通过
  `cacheTtlMinutes` 配置）
- Exa 是官方 API 集成，返回结构化 JSON 响应

## 相关内容

- [Web ??](/zh-CN/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh-CN/tools/brave-search) -- 带国家/语言过滤器的结构化结果
- [Perplexity Search](/zh-CN/tools/perplexity-search) -- 带域名过滤的结构化结果
