---
read_when:
    - 诊断认证配置轮换、冷却时间或模型回退行为
    - 更新认证配置或模型的故障切换规则
    - 理解会话模型覆盖如何与回退重试交互
summary: OpenClaw 如何在模型之间轮换认证配置并执行回退
title: 模型故障切换
x-i18n:
    generated_at: "2026-04-08T04:02:54Z"
    model: gpt-5.4
    provider: openai
    source_hash: d88821e229610f236bdab3f798d5e8c173f61a77c01017cc87431126bf465e32
    source_path: concepts\model-failover.md
    workflow: 15
---

# 模型故障切换

OpenClaw 分两个阶段处理失败：

1. 当前提供商内的**认证配置轮换**。
2. 回退到 `agents.defaults.model.fallbacks` 中的下一个**模型**。

本文说明运行时规则以及支撑这些规则的数据。

## 运行时流程

对于一次普通文本运行，OpenClaw 会按以下顺序评估候选项：

1. 当前选定的会话模型。
2. 按顺序配置的 `agents.defaults.model.fallbacks`。
3. 如果此次运行起始于某个 override，则最后再尝试配置的主模型。

在每个候选项内部，OpenClaw 会先尝试认证配置故障切换，然后才会进入下一个模型候选项。

高层流程如下：

1. 解析当前活跃的会话模型和认证配置偏好。
2. 构建模型候选链。
3. 按认证配置轮换/冷却规则尝试当前提供商。
4. 如果该提供商因值得故障切换的错误而被耗尽，则转到下一个模型候选项。
5. 在重试开始前，先持久化选中的回退 override，这样其他会话读取方就能看到运行器即将使用的同一提供商/模型。
6. 如果回退候选项失败，则仅在会话中的回退相关 override 字段仍然匹配该失败候选项时，回滚这些字段。
7. 如果所有候选项都失败，则抛出一个 `FallbackSummaryError`，其中包含每次尝试的详细信息，以及已知情况下最早的冷却到期时间。

这刻意比“保存并恢复整个会话”更窄。回复运行器只会持久化它为回退所拥有的模型选择字段：

- `providerOverride`
- `modelOverride`
- `authProfileOverride`
- `authProfileOverrideSource`
- `authProfileOverrideCompactionCount`

这样可以防止一次失败的回退重试覆盖较新的、与之无关的会话变更，例如在尝试运行期间发生的手动 `/model` 更改或会话轮换更新。

## 认证存储（密钥 + OAuth）

OpenClaw 对 API 密钥和 OAuth token 都使用**认证配置**。

- 密钥存放在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（旧版路径：`~/.openclaw/agent/auth-profiles.json`）。
- 运行时认证路由状态存放在 `~/.openclaw/agents/<agentId>/agent/auth-state.json` 中。
- 配置 `auth.profiles` / `auth.order` **仅用于元数据和路由**（不包含密钥）。
- 旧版仅导入用 OAuth 文件：`~/.openclaw/credentials/oauth.json`（首次使用时导入到 `auth-profiles.json`）。

更多细节：[OAuth](/zh-CN/concepts/oauth)

凭证类型：

- `type: "api_key"` → `{ provider, key }`
- `type: "oauth"` → `{ provider, access, refresh, expires, email? }`（某些提供商还包括 `projectId`/`enterpriseUrl`）

## 配置 ID

OAuth 登录会创建彼此独立的配置，因此多个账户可以共存。

- 默认值：当没有 email 可用时，使用 `provider:default`。
- 带 email 的 OAuth：`provider:<email>`（例如 `google-antigravity:user@gmail.com`）。

这些配置位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 的 `profiles` 下。

## 轮换顺序

当某个提供商有多个配置时，OpenClaw 会按如下方式决定顺序：

1. **显式配置**：`auth.order[provider]`（如果已设置）。
2. **已配置的 profiles**：按提供商过滤后的 `auth.profiles`。
3. **已存储的 profiles**：`auth-profiles.json` 中该提供商对应的条目。

