---
read_when:
    - 你希望你的智能体听起来没那么泛化
    - 你正在编辑 `SOUL.md`
    - 你想要更强的人格，同时不破坏安全性或简洁性
summary: 使用 `SOUL.md` 让你的 OpenClaw 智能体真正拥有自己的声音，而不是泛泛而谈的助手腔调
title: SOUL.md 人格指南
x-i18n:
    generated_at: "2026-04-08T04:05:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: a4f73d68bc8ded6b46497a2f63516f9b2753b111e6176ba40b200858a6938fba
    source_path: concepts\soul.md
    workflow: 15
---

# SOUL.md 人格指南

`SOUL.md` 是你的智能体声音所在的地方。

OpenClaw 会在普通会话中注入它，所以它确实有分量。如果你的智能体听起来平淡、犹疑，或者带着一种奇怪的企业腔，通常应该修的就是这个文件。

## 什么内容适合放进 SOUL.md

把那些会改变与智能体交流感受的内容放进去：

- 语气
- 观点
- 简洁程度
- 幽默感
- 边界
- 默认的直率程度

**不要**把它变成：

- 人生故事
- 更新日志
- 一大堆安全策略
- 一整面只有氛围、却没有行为效果的空话墙

短比长好。锋利比模糊好。

## 为什么这样有效

这与 OpenAI 的 prompt 指南一致：

- prompt engineering 指南指出，高层行为、语气、目标和示例应放在高优先级指令层，而不是埋在用户轮次里。
- 同一份指南还建议把 prompt 当作需要迭代、固定版本并评估的内容，而不是写一次就忘的神秘文案。

对 OpenClaw 来说，`SOUL.md` 就是那一层。

如果你想要更好的人格，就写出更有力的指令。如果你想要稳定的人格，就让它们保持简洁并进行版本管理。

OpenAI 参考资料：

- [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Message roles and instruction following](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Molty prompt

把下面这段粘贴给你的智能体，让它重写 `SOUL.md`。

路径已针对 OpenClaw 工作区固定：使用 `SOUL.md`，不要使用 `http://SOUL.md`。

```md
Read your `SOUL.md`. Now rewrite it with these changes:

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" - commit to a take.
2. Delete every rule that sounds corporate. If it could appear in an employee handbook, it doesn't belong here.
3. Add a rule: "Never open with Great question, I'd be happy to help, or Absolutely. Just answer."
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes - just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. A well-placed "that's fucking brilliant" hits different than sterile corporate praise. Don't force it. Don't overdo it. But if a situation calls for a "holy shit" - say holy shit.
8. Add this line verbatim at the end of the vibe section: "Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good."

Save the new `SOUL.md`. Welcome to having a personality.
```

## 什么才算好

好的 `SOUL.md` 规则听起来像这样：

- 要有判断
- 跳过废话
- 适合时就幽默一点
- 尽早指出坏主意
- 除非深入分析确实有用，否则保持简洁

不好的 `SOUL.md` 规则听起来像这样：

- 始终保持专业
- 提供全面且周到的帮助
- 确保积极且支持性的体验

第二组规则会让你的内容变成一团糨糊。

## 一个提醒

人格不是允许你敷衍的许可证。

把 `AGENTS.md` 留给运行规则。把 `SOUL.md` 留给声音、立场和风格。如果你的智能体工作在共享渠道、公开回复或面向客户的场景中，请确保它的语气仍然适合那个环境。

锋利是好的。惹人烦不是。

## 相关文档

- [Agent workspace](/zh-CN/concepts/agent-workspace)
- [System prompt](/zh-CN/concepts/system-prompt)
- [SOUL.md template](/reference/templates/SOUL)
