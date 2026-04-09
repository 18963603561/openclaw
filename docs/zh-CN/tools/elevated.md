---
read_when:
    - 调整提权模式默认值、允许列表或斜杠命令行为
    - 了解处于沙箱隔离中的智能体如何访问主机
summary: 提权执行模式：让处于沙箱隔离中的智能体在沙箱外运行命令
title: 提权模式
x-i18n:
    generated_at: "2026-04-09T00:54:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: f6f0ca0a7c03c94554a70fee775aa92085f15015850c3abaa2c1c46ced9d3c2e
    source_path: tools\elevated.md
    workflow: 15
---

# 提权模式

当智能体在沙箱中运行时，它的 `exec` 命令会被限制在沙箱环境内。
**提权模式** 允许智能体突破该限制，改为在沙箱外运行命令，
并可配置审批关卡。

<Info>
  提权模式只会在智能体处于**沙箱隔离**中时改变行为。
  对于未进行沙箱隔离的智能体，`exec` 本来就会在主机上运行。
</Info>

## 指令

你可以使用斜杠命令按会话控制提权模式：

| 指令 | 作用 |
| ---------------- | ---------------------------------------------------------------------- |
| `/elevated on` | 在沙箱外、已配置的主机路径上运行，并保留审批 |
| `/elevated ask` | 与 `on` 相同（别名） |
| `/elevated full` | 在沙箱外、已配置的主机路径上运行，并跳过审批 |
| `/elevated off` | 返回仅限沙箱内的执行 |

也可以使用 `/elev on|off|ask|full`。

发送不带参数的 `/elevated` 可查看当前级别。

## 工作原理

<Steps>
  <Step title="检查可用性">
    必须先在配置中启用提权，并且发送者必须位于允许列表中：

    ```json5
    {
      tools: {
        elevated: {
          enabled: true,
          allowFrom: {
            discord: ["user-id-123"],
            whatsapp: ["+15555550123"],
          },
        },
      },
    }
    ```

  </Step>

  <Step title="设置级别">
    发送仅包含指令的消息，以设置会话默认值：

    ```
    /elevated full
    ```

    或以内联方式使用（仅作用于该条消息）：

    ```
    /elevated on run the deployment script
    ```

  </Step>

  <Step title="命令将在沙箱外运行">
    当提权处于激活状态时，`exec` 调用会离开沙箱。
    实际使用的主机默认为 `gateway`，或者当已配置/会话中的 exec 目标为 `node` 时使用 `node`。
    在 `full` 模式下，会跳过 exec 审批。
    在 `on`/`ask` 模式下，已配置的审批规则仍然适用。
  </Step>
</Steps>

## 解析顺序

1. 消息中的**内联指令**（仅作用于该条消息）
2. **会话覆盖**（通过发送仅包含指令的消息来设置）
3. **全局默认值**（配置中的 `agents.defaults.elevatedDefault`）

## 可用性与允许列表

- **全局开关**：`tools.elevated.enabled`（必须为 `true`）
- **发送者允许列表**：`tools.elevated.allowFrom`，按渠道分别配置列表
- **按智能体控制的开关**：`agents.list[].tools.elevated.enabled`（只能进一步收紧）
- **按智能体控制的允许列表**：`agents.list[].tools.elevated.allowFrom`（发送者必须同时匹配全局 + 智能体级别）
- **Discord 回退**：如果省略 `tools.elevated.allowFrom.discord`，则回退使用 `channels.discord.allowFrom`
- **所有关卡都必须通过**；否则提权会被视为不可用

允许列表条目格式：

| 前缀 | 匹配对象 |
| ----------------------- | ------------------------------- |
| （无） | 发送者 ID、E.164 或 From 字段 |
| `name:` | 发送者显示名称 |
| `username:` | 发送者用户名 |
| `tag:` | 发送者标签 |
| `id:`、`from:`、`e164:` | 显式身份定向 |

## 提权不能控制的内容

- **工具策略**：如果 `exec` 被工具策略拒绝，提权也无法覆盖
- **主机选择策略**：提权不会把 `auto` 变成可自由跨主机覆盖的模式。它会使用已配置/会话中的 exec 目标规则，只有当目标本来就是 `node` 时才会选择 `node`。
- **与 `/exec` 分离**：`/exec` 指令用于为已授权发送者调整按会话生效的 exec 默认值，并不要求启用提权模式

## 相关内容

- [Exec ??](/zh-CN/tools/exec) — Shell 命令执行
- [Exec ??](/zh-CN/tools/exec-approvals) — 审批与允许列表系统
- [沙箱隔离](/zh-CN/gateway/sandboxing) — 沙箱配置
- [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated)