如果没有配置显式顺序，OpenClaw 会使用轮询顺序：

- **主键：** 配置类型（**OAuth 优先于 API 密钥**）。
- **次键：** `usageStats.lastUsed`（越早使用的越优先，同类型内排序）。
- **处于冷却/禁用状态的配置**会被移到末尾，并按最早到期时间排序。

### 会话粘性（更利于缓存）

OpenClaw 会**按会话固定所选认证配置**，以保持提供商缓存处于热状态。
它**不会**在每次请求时都进行轮换。固定的配置会一直复用，直到：

- 会话被重置（`/new` / `/reset`）
- 一次 compaction 完成（compaction 计数增加）
- 该配置进入冷却/禁用状态

通过 `/model …@<profileId>` 手动选择会为该会话设置一个**用户 override**，
并且在新会话开始之前不会自动轮换。

自动固定的配置（由会话路由器选择）会被视为一种**偏好**：
它们会被优先尝试，但在遇到速率限制/超时时，OpenClaw 可能会轮换到其他配置。
用户固定的配置则会保持锁定；如果它失败且配置了模型回退，
OpenClaw 会转到下一个模型，而不是切换配置。

### 为什么 OAuth 看起来会“丢失”

如果你对同一个提供商同时有一个 OAuth 配置和一个 API 密钥配置，在未固定时，轮询机制可能会在多条消息之间来回切换。若要强制使用单一配置：

- 通过 `auth.order[provider] = ["provider:profileId"]` 固定，或
- 通过 `/model …` 配合配置 override 使用按会话的 override（当你的 UI/聊天界面支持时）。

## 冷却时间

当某个配置因认证/速率限制错误失败时（或因看起来像速率限制的超时失败时），OpenClaw 会将其标记为冷却中，并切换到下一个配置。
这个速率限制桶不仅包括普通的 `429`：还包括提供商返回的消息，例如
`Too many concurrent requests`、`ThrottlingException`、
`concurrency limit reached`、`workers_ai ... quota limit exceeded`、
`throttled`、`resource exhausted`，以及诸如
`weekly/monthly limit reached` 之类的周期性用量窗口限制。
格式错误/无效请求错误（例如 Cloud Code Assist 工具调用 ID
校验失败）也会被视为值得故障切换，并使用同样的冷却机制。
OpenAI 兼容的 stop-reason 错误，例如 `Unhandled stop reason: error`、
`stop reason: error` 和 `reason: error`，会被归类为超时/故障切换信号。
提供商范围内的通用服务器错误文本，在来源符合已知瞬时模式时，也可能落入该超时桶。例如，Anthropic 的裸
`An unknown error occurred` 以及 JSON `api_error` 负载中带有
`internal server error`、`unknown error, 520`、`upstream error`
或 `backend error` 等瞬时服务器文本时，都会被视为值得故障切换的超时。
OpenRouter 特有的通用上游文本，例如裸 `Provider returned error`，
也只有在提供商上下文确实是 OpenRouter 时，才会被视为超时。
而像 `LLM request failed with an unknown error.` 这样的通用内部回退文本
则保持保守策略，本身不会触发故障切换。

速率限制冷却也可以是模型范围的：

- 当已知失败的模型 ID 时，OpenClaw 会为速率限制失败记录 `cooldownModel`。
- 同一提供商上的兄弟模型在冷却范围属于其他模型时，仍然可以尝试。
- 计费/禁用窗口仍会跨模型阻止整个配置。

冷却时间使用指数退避：

- 1 分钟
- 5 分钟
- 25 分钟
- 1 小时（上限）

状态存储在 `auth-state.json` 的 `usageStats` 下：

```json
{
  "usageStats": {
    "provider:profile": {
      "lastUsed": 1736160000000,
      "cooldownUntil": 1736160600000,
      "errorCount": 2
    }
  }
}
```

## 计费禁用

