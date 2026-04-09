---
read_when:
    - 你想贡献安全发现或威胁场景
    - 审阅或更新威胁模型
summary: 如何为 OpenClaw 威胁模型做贡献
title: 为威胁模型做贡献
x-i18n:
    generated_at: "2026-04-08T07:09:19Z"
    model: gpt-5.4
    provider: openai
    source_hash: 9cd212d456571a25da63031588d3b584bdfc119e2096b528b97a3f7ec5e4b3db
    source_path: security\CONTRIBUTING-THREAT-MODEL.md
    workflow: 15
---

# 为 OpenClaw 威胁模型做贡献

感谢你帮助让 OpenClaw 更加安全。这个威胁模型是一份持续演进的文档，我们欢迎任何人参与贡献——你不需要是安全专家。

## 贡献方式

### 添加威胁

发现了我们尚未覆盖的攻击向量或风险？请在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提交 issue，并用你自己的话描述它。你不需要了解任何框架，也不需要填写每一个字段——只要描述这个场景即可。

**建议提供（但不是必需）：**

- 攻击场景以及它可能如何被利用
- 受影响的 OpenClaw 组成部分（CLI、Gateway 网关、渠道、ClawHub、MCP 服务器等）
- 你认为的严重程度（低 / 中 / 高 / 严重）
- 任何相关研究、CVE 或现实案例的链接

我们会在审查期间处理 ATLAS 映射、威胁 ID 和风险评估。如果你愿意附上这些细节，也很好——但不是必需的。

> **这里用于向威胁模型添加内容，而不是报告正在发生的漏洞。** 如果你发现了可利用漏洞，请参阅我们的 [Trust 页面](https://trust.openclaw.ai) 了解负责任披露说明。

### 提出缓解措施

如果你对如何解决某个现有威胁有想法，请提交引用该威胁的 issue 或 PR。有效的缓解措施应当具体且可执行——例如，“在 Gateway 网关实现每发送者每分钟 10 条消息的限流”就比“实现限流”更好。

### 提出攻击链

攻击链展示了多个威胁如何组合成一个现实中的攻击场景。如果你看到了危险组合，请描述其步骤以及攻击者如何将它们串联起来。相比正式模板，对攻击在实际中如何展开的简短叙述更有价值。

### 修复或改进现有内容

错别字、澄清说明、过时信息、更好的示例——欢迎直接提交 PR，无需先开 issue。

## 我们使用的内容

### MITRE ATLAS

这个威胁模型基于 [MITRE ATLAS](https://atlas.mitre.org/)（面向 AI 系统的对抗性威胁全景），这是一个专门为 AI / ML 威胁设计的框架，适用于提示词注入、工具滥用和智能体利用等场景。你无需了解 ATLAS 也能贡献——我们会在审查时将提交内容映射到该框架。

### 威胁 ID

每个威胁都会获得一个类似 `T-EXEC-003` 的 ID。分类如下：

| 代码 | 分类 |
| ------- | ------------------------------------------ |
| RECON   | Reconnaissance —— 信息收集 |
| ACCESS  | Initial access —— 获得入口 |
| EXEC    | Execution —— 执行恶意操作 |
| PERSIST | Persistence —— 维持访问 |
| EVADE   | Defense evasion —— 规避检测 |
| DISC    | Discovery —— 了解环境 |
| EXFIL   | Exfiltration —— 窃取数据 |
| IMPACT  | Impact —— 破坏或干扰 |

这些 ID 由维护者在审查期间分配。你不需要自行选择。

### 风险级别

| 级别 | 含义 |
| ------------ | ----------------------------------------------------------------- |
| **严重** | 完整系统失陷，或高可能性 + 严重影响 |
| **高** | 很可能造成显著损害，或中等可能性 + 严重影响 |
| **中** | 中等风险，或低可能性 + 高影响 |
| **低** | 发生可能性低，且影响有限 |

如果你不确定风险级别，只需描述影响，我们会进行评估。

## 审查流程

1. **分诊** —— 我们会在 48 小时内审查新的提交
2. **评估** —— 我们验证可行性，分配 ATLAS 映射和威胁 ID，并校验风险级别
3. **文档化** —— 我们确保所有内容格式正确且信息完整
4. **合并** —— 将其添加到威胁模型和可视化中

## 资源

- [ATLAS 网站](https://atlas.mitre.org/)
- [ATLAS 技术项](https://atlas.mitre.org/techniques/)
- [ATLAS 案例研究](https://atlas.mitre.org/studies/)
- [威胁模型（MITRE ATLAS）](/zh-CN/security/THREAT-MODEL-ATLAS)

## 联系方式

- **安全漏洞：** 请参阅我们的 [Trust 页面](https://trust.openclaw.ai) 了解报告说明
- **威胁模型问题：** 在 [openclaw/trust](https://github.com/openclaw/trust/issues) 上提交 issue
- **一般交流：** Discord 的 #security 渠道

## 致谢

对威胁模型作出贡献的人，会在威胁模型致谢、发布说明以及 OpenClaw 安全名人堂中获得认可，尤其是对重大贡献者。
