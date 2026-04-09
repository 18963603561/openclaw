---
read_when:
    - 你想将 MiniMax 用于 `web_search`
    - 你需要 MiniMax Coding Plan 密钥
    - 你希望了解 MiniMax 中国区/全球搜索主机的相关指引
summary: 通过 Coding Plan 搜索 API 使用 MiniMax Search
title: MiniMax Search
x-i18n:
    generated_at: "2026-04-09T00:57:42Z"
    model: gpt-5.4
    provider: openai
    source_hash: b8c3767790f428fc7e239590a97e9dbee0d3bd6550ca3299ae22da0f5a57231a
    source_path: tools\minimax-search.md
    workflow: 15
---

# MiniMax Search

OpenClaw 支持通过 MiniMax
Coding Plan 搜索 API 将 MiniMax 作为 `web_search` 提供商。它会返回结构化搜索结果，包括标题、URL、
摘要和相关查询。

## 获取 Coding Plan 密钥

<Steps>
  <Step title="创建密钥">
    在
    [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key) 创建或复制一个 MiniMax Coding Plan 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway 网关环境中设置 `MINIMAX_CODE_PLAN_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

OpenClaw 也接受 `MINIMAX_CODING_API_KEY` 作为环境变量别名。当 `MINIMAX_API_KEY`
已经指向一个 coding-plan 令牌时，它仍会作为兼容性回退被读取。

## 配置

```json5
{
  plugins: {
    entries: {
      minimax: {
        config: {
          webSearch: {
            apiKey: "sk-cp-...", // optional if MINIMAX_CODE_PLAN_KEY is set
            region: "global", // or "cn"
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "minimax",
      },
    },
  },
}
```

**环境变量替代方案：**在 Gateway 网关环境中设置 `MINIMAX_CODE_PLAN_KEY`。
对于 gateway 安装，请将其放在 `~/.openclaw/.env` 中。

## 区域选择

MiniMax Search 使用以下端点：

- 全球：`https://api.minimax.io/v1/coding_plan/search`
- 中国区：`https://api.minimaxi.com/v1/coding_plan/search`

如果未设置 `plugins.entries.minimax.config.webSearch.region`，OpenClaw 会按以下顺序解析
区域：

1. `tools.web.search.minimax.region` / 插件持有的 `webSearch.region`
2. `MINIMAX_API_HOST`
3. `models.providers.minimax.baseUrl`
4. `models.providers.minimax-portal.baseUrl`

这意味着，中国区新手引导或 `MINIMAX_API_HOST=https://api.minimaxi.com/...`
也会自动让 MiniMax Search 保持使用中国区主机。

即使你是通过 OAuth 的 `minimax-portal` 路径对 MiniMax 进行认证，
网页搜索仍会注册为提供商 id `minimax`；OAuth 提供商 base URL
仅用作中国区/全球主机选择的区域提示。

## 支持的参数

MiniMax Search 支持：

- `query`
- `count`（OpenClaw 会将返回的结果列表裁剪到请求的数量）

目前暂不支持提供商专属筛选条件。

## 相关内容

- [Web ??](/zh-CN/tools/web) -- 所有提供商和自动检测
- [MiniMax](/zh-CN/providers/minimax) -- 模型、图像、语音与认证设置
