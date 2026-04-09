---
read_when:
    - 集成使用 OpenResponses API 的客户端
    - 你希望使用基于 item 的输入、客户端工具调用或 SSE 事件
summary: 从 Gateway 网关暴露兼容 OpenResponses 的 `/v1/responses` HTTP 端点
title: OpenResponses API
x-i18n:
    generated_at: "2026-04-08T04:30:29Z"
    model: gpt-5.4
    provider: openai
    source_hash: b3f2905fe45accf2699de8a561d15311720f249f9229d26550c16577428ea8a9
    source_path: gateway\openresponses-http-api.md
    workflow: 15
---

# OpenResponses API（HTTP）

OpenClaw 的 Gateway 网关可以提供兼容 OpenResponses 的 `POST /v1/responses` 端点。

此端点**默认禁用**。请先在配置中启用它。

- `POST /v1/responses`
- 与 Gateway 网关相同端口（WS + HTTP 复用）：`http://<gateway-host>:<port>/v1/responses`

在底层，请求会作为普通的 Gateway 网关智能体运行来执行（与
`openclaw agent` 使用相同代码路径），因此路由 / 权限 / 配置都与你的 Gateway 网关保持一致。

## 认证、安全与路由

运行行为与 [OpenAI Chat Completions](/zh-CN/gateway/openai-http-api) 一致：

- 使用匹配的 Gateway 网关 HTTP 认证路径：
  - 共享密钥认证（`gateway.auth.mode="token"` 或 `"password"`）：`Authorization: Bearer <token-or-password>`
  - trusted-proxy 认证（`gateway.auth.mode="trusted-proxy"`）：来自已配置非 loopback trusted proxy 源的带身份信息代理头
  - 私有入口开放认证（`gateway.auth.mode="none"`）：无需认证头
- 将该端点视为此 Gateway 网关实例的完整操作员访问入口
- 对于共享密钥认证模式（`token` 和 `password`），忽略更窄的 bearer 声明 `x-openclaw-scopes` 值，并恢复正常的完整操作员默认值
- 对于受信任的带身份信息 HTTP 模式（例如 trusted proxy 认证或私有入口上的 `gateway.auth.mode="none"`），如果存在 `x-openclaw-scopes` 则遵循它，否则回退到正常的操作员默认 scope 集合
- 使用 `model: "openclaw"`、`model: "openclaw/default"`、`model: "openclaw/<agentId>"` 或 `x-openclaw-agent-id` 选择智能体
- 当你希望覆盖所选智能体的后端模型时，请使用 `x-openclaw-model`
- 使用 `x-openclaw-session-key` 进行显式会话路由
- 当你希望使用非默认的合成入口渠道上下文时，请使用 `x-openclaw-message-channel`

认证矩阵：

- `gateway.auth.mode="token"` 或 `"password"` + `Authorization: Bearer ...`
  - 证明持有共享 Gateway 网关操作员秘密
  - 忽略更窄的 `x-openclaw-scopes`
  - 恢复完整的默认操作员 scope 集合：
    `operator.admin`、`operator.approvals`、`operator.pairing`、
    `operator.read`、`operator.talk.secrets`、`operator.write`
  - 将此端点上的聊天轮次视为 owner-sender 轮次
- 受信任的带身份信息 HTTP 模式（例如 trusted proxy 认证，或私有入口上的 `gateway.auth.mode="none"`）
  - 当请求头存在时遵循 `x-openclaw-scopes`
  - 当请求头缺失时回退到正常的操作员默认 scope 集合
  - 只有当调用者显式收窄 scope 且省略 `operator.admin` 时，才会失去 owner 语义

通过 `gateway.http.endpoints.responses.enabled` 启用或禁用此端点。

相同的兼容接口面还包括：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

