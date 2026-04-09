---
read_when:
    - 更改菜单栏图标行为
summary: macOS 上 OpenClaw 的菜单栏图标状态和动画
title: 菜单栏图标
x-i18n:
    generated_at: "2026-04-08T08:10:55Z"
    model: gpt-5.4
    provider: openai
    source_hash: a67a6e6bbdc2b611ba365d3be3dd83f9e24025d02366bc35ffcce9f0b121872b
    source_path: platforms\mac\icon.md
    workflow: 15
---

# 菜单栏图标状态

作者：steipete · 更新于：2025-12-06 · 范围：macOS 应用（桌面）`apps/macos`)

- **空闲：** 正常图标动画（闪烁、偶尔轻微摇动）。
- **已暂停：** 状态栏项目使用 `appearsDisabled`；无动画。
- **语音触发（大耳朵）：** 语音唤醒检测器调用 `AppState.triggerVoiceEars(ttl: nil)` 当检测到唤醒词时，保持使用출장샵assistant to=functions.read კომენტary  天天彩票怎么  快三大发  大发快三有json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":120} `earBoostActive=true` 在捕获话语期间。耳朵会放大（1.9 倍），并添加圆形耳孔以提高可读性，然后通过 `stopVoiceEars()` 在静音 1 秒后触发的 `recordingStopTask` 回落。仅从应用内语音管线触发。
- **工作中（智能体运行中）：** `AppState.isWorking=true` `workAnimationState` 会驱动一种“尾巴/腿部快速摆动”的微动画：在任务进行中时，腿部摆动更快，并带有轻微位移。目前它是在 WebChat 智能体运行前后切换的；当你接入其他长任务时，也请在其前后添加相同的切换。

接入点

- 语音唤醒：运行时/测试器调用 `AppState.triggerVoiceEars(ttl: nil)` 触发时调用 `showVoiceTriggered()`，并在结束时调用 `hideVoiceTriggered()`】【。assistant to=functions.read კომენტary  北京赛车女郎  北京赛车前json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":40} `stopVoiceEars()` 在静音 1 秒后执行，以匹配捕获窗口。
- 智能体活动：设置 `AppStateStore.shared.setWorking(true/false)` 包裹在工作区间前后（WebChat 智能体调用中已完成）。保持区间尽可能短，并在 `finally` 中重置。 `defer` 代码块，以避免动画卡住。

形状与尺寸

- 基础图标绘制在 `18×18 pt` 画布上，默认放置在 `22×18 pt` 的 `NSStatusItem` 按钮内。尾巴/腿部动画最大会向任意方向超出约 `1 pt`，并保持在按钮边界内。线条使用 `2.6 pt` 描边，耳朵采用统一的三角形轮廓。 `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`。
- 耳朵缩放默认值为 `1.0`，语音触发时动画到 `1.9`。耳孔仅在缩放大于 `1.0` 时显示。尾巴偏移量约为 `0.9 pt`，腿部偏移量约为 `0.65 pt`。 `1.0`；语音增强会设置为 `1.9`。尾巴偏移约为 `0.9 pt`，腿部偏移约为 `0.65 pt`。รีเมียร์assistant to=functions.read კომენტary ＿久久爱 的天天彩票  彩神争霸邀请码json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":20} `earScale=1.9` 并切换 `earHoles=true` 而不改变整体画框（`18×18 pt` 模板图像渲染到 `36×36 px` 的 Retina 后备存储中）。
- 快速摆动会让腿部摆幅最高达到约 `1.0`，并带有轻微的水平抖动；它会叠加到现有的空闲轻微摆动之上。

行为说明♀♀♀♀♀♀assistant to=functions.read კომენტary  天天爱彩票каўಿವು 早点加盟分分彩json
{"path":"F:/ai-code/openclaw/AGENTS.md","offset":1,"limit":10}

- 耳朵/工作中状态没有外部 CLI/代理切换；请将其保持为仅由应用自身信号内部控制，以避免意外抖动。
- 将 TTL 保持较短（`<10s`），这样如果任务卡住，图标也能快速恢复到基线状态。
