---
permalink: /security/formal-verification/
read_when:
    - 审查形式化安全模型的保证或限制
    - 复现或更新 TLA+ / TLC 安全模型检查
summary: 针对 OpenClaw 最高风险路径的机器校验安全模型。
title: 形式化验证（安全模型）
x-i18n:
    generated_at: "2026-04-08T07:10:07Z"
    model: gpt-5.4
    provider: openai
    source_hash: 0f7cd2461dcc00d320a5210e50279d76a7fa84e0830c440398323d75e262a38a
    source_path: security\formal-verification.md
    workflow: 15
---

# 形式化验证（安全模型）

本页跟踪 OpenClaw 的**形式化安全模型**（当前为 TLA+ / TLC；未来按需扩展）。

> 注意：一些旧链接可能仍会引用之前的项目名称。

**目标（北极星）：** 在显式假设下，给出一个经过机器校验的论证，证明 OpenClaw 能执行其预期的安全策略（授权、会话隔离、工具门控和错误配置安全）。

**它当前是什么：** 一套可执行、由攻击者驱动的**安全回归测试套件**：

- 每项断言都带有一个可运行的有限状态空间模型检查。
- 许多断言都配有一个对应的**负模型**，用于为现实中的某类 bug 生成反例轨迹。

**它目前还不是什么：** 它还不是“OpenClaw 在所有方面都安全”的证明，也不是对完整 TypeScript 实现正确性的证明。

## 模型存放位置

这些模型维护在一个独立仓库中：[vignesh07/openclaw-formal-models](https://github.com/vignesh07/openclaw-formal-models)。

## 重要注意事项

- 这些是**模型**，不是完整的 TypeScript 实现。模型与代码之间可能发生漂移。
- 结果受限于 TLC 探索的状态空间；“绿色通过”并不意味着超出已建模假设和边界之外的安全性。
- 某些断言依赖显式环境假设（例如正确部署、正确的配置输入）。

## 复现结果

当前的复现方式是：在本地克隆模型仓库并运行 TLC（见下文）。未来可能会提供：

- 在 CI 中运行模型并公开产物（反例轨迹、运行日志）
- 面向小规模、有边界检查的托管式“运行此模型”工作流

快速开始：

```bash
git clone https://github.com/vignesh07/openclaw-formal-models
cd openclaw-formal-models

# Java 11+ required (TLC runs on the JVM).
# The repo vendors a pinned `tla2tools.jar` (TLA+ tools) and provides `bin/tlc` + Make targets.

make <target>
```

### Gateway 网关暴露与开放网关错误配置

**断言：** 在没有认证的情况下绑定到 loopback 之外的地址，可能导致远程失陷 / 增加暴露面；token / password 可在模型假设下阻止未授权攻击者。

- 绿色通过：
  - `make gateway-exposure-v2`
  - `make gateway-exposure-v2-protected`
- 红色（预期）：
  - `make gateway-exposure-v2-negative`

另请参阅模型仓库中的：`docs/gateway-exposure-matrix.md`。

### 节点 exec 流水线（最高风险能力）

**断言：** `exec host=node` 需要满足：
(a) 节点命令 allowlist 加已声明命令，以及
(b) 在配置要求时具备实时审批；审批在模型中采用 token 化以防止重放。

- 绿色通过：
  - `make nodes-pipeline`
  - `make approvals-token`
- 红色（预期）：
  - `make nodes-pipeline-negative`
  - `make approvals-token-negative`

### 配对存储（私信门控）

**断言：** 配对请求会遵守 TTL 和待处理请求上限。

- 绿色通过：
  - `make pairing`
  - `make pairing-cap`
- 红色（预期）：
  - `make pairing-negative`
  - `make pairing-cap-negative`

### 入口门控（提及 + 控制命令绕过）

**断言：** 在要求提及的群组上下文中，未授权的“控制命令”不能绕过提及门控。

- 绿色：
  - `make ingress-gating`
- 红色（预期）：
  - `make ingress-gating-negative`

### 路由 / 会话键隔离

**断言：** 来自不同对端的私信不会被折叠进同一个会话，除非明确建立链接 / 做了相应配置。

- 绿色：
  - `make routing-isolation`
- 红色（预期）：
  - `make routing-isolation-negative`

## v1++：额外的有界模型（并发、重试、轨迹正确性）

这些是后续模型，用于在真实世界故障模式（非原子更新、重试和消息扇出）方面提升保真度。

### 配对存储并发 / 幂等性

**断言：** 即使在交错执行下，配对存储也应强制执行 `MaxPending` 和幂等性（即“先检查再写入”必须是原子 / 加锁的；刷新不应创建重复项）。

其含义是：

- 在并发请求下，某个渠道的 `MaxPending` 不能被突破。
- 对同一个 `(channel, sender)` 的重复请求 / 刷新，不应创建重复的存活待处理行。

- 绿色通过：
  - `make pairing-race`（原子 / 加锁的上限检查）
  - `make pairing-idempotency`
  - `make pairing-refresh`
  - `make pairing-refresh-race`
- 红色（预期）：
  - `make pairing-race-negative`（非原子的 begin / commit 上限竞争）
  - `make pairing-idempotency-negative`
  - `make pairing-refresh-negative`
  - `make pairing-refresh-race-negative`

### 入口轨迹关联 / 幂等性

**断言：** 摄取过程应在扇出过程中保留轨迹关联，并在提供商重试下保持幂等。

其含义是：

- 当一个外部事件变成多个内部消息时，每一部分都要保留相同的轨迹 / 事件身份。
- 重试不会导致重复处理。
- 如果缺少提供商事件 id，去重会回退到安全键（例如 trace id），以避免误丢不同事件。

- 绿色：
  - `make ingress-trace`
  - `make ingress-trace2`
  - `make ingress-idempotency`
  - `make ingress-dedupe-fallback`
- 红色（预期）：
  - `make ingress-trace-negative`
  - `make ingress-trace2-negative`
  - `make ingress-idempotency-negative`
  - `make ingress-dedupe-fallback-negative`

### 路由 dmScope 优先级 + identityLinks

**断言：** 路由必须默认保持私信会话隔离，并且只有在显式配置时才折叠会话（渠道优先级 + 身份链接）。

其含义是：

- 渠道专属的 dmScope 覆盖必须优先于全局默认值。
- identityLinks 只能在显式链接组内部折叠，而不能跨不相关对端折叠。

- 绿色：
  - `make routing-precedence`
  - `make routing-identitylinks`
- 红色（预期）：
  - `make routing-precedence-negative`
  - `make routing-identitylinks-negative`