关于智能体目标模型、`openclaw/default`、embeddings 透传以及后端模型覆盖如何协同工作的权威说明，请参阅 [OpenAI Chat Completions](/zh-CN/gateway/openai-http-api#agent-first-model-contract) 和 [模型列表与智能体路由](/zh-CN/gateway/openai-http-api#model-list-and-agent-routing)。

## 会话行为

默认情况下，此端点对每个请求都是**无状态的**（每次调用都会生成新的会话键）。

如果请求包含 OpenResponses 的 `user` 字符串，Gateway 网关会从中派生稳定的会话键，
这样重复调用就可以共享同一个智能体会话。

## 请求形态（支持情况）

请求遵循带基于 item 输入的 OpenResponses API。当前支持：

- `input`：字符串或 item 对象数组。
- `instructions`：并入 system prompt。
- `tools`：客户端工具定义（function tools）。
- `tool_choice`：筛选或强制要求客户端工具。
- `stream`：启用 SSE 流式传输。
- `max_output_tokens`：尽力而为的输出限制（取决于提供商）。
- `user`：稳定会话路由。

已接受但**当前忽略**：

- `max_tool_calls`
- `reasoning`
- `metadata`
- `store`
- `truncation`

支持：

- `previous_response_id`：当请求保持在同一智能体 / 用户 / 请求会话作用域内时，OpenClaw 会复用之前响应的会话。

## Items（输入）

### `message`

角色：`system`、`developer`、`user`、`assistant`。

- `system` 和 `developer` 会附加到 system prompt。
- 最近的 `user` 或 `function_call_output` item 会成为“当前消息”。
- 更早的 user / assistant 消息会作为历史加入上下文。

### `function_call_output`（按轮次工具）

将工具结果发回给模型：

```json
{
  "type": "function_call_output",
  "call_id": "call_123",
  "output": "{\"temperature\": \"72F\"}"
}
```

### `reasoning` 和 `item_reference`

出于 schema 兼容性会被接受，但在构建 prompt 时会被忽略。

## 工具（客户端 function tools）

通过 `tools: [{ type: "function", function: { name, description?, parameters? } }]` 提供工具。

如果智能体决定调用工具，响应会返回一个 `function_call` 输出 item。
然后你发送带有 `function_call_output` 的后续请求，以继续这一轮。

## 图片（`input_image`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_image",
  "source": { "type": "url", "url": "https://example.com/image.png" }
}
```

允许的 MIME 类型（当前）：`image/jpeg`、`image/png`、`image/gif`、`image/webp`、`image/heic`、`image/heif`。
最大大小（当前）：10 MB。

## 文件（`input_file`）

支持 base64 或 URL 来源：

```json
{
  "type": "input_file",
  "source": {
    "type": "base64",
    "media_type": "text/plain",
    "data": "SGVsbG8gV29ybGQh",
    "filename": "hello.txt"
  }
}
```

允许的 MIME 类型（当前）：`text/plain`、`text/markdown`、`text/html`、`text/csv`、
`application/json`、`application/pdf`。

最大大小（当前）：5 MB。

当前行为：

- 文件内容会被解码并添加到 **system prompt**，而不是 user 消息中，
  因此它保持为临时内容（不会持久化到会话历史中）。
- 解码后的文件文本在加入前会被包装为**不受信任的外部内容**，
  因此文件字节会被视为数据，而不是受信任指令。
- 注入块会使用显式边界标记，例如
  `<<<EXTERNAL_UNTRUSTED_CONTENT id="...">>>` /
  `<<<END_EXTERNAL_UNTRUSTED_CONTENT id="...">>>`，并包含一行
  `Source: External` 元数据。
- 这个文件输入路径有意省略较长的 `SECURITY NOTICE:` 横幅，以保留 prompt 预算；
  但边界标记和元数据仍会保留。
- PDF 会先解析文本。如果找到的文本很少，则会将前几页栅格化为图片并传给模型，而注入的文件块会使用占位符
  `[PDF content rendered to images]`。

PDF 解析使用对 Node 友好的 `pdfjs-dist` legacy 构建（无 worker）。现代
PDF.js 构建依赖浏览器 worker / DOM 全局对象，因此 Gateway 网关中不使用它。

URL 获取默认值：

- `files.allowUrl`：`true`
- `images.allowUrl`：`true`
- `maxUrlParts`：`8`（每个请求中基于 URL 的 `input_file` + `input_image` 部分总数）
- 请求会受到保护（DNS 解析、私有 IP 屏蔽、重定向上限、超时）。
- 每种输入类型都支持可选的主机名 allowlist（`files.urlAllowlist`、`images.urlAllowlist`）。
  - 精确主机：`"cdn.example.com"`
  - 通配子域名：`"*.assets.example.com"`（不匹配 apex）
  - 空 allowlist 或省略 allowlist 表示不限制主机名 allowlist。
- 要完全禁用基于 URL 的获取，请设置 `files.allowUrl: false` 和 / 或 `images.allowUrl: false`。

## 文件 + 图片限制（配置）

默认值可在 `gateway.http.endpoints.responses` 下调整：

```json5
{
  gateway: {
    http: {
      endpoints: {
        responses: {
          enabled: true,
          maxBodyBytes: 20000000,
          maxUrlParts: 8,
          files: {
            allowUrl: true,
            urlAllowlist: ["cdn.example.com", "*.assets.example.com"],
            allowedMimes: [
              "text/plain",
              "text/markdown",
              "text/html",
              "text/csv",
              "application/json",
              "application/pdf",
            ],
            maxBytes: 5242880,
            maxChars: 200000,
            maxRedirects: 3,
            timeoutMs: 10000,
            pdf: {
              maxPages: 4,
              maxPixels: 4000000,
              minTextChars: 200,
            },
          },
          images: {
            allowUrl: true,
            urlAllowlist: ["images.example.com"],
            allowedMimes: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
            maxBytes: 10485760,
            maxRedirects: 3,
            timeoutMs: 10000,
          },
        },
      },
    },
  },
}
```

省略时的默认值：

- `maxBodyBytes`：20 MB
- `maxUrlParts`：8
- `files.maxBytes`：5 MB
- `files.maxChars`：200k
- `files.maxRedirects`：3
- `files.timeoutMs`：10s
- `files.pdf.maxPages`：4
- `files.pdf.maxPixels`：4,000,000
- `files.pdf.minTextChars`：200
- `images.maxBytes`：10 MB
- `images.maxRedirects`：3
- `images.timeoutMs`：10s
- HEIC / HEIF `input_image` 来源会被接受，并在交付给提供商前规范化为 JPEG。

安全说明：

- URL allowlist 会在获取前以及每次重定向跳转时强制执行。
- 将某个主机名加入 allowlist 并不会绕过私有 / 内部 IP 屏蔽。
- 对于暴露在互联网上的 Gateway 网关，请在应用层保护之外额外施加网络出口控制。
  参见 [??](/zh-CN/gateway/security)。

## 流式传输（SSE）

设置 `stream: true` 以接收服务器发送事件（SSE）：

- `Content-Type: text/event-stream`
- 每行事件格式为 `event: <type>` 和 `data: <json>`
- 流会以 `data: [DONE]` 结束

当前发出的事件类型：

- `response.created`
- `response.in_progress`
- `response.output_item.added`
- `response.content_part.added`
- `response.output_text.delta`
- `response.output_text.done`
- `response.content_part.done`
- `response.output_item.done`
- `response.completed`
- `response.failed`（出错时）

## Usage

当底层提供商报告 token 计数时，`usage` 会被填充。
在这些计数进入下游状态 / 会话输出面之前，OpenClaw 会对常见的 OpenAI 风格别名进行规范化，
包括 `input_tokens` / `output_tokens`
以及 `prompt_tokens` / `completion_tokens`。

## 错误

错误使用如下 JSON 对象：

```json
{ "error": { "message": "...", "type": "invalid_request_error" } }
```

常见情况：

- `401` 认证缺失 / 无效
- `400` 请求体无效
- `405` 方法错误

## 示例

非流式：

```bash
curl -sS http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "input": "hi"
  }'
```

流式：

```bash
curl -N http://127.0.0.1:18789/v1/responses \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'x-openclaw-agent-id: main' \
  -d '{
    "model": "openclaw",
    "stream": true,
    "input": "hi"
  }'
```
