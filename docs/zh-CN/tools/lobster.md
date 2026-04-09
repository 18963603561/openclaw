---
read_when:
    - 你想要带显式审批的确定性多步骤工作流
    - 你需要在不重新运行前面步骤的情况下恢复工作流
summary: 适用于 OpenClaw 的类型化工作流运行时，带可恢复的审批门禁。
title: Lobster
x-i18n:
    generated_at: "2026-04-09T00:58:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: c1014945d104ef8fdca0d30be89e35136def1b274c6403b06de29e8502b8124b
    source_path: tools\lobster.md
    workflow: 15
---

# Lobster

Lobster 是一个工作流 shell，让 OpenClaw 能够将多步骤工具序列作为一次单一、确定性的操作来运行，并带有显式审批检查点。

Lobster 比 detached 后台工作高一层，属于一种编排层。对于单个任务之上的流程编排，请参见 [Task Flow](/zh-CN/automation/taskflow)（`openclaw tasks flow`）。对于任务活动账本，请参见 [`openclaw tasks`](/zh-CN/automation/tasks)。

## 核心亮点

你的助手可以构建管理它自身的工具。你提出一个工作流需求，30 分钟后你就能得到一个 CLI 加上若干流水线，并且可以通过一次调用运行。Lobster 正是缺失的那一块：确定性流水线、显式审批和可恢复状态。

## 为什么要用它

如今，复杂工作流需要大量来回的工具调用。每次调用都会消耗 token，而且 LLM 必须编排每一个步骤。Lobster 将这部分编排移入一个类型化运行时：

- **一次调用替代多次调用**：OpenClaw 只需进行一次 Lobster 工具调用，即可获得结构化结果。
- **内置审批**：副作用操作（发送邮件、发布评论）会暂停工作流，直到被显式批准。
- **可恢复**：暂停的工作流会返回一个 token；你可以在批准后恢复，而无需重跑全部步骤。

## 为什么用 DSL，而不是普通程序？

Lobster 被刻意设计得很小。目标不是“发明一种新语言”，而是提供一种可预测、对 AI 友好的流水线规范，并原生支持审批和恢复 token。

- **内置 approve/resume**：普通程序可以提示人类操作，但如果没有你自己发明那套运行时，它就无法通过持久 token 实现_暂停并恢复_。
- **确定性 + 可审计性**：流水线是数据，因此易于记录、diff、回放和审查。
- **为 AI 限制的表面**：微小语法 + JSON 管道可减少“创造性”代码路径，使校验更现实。
- **内建安全策略**：超时、输出上限、沙箱检查和 allowlist 都由运行时强制执行，而不是由每个脚本各自处理。
- **仍然可编程**：每一步都可以调用任意 CLI 或脚本。如果你想用 JS/TS，可以从代码生成 `.lobster` 文件。

## 工作原理

OpenClaw **在进程内**运行 Lobster 工作流，使用嵌入式运行器。不会启动外部 CLI 子进程；工作流引擎直接在 gateway 进程内执行，并直接返回 JSON envelope。
如果流水线因审批而暂停，工具会返回一个 `resumeToken`，这样你就可以稍后继续。

## 模式：小型 CLI + JSON 管道 + 审批

构建一些输出 JSON 的小命令，然后把它们串成一次 Lobster 调用。（下面的命令名仅为示例——替换成你自己的。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

如果流水线请求审批，使用该 token 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。审批门禁让副作用保持显式且可审计。

示例：将输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤（llm-task）

对于需要**结构化 LLM 步骤**的工作流，可以启用可选的
`llm-task` 插件工具，并从 Lobster 中调用它。这样可以在保持工作流
确定性的同时，仍然让你使用模型进行分类/总结/起草。

启用该工具：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

在流水线中使用它：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

详情和配置选项请参见 [LLM Task](/zh-CN/tools/llm-task)。

## 工作流文件（`.lobster`）

Lobster 可以运行带有 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在 OpenClaw 工具调用中，将 `pipeline` 设置为该文件路径。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

说明：

- `stdin: $step.stdout` 和 `stdin: $step.json` 会传递前一步的输出。
- `condition`（或 `when`）可基于 `$step.approved` 决定是否执行步骤。

## 安装 Lobster

