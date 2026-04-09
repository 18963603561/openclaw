---
read_when:
    - 你需要一份适合初学者的日志概览
    - 你想配置日志级别或格式
    - 你正在进行故障排除，需要快速找到日志
summary: 日志概览：文件日志、控制台输出、CLI 跟踪，以及控制 UI
title: 日志概览
x-i18n:
    generated_at: "2026-04-08T06:09:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: 3a5e3800b7c5128602d05d5a35df4f88c373cfbe9397cca7e7154fff56a7f7ef
    source_path: logging.md
    workflow: 15
---

# 日志记录

OpenClaw 有两个主要的日志表面：

- **文件日志**（JSON 行），由 Gateway 网关写入。
- **控制台输出**，显示在终端和 Gateway 网关调试 UI 中。

控制 UI 的 **Logs** 选项卡会持续跟踪 gateway 文件日志。此页面说明
日志存放位置、如何读取日志，以及如何配置日志级别和格式。

## 日志存放位置

默认情况下，Gateway 网关会在以下位置写入滚动日志文件：

`/tmp/openclaw/openclaw-YYYY-MM-DD.log`

日期使用 Gateway 网关主机的本地时区。

你可以在 `~/.openclaw/openclaw.json` 中覆盖此设置：

```json
{
  "logging": {
    "file": "/path/to/openclaw.log"
  }
}
```

## 如何读取日志

### CLI：实时跟踪（推荐）

使用 CLI 通过 RPC 持续跟踪 Gateway 网关日志文件：

```bash
openclaw logs --follow
```

当前有用的选项：

- `--local-time`：以你的本地时区显示时间戳
- `--url <url>` / `--token <token>` / `--timeout <ms>`：标准 Gateway 网关 RPC flags
- `--expect-final`：由智能体支持的 RPC 最终响应等待 flag（这里通过共享客户端层接受）

输出模式：

- **TTY 会话**：美观、带颜色、结构化的日志行。
- **非 TTY 会话**：纯文本。
- `--json`：按行分隔的 JSON（每行一个日志事件）。
- `--plain`：在 TTY 会话中强制使用纯文本。
- `--no-color`：禁用 ANSI 颜色。

当你传入显式 `--url` 时，CLI 不会自动应用配置或
环境凭证；如果目标 Gateway 网关
需要认证，请自行包含 `--token`。

在 JSON 模式下，CLI 会输出带 `type` 标签的对象：

- `meta`：流元数据（文件、cursor、大小）
- `log`：已解析的日志条目
- `notice`：截断 / 轮转提示
- `raw`：未解析的原始日志行

如果本地 loopback Gateway 网关要求配对，`openclaw logs` 会自动回退到
已配置的本地日志文件。显式 `--url` 目标不会
使用这种回退。

如果 Gateway 网关不可达，CLI 会输出一条简短提示，建议运行：

```bash
openclaw doctor
```

### 控制 UI（Web）

控制 UI 的 **Logs** 选项卡会使用 `logs.tail` 持续跟踪同一个文件。
有关如何打开它，请参见 [?? UI](/zh-CN/web/control-ui)。

### 仅渠道日志

如果你想过滤渠道活动（WhatsApp/Telegram 等），请使用：

```bash
openclaw channels logs --channel whatsapp
```

## 日志格式

### 文件日志（JSONL）

日志文件中的每一行都是一个 JSON 对象。CLI 和控制 UI 会解析这些
条目，以渲染结构化输出（时间、级别、子系统、消息）。

### 控制台输出

控制台日志**感知 TTY**，并以可读性为目标进行格式化：

- 子系统前缀（例如 `gateway/channels/whatsapp`）
- 级别着色（info/warn/error）
- 可选的紧凑模式或 JSON 模式

控制台格式由 `logging.consoleStyle` 控制。

### Gateway 网关 WebSocket 日志

`openclaw gateway` 还具有用于 RPC 流量的 WebSocket 协议日志：

- 普通模式：只显示有意义的结果（错误、解析错误、慢调用）
- `--verbose`：显示所有请求/响应流量
- `--ws-log auto|compact|full`：选择详细渲染样式
- `--compact`：`--ws-log compact` 的别名

示例：

```bash
openclaw gateway
openclaw gateway --verbose --ws-log compact
openclaw gateway --verbose --ws-log full
```

## 配置日志记录

所有日志记录配置都位于 `~/.openclaw/openclaw.json` 中的 `logging` 下。

```json
{
  "logging": {
    "level": "info",
    "file": "/tmp/openclaw/openclaw-YYYY-MM-DD.log",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools",
    "redactPatterns": ["sk-.*"]
  }
}
```

### 日志级别

- `logging.level`：**文件日志**（JSONL）级别。
- `logging.consoleLevel`：**控制台**详细程度级别。

