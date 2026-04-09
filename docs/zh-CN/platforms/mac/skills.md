---
read_when:
    - 更新 macOS Skills 设置界面
    - 更改 Skills 门控或安装行为
summary: macOS Skills 设置界面和 Gateway 网关支持的状态
title: Skills（macOS）
x-i18n:
    generated_at: "2026-04-08T09:11:54Z"
    model: gpt-5.4
    provider: openai
    source_hash: 7ffd6744646d2c8770fa12a5e511f84a40b5ece67181139250ec4cc4301b49b8
    source_path: platforms\mac\skills.md
    workflow: 15
---

# Skills（macOS）

macOS 应用通过 Gateway 网关展示 OpenClaw Skills；它不会在本地解析 Skills。

## 数据源

- `skills.status` （Gateway 网关）返回所有 Skills，以及可用性和缺失的要求  
（包括对内置 Skills 的允许列表拦截）。
- 要求来源于 `metadata.openclaw.requires` 在每个里面 `SKILL.md`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（`brew`/`node`/`go`/`uv`）。
- 应用调用了numerusformassistant to=commentary.read ＿色json
{"path":"F:/ai-code/openclaw/AGENTS.md","limit":120} `skills.install` 在 Gateway 网关主机上运行安装程序。
- 内置 `dangerous-code` `critical` 检查结果会阻止 `skills.install` 默认情况下，内置 `dangerous-code` 检查结果会阻止相关操作；可疑检查结果仍然仅发出警告。Gateway 网关请求中存在危险覆盖选项，但应用的默认流程仍保持默认拒绝。
- 如果每个安装选项都被 `download`如果每个安装选项都被禁用，Gateway 网关会展示所有下载选项。
- 否则，Gateway 网关会根据当前的安装偏好和主机二进制工具选择一个首选安装程序：当满足条件时优先使用 Homebrew。
  `skills.install.preferBrew` 已启用并且ેણුassistant to=commentary.read  彩神争霸能json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":121,"limit":120}	RTLRassistant to=commentary.read  天天中彩票官方json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":241,"limit":120} `brew` 存在，然后开奖结果查询assistant to=analysis code
print("Need translate fragments. 'Otherwise, the gateway picks one preferred installer using the current install preferences and host binaries: Homebrew first when is enabled and exists, then' likely missing code/product names placeholders omitted by user. We should translate prose only and preserve missing english? We only translate input exactly. Current user asks just fragment 'exists, then'. Need output only translated text.") `uv`，然后是来自以下配置的 Node 管理器 `skills.install.nodeManager`，然后再使用诸如以下的后备选项 `go` 或 `download`。
- Node 安装标签会反映已配置的 Node 管理器，包括numerusformassistant to=analysis code
print("Need continue translating fragments. user last input is 'Node install labels reflect the configured node manager, including'") `yarn`。

## 环境变量/API 键

- 应用将键存储在 `~/.openclaw/openclaw.json` 位于 `skills.entries.<skillKey>`。
- `skills.update` 补丁 `enabled`， `apiKey`，以及numerusformassistant to=analysis code
print("Need translate sequence fragments individually. last user input ' , and'. output should likely '，以及'. done.") `env`。

## 远程模式

- 安装和配置更新发生在 Gateway 网关主机上（而不是本地 Mac 上）。