内置的 Lobster 工作流在进程内运行；不需要单独的 `lobster` 二进制。嵌入式运行器随 Lobster 插件一起提供。

如果你在开发或外部流水线中需要独立的 Lobster CLI，请从 [Lobster repo](https://github.com/openclaw/lobster) 安装，并确保 `lobster` 在 `PATH` 中。

## 启用该工具

Lobster 是一个**可选**插件工具（默认不启用）。

推荐方式（增量式，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或者按智能体配置：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

除非你确实打算在严格 allowlist 模式下运行，否则应避免使用 `tools.allow: ["lobster"]`。

注意：对于可选插件，allowlist 是选择加入的。如果你的 allowlist 只列出
插件工具（例如 `lobster`），OpenClaw 仍会保持核心工具启用。若要限制核心
工具，也请将你想保留的核心工具或分组一并放入 allowlist。

## 示例：邮件分拣

不使用 Lobster：

```
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

使用 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回一个 JSON envelope（已截断）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

一个工作流。确定。安全。

## 工具参数

### `run`

以工具模式运行一个流水线。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

带参数运行一个工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

在审批后继续一个已暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`：流水线的相对工作目录（必须保持在 gateway 工作目录内）。
- `timeoutMs`：如果工作流超出此时长则中止（默认：20000）。
- `maxStdoutBytes`：如果输出超过此大小则中止（默认：512000）。
- `argsJson`：传递给 `lobster run --args-json` 的 JSON 字符串（仅工作流文件）。

## 输出 envelope

Lobster 返回一个 JSON envelope，状态有三种：

- `ok` → 成功完成
- `needs_approval` → 已暂停；恢复时需要 `requiresApproval.resumeToken`
- `cancelled` → 已被显式拒绝或取消

该工具会同时在 `content`（格式化 JSON）和 `details`（原始对象）中提供该 envelope。

## 审批

如果存在 `requiresApproval`，请检查提示并作出决定：

- `approve: true` → 恢复并继续执行副作用
- `approve: false` → 取消并结束该工作流

使用 `approve --preview-from-stdin --limit N` 可以在不借助自定义 `jq`/heredoc 粘合代码的情况下，将 JSON 预览附加到审批请求中。现在的恢复 token 更紧凑：Lobster 会将工作流恢复状态存储在它的状态目录下，并返回一个小型 token 键。

## OpenProse

OpenProse 与 Lobster 很适合搭配使用：先用 `/prose` 编排多智能体准备工作，再运行一个 Lobster 流水线来实现确定性审批。如果某个 Prose 程序需要 Lobster，请通过 `tools.subagents.tools` 为子智能体允许 `lobster` 工具。参见 [OpenProse](/zh-CN/prose)。

## 安全性

- **仅本地进程内** —— 工作流在 gateway 进程内部执行；插件自身不会发起网络调用。
- **不管理密钥** —— Lobster 不处理 OAuth；它调用的是处理这些事情的 OpenClaw 工具。
- **具备沙箱感知** —— 当工具上下文处于沙箱隔离中时会被禁用。
- **已加固** —— 超时和输出上限由嵌入式运行器强制执行。

## 故障排除

- **`lobster timed out`** → 增加 `timeoutMs`，或拆分长流水线。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes`，或减少输出大小。
- **`lobster returned invalid JSON`** → 确保流水线以工具模式运行，并且只输出 JSON。
- **`lobster failed`** → 检查 gateway 日志，查看嵌入式运行器错误详情。

## 了解更多

- [Plugins](/zh-CN/tools/plugin)
- [插件工具编写](/zh-CN/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例是“second brain”CLI + Lobster 流水线，用于管理三个 Markdown 仓库（个人、伴侣、共享）。该 CLI 以 JSON 输出统计信息、收件箱列表和陈旧扫描；Lobster 将这些命令串成工作流，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每个都带有审批门禁。在可用时，AI 负责判断（分类）；在不可用时，则回退到确定性规则。

- 讨论串：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关内容

- [自动化与任务](/zh-CN/automation) —— 调度 Lobster 工作流
- [自动化概览](/zh-CN/automation) —— 所有自动化机制
- [工具概览](/zh-CN/tools) —— 所有可用的智能体工具
