---
read_when:
    - 你需要在不提高全局日志级别的情况下获取定向调试日志
    - 你需要为支持场景捕获特定子系统的日志
summary: 用于定向调试日志的诊断标志
title: 诊断标志
x-i18n:
    generated_at: "2026-04-08T04:06:59Z"
    model: gpt-5.4
    provider: openai
    source_hash: daf0eca0e6bd1cbc2c400b2e94e1698709a96b9cdba1a8cf00bd580a61829124
    source_path: diagnostics\flags.md
    workflow: 15
---

# 诊断标志

诊断标志让你无需在所有地方启用详细日志，也能开启定向调试日志。标志采用选择启用方式，只有子系统检查它们时才会生效。

## 工作原理

- 标志是字符串（不区分大小写）。
- 你可以在配置中启用标志，或通过环境变量覆盖。
- 支持通配符：
  - `telegram.*` 可匹配 `telegram.http`
  - `*` 可启用所有标志

## 通过配置启用

```json
{
  "diagnostics": {
    "flags": ["telegram.http"]
  }
}
```

多个标志：

```json
{
  "diagnostics": {
    "flags": ["telegram.http", "gateway.*"]
  }
}
```

更改标志后，请重启 Gateway 网关。

## 环境变量覆盖（一次性）

```bash
OPENCLAW_DIAGNOSTICS=telegram.http,telegram.payload
```

禁用所有标志：

```bash
OPENCLAW_DIAGNOSTICS=0
```

## 日志输出位置

这些标志会将日志输出到标准诊断日志文件。默认情况下：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

如果你设置了 `logging.file`，则改用该路径。日志格式为 JSONL（每行一个 JSON 对象）。仍会根据 `logging.redactSensitive` 执行脱敏。

## 提取日志

选择最新的日志文件：

```bash
ls -t /tmp/openclaw/openclaw-*.log | head -n 1
```

筛选 Telegram HTTP 诊断日志：

```bash
rg "telegram http error" /tmp/openclaw/openclaw-*.log
```

或者在复现问题时持续查看：

```bash
tail -f /tmp/openclaw/openclaw-$(date +%F).log | rg "telegram http error"
```

对于远程 Gateway 网关，你也可以使用 `openclaw logs --follow`（参见 [/cli/logs](/zh-CN/cli/logs)）。

## 说明

- 如果 `logging.level` 设置得高于 `warn`，这些日志可能会被抑制。默认的 `info` 没问题。
- 这些标志可以安全地保持启用；它们只会影响特定子系统的日志量。
- 使用 [??](/zh-CN/logging) 可更改日志目标、级别和脱敏设置。
