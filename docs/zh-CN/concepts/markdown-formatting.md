---
read_when:
    - 你正在修改出站渠道的 Markdown 格式化或分块逻辑
    - 你正在添加新的渠道格式化器或样式映射
    - 你正在调试跨渠道的格式化回归问题
summary: 用于出站渠道的 Markdown 格式化流水线
title: Markdown 格式化
x-i18n:
    generated_at: "2026-04-08T04:00:46Z"
    model: gpt-5.4
    provider: openai
    source_hash: f3794674e30e265208d14a986ba9bdc4ba52e0cb69c446094f95ca6c674e4566
    source_path: concepts\markdown-formatting.md
    workflow: 15
---

# Markdown 格式化

OpenClaw 会先将出站 Markdown 转换为共享的中间表示（IR），再渲染为特定渠道的输出格式。IR 会在保留源文本不变的同时携带样式／链接跨度信息，以便分块和渲染在不同渠道之间保持一致。

## 目标

- **一致性：**一次解析，多个渲染器。
- **安全分块：**先拆分文本，再进行渲染，这样行内格式就不会在分块之间被破坏。
- **渠道适配：**将同一份 IR 映射到 Slack mrkdwn、Telegram HTML 和 Signal 样式范围，而无需重新解析 Markdown。

## 流水线

1. **解析 Markdown -> IR**
   - IR 是纯文本，加上样式跨度（bold/italic/strike/code/spoiler）和链接跨度。
   - 偏移量使用 UTF-16 代码单元，这样 Signal 的样式范围就能与其 API 对齐。
   - 只有当某个渠道选择启用表格转换时，才会解析表格。
2. **IR 分块（格式优先）**
   - 分块发生在 IR 文本层，在渲染之前进行。
   - 行内格式不会跨分块拆开；跨度会按分块逐段切分。
3. **按渠道渲染**
   - **Slack：**mrkdwn 标记（bold/italic/strike/code），链接写为 `<url|label>`。
   - **Telegram：**HTML 标签（`<b>`、`<i>`、`<s>`、`<code>`、`<pre><code>`、`<a href>`）。
   - **Signal：**纯文本 + `text-style` 范围；当标签与 URL 不同时，链接会变成 `label (url)`。

## IR 示例

输入 Markdown：

```markdown
Hello **world** — see [docs](https://docs.openclaw.ai).
```

IR（示意）：

```json
{
  "text": "Hello world — see docs.",
  "styles": [{ "start": 6, "end": 11, "style": "bold" }],
  "links": [{ "start": 19, "end": 23, "href": "https://docs.openclaw.ai" }]
}
```

## 使用位置

- Slack、Telegram 和 Signal 的出站适配器都基于 IR 进行渲染。
- 其他渠道（WhatsApp、iMessage、Microsoft Teams、Discord）仍然使用纯文本或它们各自的格式化规则；启用时，Markdown 表格转换会在分块前先被应用。

## 表格处理

Markdown 表格在不同聊天客户端中的支持并不一致。使用
`markdown.tables` 按渠道（以及按账户）控制转换行为。

- `code`：将表格渲染为代码块（大多数渠道的默认值）。
- `bullets`：将每一行转换为项目符号列表（Signal + WhatsApp 的默认值）。
- `off`：禁用表格解析和转换；原始表格文本会直接透传。

配置键：

```yaml
channels:
  discord:
    markdown:
      tables: code
    accounts:
      work:
        markdown:
          tables: off
```

## 分块规则

- 分块限制来自渠道适配器／配置，并应用在 IR 文本上。
- 代码围栏会作为单个代码块保留，并带有结尾换行，这样各渠道才能正确渲染。
- 列表前缀和引用块前缀都是 IR 文本的一部分，因此分块不会从前缀中间切开。
- 行内样式（bold/italic/strike/inline-code/spoiler）绝不会跨分块拆分；渲染器会在每个分块内部重新打开这些样式。

如果你想进一步了解跨渠道的分块行为，请参见
[流式传输 + 分块](/zh-CN/concepts/streaming)。

## 链接策略

- **Slack：**`[label](url)` -> `<url|label>`；裸 URL 保持原样。解析期间会禁用自动链接，以避免重复添加链接。
- **Telegram：**`[label](url)` -> `<a href="url">label</a>`（HTML 解析模式）。
- **Signal：**`[label](url)` -> `label (url)`，除非标签与 URL 相同。

## 剧透

剧透标记（`||spoiler||`）仅会为 Signal 进行解析，在那里它们会映射为 SPOILER 样式范围。其他渠道会将其视为纯文本。

## 如何添加或更新渠道格式化器

1. **解析一次：**使用共享的 `markdownToIR(...)` 帮助函数，并传入适合该渠道的选项（autolink、heading style、blockquote prefix）。
2. **渲染：**实现一个渲染器，使用 `renderMarkdownWithMarkers(...)` 和样式标记映射（或 Signal 样式范围）。
3. **分块：**在渲染前调用 `chunkMarkdownIR(...)`；然后分别渲染每个分块。
4. **接入适配器：**更新渠道出站适配器，使其使用新的分块器和渲染器。
5. **测试：**如果该渠道使用分块，则新增或更新格式测试，以及一项出站投递测试。

## 常见陷阱

- 必须保留 Slack 的尖括号标记（`<@U123>`、`<#C123>`、`<https://...>`）；同时要安全地转义原始 HTML。
- Telegram HTML 要求对标签外的文本进行转义，以避免标记损坏。
- Signal 的样式范围依赖 UTF-16 偏移量；不要使用码点偏移量。
- 对于围栏代码块，要保留结尾换行，这样闭合标记才能落在单独一行上。
