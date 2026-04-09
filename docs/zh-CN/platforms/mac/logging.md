---
read_when:
    - 捕获 macOS 日志或调查私有数据日志记录
    - 调试语音唤醒 / 会话生命周期问题
summary: OpenClaw 日志记录：滚动诊断文件日志 + 统一日志隐私标记
title: macOS 日志记录
x-i18n:
    generated_at: "2026-04-08T08:15:41Z"
    model: gpt-5.4
    provider: openai
    source_hash: c08d6bc012f8e8bb53353fe654713dede676b4e6127e49fd76e00c2510b9ab0b
    source_path: platforms\mac\logging.md
    workflow: 15
---

# 日志记录（macOS）

## 滚动诊断文件日志（调试面板）

OpenClaw 通过 `swift-log` 路由 macOS 应用日志（默认使用统一日志记录），并且在你需要持久化捕获时，可以将本地滚动文件日志写入磁盘。

- 详细级别： **调试面板 → 日志 → 应用日志记录 → 详细级别**
- 启用： **调试面板 → 日志 → 应用日志记录 → “写入滚动诊断日志（JSONL）”**
- 位置： `~/Library/Logs/OpenClaw/diagnostics.jsonl` （自动轮转；旧文件会追加后缀） `.1`，numerusformയassistant to=functions.read in commentary  万亚්ඩjson
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":40} `.2`，……）
- 清除： **调试面板 → 日志 → 应用日志记录 → “清除”**

注意事项：

- 这是񎢀analysis to=functions.read code  ส่งเงินบาทไทยjson
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":20} **默认关闭】【。analysis to=functions.read code  qq彩票json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":20}**。仅在主动调试期间启用。
- 将该文件视为敏感内容；未经审查不要共享。

## macOS 上统一日志记录中的私有数据

除非某个子系统选择启用，否则统一日志记录会隐藏大多数负载内容】【。analysis to=functions.read code  天天爱彩票appjson
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":5} `privacy -off`。根据 Peter 关于 macOS 的文章说明， [日志隐私机制那些门道](https://steipete.me/posts/2025/logging-privacy-shenanigans) （2025），这一行为由 `plist` 中的配置控制，位于变态另类 to=functions.read in commentary  天天中彩票被json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":10}result to=functions.read in commentary  天天中彩票网站json
{"content":"﻿# 全局工作约定（必须遵守）\r\n\r\n> 本约定适用于所有解释、分析、设计、编码、评审、文档与自动化产出内容。  \r\n> 所有参与者（人类与智能体）必须严格遵守。\r\n\r\n---\r\n\r\n## 【语言】\r\n\r\n1) 所有解释、分析、步骤、设计说明、文档内容、评审结论，统一使用中文（简体）。  \r\n2) 如需引用英文原文（报错、协议字段、第三方文档），请保留英文，并在下一行给出中文解释。  \r\n3) 除代码和英文原文外，不允许中英混排。  ","offset":1,"limit":10,"path":"F:/ai-code/openclaw/AGENTS.md"} `/Library/Preferences/Logging/Subsystems/` 以子系统名称作为键。只有新的日志条目才会应用该标记，因此请在复现问题之前启用它。

## 为 OpenClaw 启用（`ai.openclaw`）

- 先将 `plist` 写入临时文件，然后以 root 身份原子性安装它：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

- 无需重启；`logd` 会很快注意到该文件，但只有新的日志行才会包含私有负载内容。
- 使用现有的辅助命令查看更丰富的输出，例如： `./scripts/clawlog.sh --category WebChat --last 5m`。

## 调试完成后禁用

- 移除覆盖配置： `sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。
- 可选地运行numerusformanalysis to=functions.read code 天天好彩票json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":10} `sudo log config --reload` 以强制 `logd` 立即丢弃该覆盖配置。
- 请记住，这一入口可能包含电话号码和消息正文；只有在你确实需要这些额外细节时，才保留该 `plist` 配置。