计费/额度失败（例如“insufficient credits” / “credit balance too low”）会被视为值得故障切换，但它们通常不是暂时性的。OpenClaw 不会设置短暂冷却，而是会将该配置标记为**已禁用**（使用更长的退避时间），然后轮换到下一个配置/提供商。

并非所有带有计费特征的响应都是 `402`，也并非所有 HTTP `402`
都会归入这里。即使提供商返回的是 `401` 或 `403`，
OpenClaw 仍会将显式计费文本归入计费通道，但提供商特定匹配器仍然只对其所属提供商生效（例如 OpenRouter 的 `403 Key limit exceeded`）。
与此同时，临时性的 `402` 用量窗口以及组织/工作区支出限制错误，
当消息看起来可重试时（例如 `weekly usage limit exhausted`、`daily
limit reached, resets tomorrow` 或 `organization spending limit exceeded`），会被归类为 `rate_limit`。
这些情况会走短冷却/故障切换路径，而不是长期计费禁用路径。

状态存储在 `auth-state.json` 中：

```json
{
  "usageStats": {
    "provider:profile": {
      "disabledUntil": 1736178000000,
      "disabledReason": "billing"
    }
  }
}
```

默认值：

- 计费退避从 **5 小时**开始，每次计费失败翻倍，封顶为 **24 小时**。
- 如果某个配置在 **24 小时**内未再失败，退避计数器会重置（可配置）。
- 过载重试在进入模型回退前，允许**同一提供商内轮换 1 次认证配置**。
- 过载重试默认使用 **0 ms 退避**。

## 模型回退

如果某个提供商的所有配置都失败，OpenClaw 会转到
`agents.defaults.model.fallbacks` 中的下一个模型。
这适用于认证失败、速率限制以及耗尽配置轮换的超时
（其他错误不会推进回退）。

对于过载和速率限制错误，OpenClaw 的处理比计费冷却更激进。
默认情况下，OpenClaw 允许在同一提供商内重试一次认证配置，
然后不等待，直接切换到下一个已配置的模型回退。
像 `ModelNotReadyException` 这样的提供商繁忙信号会落入这个过载桶。
你可以通过 `auth.cooldowns.overloadedProfileRotations`、
`auth.cooldowns.overloadedBackoffMs` 和
`auth.cooldowns.rateLimitedProfileRotations` 来调节此行为。

当一次运行以模型 override 开始时（hooks 或 CLI），在尝试完任何已配置的回退后，仍会以 `agents.defaults.model.primary` 作为最终收尾。

### 候选链规则

OpenClaw 会根据当前请求的 `provider/model` 和已配置的回退构建候选列表。

规则如下：

- 请求的模型始终排在第一位。
- 显式配置的回退会去重，但不会按模型 allowlist 过滤。它们被视为显式的运维意图。
- 如果当前运行已经在同一提供商家族中的某个已配置回退上，OpenClaw 会继续使用完整的已配置链。
- 如果当前运行所在的提供商与配置不同，且当前模型并不在已配置的回退链中，OpenClaw 不会附加来自其他提供商的无关已配置回退。
- 当运行起始于某个 override 时，配置的主模型会被追加到末尾，以便在前面的候选项耗尽后，链路还能回归到正常默认值。

### 哪些错误会推进回退

模型回退会在以下情况下继续：

- 认证失败
- 速率限制和冷却耗尽
- 过载/提供商繁忙错误
- 类超时的故障切换错误
- 计费禁用
- `LiveSessionModelSwitchError`，它会被规范化为故障切换路径，从而避免过期的持久化模型引发外层重试循环
- 当仍有剩余候选项时，其他无法识别的错误

模型回退不会在以下情况下继续：

- 明确中止，且不属于类超时/类故障切换
- 上下文溢出错误，这类错误应停留在 compaction/重试逻辑内部
  （例如 `request_too_large`、`INVALID_ARGUMENT: input exceeds the maximum
number of tokens`、`input token count exceeds the maximum number of input
tokens`、`The input is too long for the model` 或 `ollama error: context
length exceeded`）
- 当没有候选项剩余时，最终的未知错误