你可以通过 **`OPENCLAW_LOG_LEVEL`** 环境变量覆盖这两者（例如 `OPENCLAW_LOG_LEVEL=debug`）。环境变量优先于配置文件，因此你可以在不编辑 `openclaw.json` 的情况下，仅为一次运行提高详细程度。你也可以传入全局 CLI 选项 **`--log-level <level>`**（例如 `openclaw --log-level debug gateway run`），它会在该命令中覆盖环境变量。

`--verbose` 只影响控制台输出和 WS 日志详细程度；它不会改变
文件日志级别。

### 控制台样式

`logging.consoleStyle`：

- `pretty`：适合人阅读，带颜色和时间戳。
- `compact`：输出更紧凑（最适合长会话）。
- `json`：每行一个 JSON（适合日志处理器）。

### 脱敏

工具摘要可以在输出到控制台之前对敏感 token 进行脱敏：

- `logging.redactSensitive`：`off` | `tools`（默认：`tools`）
- `logging.redactPatterns`：用于覆盖默认集合的 regex 字符串列表

脱敏只影响**控制台输出**，不会修改文件日志。

## Diagnostics + OpenTelemetry

Diagnostics 是面向模型运行**以及**
消息流遥测（webhooks、排队、会话状态）的结构化、机器可读事件。它们**不会**
替代日志；它们的存在是为了给 metrics、traces 和其他导出器提供数据。

Diagnostics 事件在进程内发出，但只有在启用 diagnostics + 导出器插件时，
导出器才会附加。

### OpenTelemetry 与 OTLP

- **OpenTelemetry（OTel）**：用于 traces、metrics 和 logs 的数据模型 + SDK。
- **OTLP**：用于将 OTel 数据导出到 collector/backend 的线协议。
- OpenClaw 当前通过 **OTLP/HTTP（protobuf）** 进行导出。

### 导出的信号

- **Metrics**：计数器 + 直方图（token 使用量、消息流、排队）。
- **Traces**：用于模型使用 + webhook/消息处理的 spans。
- **Logs**：当启用 `diagnostics.otel.logs` 时，通过 OTLP 导出。日志
  量可能很大；请注意 `logging.level` 和导出器过滤器。

### Diagnostic 事件目录

模型使用：

- `model.usage`：tokens、成本、时长、上下文、provider/model/channel、会话 ids。

消息流：

- `webhook.received`：每个渠道的 webhook 入站。
- `webhook.processed`：webhook 已处理 + 时长。
- `webhook.error`：webhook 处理器错误。
- `message.queued`：消息已进入处理队列。
- `message.processed`：结果 + 时长 + 可选错误。

队列 + 会话：

- `queue.lane.enqueue`：命令队列 lane 入队 + 深度。
- `queue.lane.dequeue`：命令队列 lane 出队 + 等待时间。
- `session.state`：会话状态转换 + 原因。
- `session.stuck`：会话卡住警告 + 持续时长。
- `run.attempt`：运行重试/尝试元数据。
- `diagnostic.heartbeat`：聚合计数器（webhooks/queue/session）。

### 启用 diagnostics（无导出器）

如果你希望 diagnostics 事件可供插件或自定义 sink 使用，请使用此配置：

```json
{
  "diagnostics": {
    "enabled": true
  }
}
```

### Diagnostics flags（定向日志）

使用 flags 可以在不提升 `logging.level` 的情况下打开额外的定向调试日志。
Flags 不区分大小写，并支持通配符（例如 `telegram.*` 或 `*`）。

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

环境变量覆盖（一次性）：

