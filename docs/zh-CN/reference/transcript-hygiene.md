---
read_when:
    - 你正在调试与 transcript 形状相关的 provider 请求拒绝问题
    - 你正在更改 transcript 清理或工具调用修复逻辑
    - 你正在调查跨 provider 的工具调用 id 不匹配问题
summary: 参考：provider 专用的 transcript 清理与修复规则
title: Transcript 清洁
x-i18n:
    generated_at: "2026-04-08T07:08:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: 217afafb693cf89651e8fa361252f7b5c197feb98d20be4697a83e6dedc0ec3f
    source_path: reference\transcript-hygiene.md
    workflow: 15
---

# Transcript 清洁（Provider 修正）

本文档描述了在一次运行前（构建模型上下文时）对 transcript 应用的**provider 专用修正**。这些是用于满足严格 provider 要求的**内存中**调整。这些清洁步骤**不会**重写磁盘上已存储的 JSONL transcript；不过，独立的 session 文件修复流程可能会在加载 session 前通过丢弃无效行来重写格式错误的 JSONL 文件。当发生修复时，原始文件会在 session 文件旁边保留备份。

范围包括：

- 工具调用 id 清理
- 工具调用输入校验
- 工具结果配对修复
- 轮次校验 / 排序
- thought signature 清理
- 图像载荷清理
- 用户输入来源标记（用于跨会话路由 prompt）

如果你需要了解 transcript 存储细节，请参见：

- [/reference/session-management-compaction](/zh-CN/reference/session-management-compaction)

---

## 运行位置

所有 transcript 清洁逻辑都集中在内置 runner 中：

- 策略选择：`src/agents/transcript-policy.ts`
- 清理/修复应用：`src/agents/pi-embedded-runner/google.ts` 中的 `sanitizeSessionHistory`

该策略使用 `provider`、`modelApi` 和 `modelId` 来决定要应用哪些内容。

与 transcript 清洁分开的是，session 文件会在加载前按需修复：

- `src/agents/session-file-repair.ts` 中的 `repairSessionFileIfNeeded`
- 由 `run/attempt.ts` 和 `compact.ts`（内置 runner）调用

---

## 全局规则：图像清理

图像载荷始终会被清理，以防止 provider 因大小限制而拒绝请求
（对超大的 base64 图像进行缩放/重压缩）。

这也有助于控制支持视觉的模型所承受的图像 token 压力。
较低的最大边长通常会减少 token 使用量；较高的尺寸则会保留更多细节。

实现位置：

- `src/agents/pi-embedded-helpers/images.ts` 中的 `sanitizeSessionMessagesImages`
- `src/agents/tool-images.ts` 中的 `sanitizeContentBlocksImages`
- 最大图像边长可通过 `agents.defaults.imageMaxDimensionPx` 配置（默认：`1200`）。

---

## 全局规则：格式错误的工具调用

缺少 `input` 和 `arguments` 的助手工具调用块会在构建模型上下文前被丢弃。
这可以防止 provider 因部分持久化的工具调用而拒绝请求（例如在速率限制失败之后）。

实现位置：

- `src/agents/session-transcript-repair.ts` 中的 `sanitizeToolCallInputs`
- 在 `src/agents/pi-embedded-runner/google.ts` 的 `sanitizeSessionHistory` 中应用

---

## 全局规则：跨会话输入来源

当一个智能体通过 `sessions_send` 将 prompt 发送到另一个会话时（包括
智能体到智能体的 reply/announce 步骤），OpenClaw 会以如下方式持久化生成的用户轮次：

- `message.provenance.kind = "inter_session"`

此元数据会在 transcript 追加时写入，不会改变角色
（出于 provider 兼容性考虑，`role: "user"` 保持不变）。Transcript 读取器可以利用这一点，避免将路由过来的内部 prompt 误认为是最终用户撰写的指令。

在上下文重建期间，OpenClaw 还会在内存中为这些用户轮次预加一个简短的 `[Inter-session message]`
标记，以便模型将其与外部最终用户指令区分开来。

---

## Provider 矩阵（当前行为）

**OpenAI / OpenAI Codex**

- 仅进行图像清理。
- 对于 OpenAI Responses/Codex transcript，丢弃孤立的 reasoning signatures（即后面没有跟随内容块的独立 reasoning 项）。
- 不进行工具调用 id 清理。
- 不进行工具结果配对修复。
- 不进行轮次校验或重排序。
- 不生成合成工具结果。
- 不剥离 thought signatures。

**Google（Generative AI / Gemini CLI / Antigravity）**

- 工具调用 id 清理：严格字母数字格式。
- 工具结果配对修复和合成工具结果。
- 轮次校验（Gemini 风格轮次交替）。
- Google 轮次顺序修复（如果历史以 assistant 开始，则前置一个极小的用户引导消息）。
- Antigravity Claude：标准化 thinking signatures；丢弃未签名的 thinking 块。

**Anthropic / Minimax（兼容 Anthropic）**

- 工具结果配对修复和合成工具结果。
- 轮次校验（合并连续的用户轮次，以满足严格的交替要求）。

**Mistral（包括基于 model-id 的检测）**

- 工具调用 id 清理：strict9（长度为 9 的字母数字）。

**OpenRouter Gemini**

- Thought signature 清理：剥离非 base64 的 `thought_signature` 值（保留 base64）。

**其他所有情况**

- 仅进行图像清理。

---

## 历史行为（2026.1.22 之前）

在 2026.1.22 发布之前，OpenClaw 会应用多层 transcript 清洁逻辑：

- 一个 **transcript-sanitize extension** 会在每次构建上下文时运行，并且可能：
  - 修复工具使用/结果配对。
  - 清理工具调用 id（包括一种保留 `_`/`-` 的非严格模式）。
- Runner 还会执行 provider 专用清理，这导致了重复工作。
- 另外还有发生在 provider 策略之外的额外变更，包括：
  - 在持久化前从助手文本中剥离 `<final>` 标签。
  - 丢弃空的助手错误轮次。
  - 在工具调用后裁剪助手内容。

这种复杂性导致了跨 provider 的回归问题（尤其是 `openai-responses`
中的 `call_id|fc_id` 配对）。2026.1.22 的清理工作移除了该扩展，将逻辑集中到 runner 中，并使 OpenAI 在图像清理之外变为**不做任何改动**。
