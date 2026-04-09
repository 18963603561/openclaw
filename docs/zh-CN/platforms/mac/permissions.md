---
read_when:
    - 调试缺失或卡住的 macOS 权限提示
    - 打包或签名 macOS 应用
    - 更改 bundle ID 或应用安装路径
summary: macOS 权限持久性（TCC）和签名要求
title: macOS 权限
x-i18n:
    generated_at: "2026-04-08T08:48:31Z"
    model: gpt-5.4
    provider: openai
    source_hash: 250065b964c98c307a075ab9e23bf798f9d247f27befe2e5f271ffef1f497def
    source_path: platforms\mac\permissions.md
    workflow: 15
---

# macOS 权限（TCC）

macOS 权限授予很脆弱。TCC 会将权限授予与应用的代码签名、bundle 标识符以及磁盘路径关联起来。如果其中任何一项发生变化，macOS 都会将该应用视为新的应用，并且可能会丢弃或隐藏提示。

## 稳定权限的要求

- 相同路径：从固定位置运行应用（对于 OpenClaw， `dist/OpenClaw.app`）。
- 相同的 bundle 标识符：更改 bundle ID 会创建一个新的权限标识。
- 已签名应用：未签名或临时签名的构建不会持久保存权限。
- 一致的签名：使用真实的 Apple Development 或 Developer ID 证书，以便签名在多次重新构建之间保持稳定。

临时签名会在每次构建时生成新的标识。macOS 会忘记之前授予的权限，而且在清除陈旧条目之前，提示甚至可能会完全消失。

## 提示消失时的恢复检查清单

1. 退出应用。
2. 在“系统设置”->“隐私与安全性”中删除该应用条目。
3. 从相同路径重新启动应用，并重新授予权限。
4. 如果提示仍然没有出现，使用以下方式重置 TCC 条目】【：user to=functions.read వ్యాఖ్యary  天天中彩票不json  天天中彩票上{"path":"F:/ai-code/openclaw/.agents/skills/security-triage/SKILL.md","limit":20} `tccutil` 然后再试一次。
5. 某些权限只有在 macOS 完全重启后才会重新出现。

重置示例（根据需要替换 bundle ID）：

```bash
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents
```

## 文件与文件夹权限（桌面/文稿/下载）

macOS 还可能对终端/后台进程访问“桌面”、“文稿”和“下载”进行限制。如果文件读取或目录列出卡住，请为执行文件操作的同一进程上下文授予访问权限（例如 Terminal/iTerm、由 LaunchAgent 启动的应用，或 SSH 进程）。

变通方法：将文件移动到 OpenClaw 工作区（`~/.openclaw/workspace`）如果你想避免按文件夹逐个授予权限。

如果你正在测试权限，始终使用真实证书进行签名。临时签名构建只适用于权限无关紧要的快速本地运行。
