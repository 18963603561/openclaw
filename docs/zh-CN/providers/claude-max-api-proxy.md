---
read_when:
    - 你想将 Claude Max 订阅用于兼容 OpenAI 的工具
    - 你想要一个封装 Claude Code CLI 的本地 API 服务器
    - 你想评估基于订阅与基于 API key 的 Anthropic 访问方式
summary: 将 Claude 订阅凭证暴露为 OpenAI 兼容端点的社区代理
title: Claude Max API Proxy
x-i18n:
    generated_at: "2026-04-08T06:51:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2e125a6a46e48371544adf1331137a1db51e93e905b8c44da482cf2fba180a09
    source_path: providers\claude-max-api-proxy.md
    workflow: 15
---

# Claude Max API Proxy

**claude-max-api-proxy** 是一个社区工具，可将你的 Claude Max / Pro 订阅暴露为一个兼容 OpenAI 的 API 端点。这使你能够在任何支持 OpenAI API 格式的工具中使用你的订阅。

<Warning>
这条路径仅提供技术兼容性。Anthropic 过去曾阻止在 Claude Code 之外使用某些订阅用法。你必须自行决定是否使用它，并在依赖它之前核实 Anthropic 当前的条款。
</Warning>

## 为什么使用这个？

| 方式 | 成本 | 最适用场景 |
| ----------------------- | --------------------------------------------------- | ------------------------------------------ |
| Anthropic API | 按 token 付费（Opus 约为输入 $15 / 百万、输出 $75 / 百万） | 生产应用、高吞吐量 |
| Claude Max 订阅 | 固定每月 $200 | 个人使用、开发、无限使用 |

如果你拥有 Claude Max 订阅，并且想在兼容 OpenAI 的工具中使用它，这个代理在某些工作流中可能有助于降低成本。对于生产用途，API key 仍然是策略上更明确的路径。

## 它如何工作

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)
```

该代理会：

1. 在 `http://localhost:3456/v1/chat/completions` 接受 OpenAI 格式请求
2. 将它们转换为 Claude Code CLI 命令
3. 以 OpenAI 格式返回响应（支持流式传输）

## 安装

```bash
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version
```

## 用法

### 启动服务器

```bash
claude-max-api
# Server runs at http://localhost:3456
```

### 测试它

```bash
# Health check
curl http://localhost:3456/health

# List models
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 与 OpenClaw 配合使用

你可以将 OpenClaw 指向该代理，把它作为自定义的 OpenAI 兼容端点：

```json5
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}
```

这条路径与其他自定义 `/v1` 后端使用相同的代理式 OpenAI 兼容路由：

- 不会应用原生 OpenAI 专属请求整形
- 不支持 `service_tier`、Responses `store`、提示缓存提示，也不支持 OpenAI reasoning 兼容载荷整形
- 不会在该代理 URL 上注入隐藏的 OpenClaw 归因 headers（`originator`、`version`、`User-Agent`）

## 可用模型

| 模型 ID | 映射到 |
| ----------------- | --------------- |
| `claude-opus-4`   | Claude Opus 4   |
| `claude-sonnet-4` | Claude Sonnet 4 |
| `claude-haiku-4`  | Claude Haiku 4  |

## 在 macOS 上自动启动

创建一个 LaunchAgent，使代理自动运行：

```bash
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist
```

## 链接

- **npm：** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)
- **GitHub：** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)
- **问题反馈：** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## 说明

- 这是一个**社区工具**，并非 Anthropic 或 OpenClaw 的官方支持内容
- 需要有效的 Claude Max / Pro 订阅，并且 Claude Code CLI 已完成认证
- 该代理在本地运行，不会将数据发送到任何第三方服务器
- 完全支持流式响应

## 另请参阅

- [Anthropic 提供商](/zh-CN/providers/anthropic) - 使用 Claude CLI 或 API key 的原生 OpenClaw 集成
- [OpenAI 提供商](/zh-CN/providers/openai) - 适用于 OpenAI / Codex 订阅