```
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

说明：

- Flag 日志会写入标准日志文件（与 `logging.file` 相同）。
- 输出仍会根据 `logging.redactSensitive` 进行脱敏。
- 完整指南：[/diagnostics/flags](/zh-CN/diagnostics/flags)。

### 导出到 OpenTelemetry

Diagnostics 可以通过 `diagnostics-otel` 插件（OTLP/HTTP）导出。这样
可以与任何接受 OTLP/HTTP 的 OpenTelemetry collector/backend 配合使用。

```json
{
  "plugins": {
    "allow": ["diagnostics-otel"],
    "entries": {
      "diagnostics-otel": {
        "enabled": true
      }
    }
  },
  "diagnostics": {
    "enabled": true,
    "otel": {
      "enabled": true,
      "endpoint": "http://otel-collector:4318",
      "protocol": "http/protobuf",
      "serviceName": "openclaw-gateway",
      "traces": true,
      "metrics": true,
      "logs": true,
      "sampleRate": 0.2,
      "flushIntervalMs": 60000
    }
  }
}
```

说明：

- 你也可以使用 `openclaw plugins enable diagnostics-otel` 启用该插件。
- `protocol` 当前仅支持 `http/protobuf`。`grpc` 会被忽略。
- Metrics 包括 token 使用量、成本、上下文大小、运行时长，以及消息流
  计数器/直方图（webhooks、排队、会话状态、队列深度/等待时间）。
- Traces/metrics 可以通过 `traces` / `metrics` 开关控制（默认：开启）。Traces
  在启用时包括模型使用 spans，以及 webhook/消息处理 spans。
- 当你的 collector 需要认证时，请设置 `headers`。
- 支持的环境变量：`OTEL_EXPORTER_OTLP_ENDPOINT`、
  `OTEL_SERVICE_NAME`、`OTEL_EXPORTER_OTLP_PROTOCOL`。

### 导出的 metrics（名称 + 类型）

模型使用：

- `openclaw.tokens`（counter，属性：`openclaw.token`、`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.cost.usd`（counter，属性：`openclaw.channel`、`openclaw.provider`、
  `openclaw.model`）
- `openclaw.run.duration_ms`（histogram，属性：`openclaw.channel`、
  `openclaw.provider`、`openclaw.model`）
- `openclaw.context.tokens`（histogram，属性：`openclaw.context`、
  `openclaw.channel`、`openclaw.provider`、`openclaw.model`）

消息流：

- `openclaw.webhook.received`（counter，属性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.error`（counter，属性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.webhook.duration_ms`（histogram，属性：`openclaw.channel`、
  `openclaw.webhook`）
- `openclaw.message.queued`（counter，属性：`openclaw.channel`、
  `openclaw.source`）
- `openclaw.message.processed`（counter，属性：`openclaw.channel`、
  `openclaw.outcome`）
- `openclaw.message.duration_ms`（histogram，属性：`openclaw.channel`、
  `openclaw.outcome`）

队列 + 会话：

- `openclaw.queue.lane.enqueue`（counter，属性：`openclaw.lane`）
- `openclaw.queue.lane.dequeue`（counter，属性：`openclaw.lane`）
- `openclaw.queue.depth`（histogram，属性：`openclaw.lane` 或
  `openclaw.channel=heartbeat`）
- `openclaw.queue.wait_ms`（histogram，属性：`openclaw.lane`）
- `openclaw.session.state`（counter，属性：`openclaw.state`、`openclaw.reason`）
- `openclaw.session.stuck`（counter，属性：`openclaw.state`）
- `openclaw.session.stuck_age_ms`（histogram，属性：`openclaw.state`）
- `openclaw.run.attempt`（counter，属性：`openclaw.attempt`）

### 导出的 spans（名称 + 关键属性）

- `openclaw.model.usage`
  - `openclaw.channel`、`openclaw.provider`、`openclaw.model`
  - `openclaw.sessionKey`、`openclaw.sessionId`
  - `openclaw.tokens.*`（input/output/cache_read/cache_write/total）
- `openclaw.webhook.processed`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.chatId`
- `openclaw.webhook.error`
  - `openclaw.channel`、`openclaw.webhook`、`openclaw.chatId`、
    `openclaw.error`
- `openclaw.message.processed`
  - `openclaw.channel`、`openclaw.outcome`、`openclaw.chatId`、
    `openclaw.messageId`、`openclaw.sessionKey`、`openclaw.sessionId`、
    `openclaw.reason`
- `openclaw.session.stuck`
  - `openclaw.state`、`openclaw.ageMs`、`openclaw.queueDepth`、
    `openclaw.sessionKey`、`openclaw.sessionId`

### 采样 + 刷新

- Trace 采样：`diagnostics.otel.sampleRate`（0.0–1.0，仅根 spans）。
- Metric 导出间隔：`diagnostics.otel.flushIntervalMs`（最小 1000ms）。

### 协议说明

- OTLP/HTTP 端点可以通过 `diagnostics.otel.endpoint` 或
  `OTEL_EXPORTER_OTLP_ENDPOINT` 设置。
- 如果端点已经包含 `/v1/traces` 或 `/v1/metrics`，则按原样使用。
- 如果端点已经包含 `/v1/logs`，则会按原样用于 logs。
- `diagnostics.otel.logs` 会为主日志器输出启用 OTLP 日志导出。

### 日志导出行为

- OTLP logs 使用与写入 `logging.file` 相同的结构化记录。
- 遵循 `logging.level`（文件日志级别）。控制台脱敏**不会**应用
  到 OTLP logs。
- 对于高流量安装，建议优先使用 OTLP collector 侧的采样/过滤。

## 故障排除提示

- **Gateway 网关不可达？** 请先运行 `openclaw doctor`。
- **日志为空？** 检查 Gateway 网关是否正在运行，并写入 `logging.file`
  指定的文件路径。
- **需要更多细节？** 将 `logging.level` 设置为 `debug` 或 `trace` 后重试。

## 相关内容

- [Gateway 网关日志](/zh-CN/gateway/logging) —— WS 日志样式、子系统前缀和控制台捕获
- [????](/zh-CN/gateway/configuration-reference#diagnostics) —— OpenTelemetry 导出和缓存 trace 配置