### 冷却跳过与探测行为

当某个提供商的所有认证配置都已处于冷却中时，OpenClaw
不会永远自动跳过该提供商。它会按候选项逐个决定：

- 持久性认证失败会立即跳过整个提供商。
- 计费禁用通常会跳过，但主候选项仍可能按节流方式进行探测，从而无需重启也能恢复。
- 在接近冷却到期时，主候选项可能会被探测，并带有按提供商控制的节流。
- 同一提供商的回退兄弟模型可以在冷却期间继续尝试，只要失败看起来是瞬时性的（`rate_limit`、`overloaded` 或 unknown）。当速率限制是模型范围时尤其如此，因为兄弟模型可能仍能立即恢复。
- 瞬时冷却探测在每次回退运行中，每个提供商最多只允许一次，这样单个提供商就不会拖慢跨提供商回退。

## 会话 override 与实时模型切换

会话模型变更属于共享状态。活跃运行器、`/model` 命令、
compaction/会话更新以及实时会话协调，都会读取或写入同一个会话条目的不同部分。

这意味着回退重试必须与实时模型切换进行协调：

- 只有显式的用户驱动模型变更才会标记为待处理的实时切换。这包括 `/model`、`session_status(model=...)` 和 `sessions.patch`。
- 由系统驱动的模型变更，例如回退轮换、heartbeat override 或 compaction，本身都不会标记待处理的实时切换。
- 在回退重试开始前，回复运行器会将选中的回退 override 字段持久化到会话条目中。
- 实时会话协调会优先使用持久化的会话 override，而不是过期的运行时模型字段。
- 如果回退尝试失败，运行器只会回滚它自己写入的 override 字段，而且仅在这些字段仍然匹配该失败候选项时才会回滚。

这可以防止经典竞争条件：

1. 主模型失败。
2. 回退候选项在内存中被选中。
3. 会话存储中仍然写着旧的主模型。
4. 实时会话协调读取了过期的会话状态。
5. 在回退尝试开始之前，重试被重新拉回到旧模型。

持久化的回退 override 关闭了这个窗口，而窄范围回滚则能保持较新的手动或运行时会话变更不被破坏。

## 可观测性与失败摘要

`runWithModelFallback(...)` 会记录每次尝试的详细信息，这些信息将用于日志和面向用户的冷却提示消息：

- 尝试过的提供商/模型
- 原因（`rate_limit`、`overloaded`、`billing`、`auth`、`model_not_found` 以及类似的故障切换原因）
- 可选的状态/代码
- 人类可读的错误摘要

当所有候选项都失败时，OpenClaw 会抛出 `FallbackSummaryError`。外层回复运行器可以利用它构建更具体的消息，例如“所有模型当前都暂时受到速率限制”，并在已知的情况下附带最早的冷却到期时间。

这个冷却摘要是模型感知的：

- 与已尝试提供商/模型链无关的模型范围速率限制会被忽略
- 如果剩余阻塞是匹配的模型范围速率限制，OpenClaw 会报告仍然阻塞该模型的最后一个匹配到期时间

## 相关配置

参见 [??](/zh-CN/gateway/configuration)，了解：

- `auth.profiles` / `auth.order`
- `auth.cooldowns.billingBackoffHours` / `auth.cooldowns.billingBackoffHoursByProvider`
- `auth.cooldowns.billingMaxHours` / `auth.cooldowns.failureWindowHours`
- `auth.cooldowns.overloadedProfileRotations` / `auth.cooldowns.overloadedBackoffMs`
- `auth.cooldowns.rateLimitedProfileRotations`
- `agents.defaults.model.primary` / `agents.defaults.model.fallbacks`
- `agents.defaults.imageModel` 路由

参见 [?? CLI](/zh-CN/concepts/models)，了解更广义的模型选择与回退概览。
