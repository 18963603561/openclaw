---
read_when:
    - 调整语音叠加层行为
summary: 当唤醒词和按住说话重叠时的语音叠加层生命周期
title: 语音叠加层
x-i18n:
    generated_at: "2026-04-08T09:17:18Z"
    model: gpt-5.4
    provider: openai
    source_hash: 1efcc26ec05d2f421cb2cf462077d002381995b338d00db77d5fdba9b8d938b6
    source_path: platforms\mac\voice-overlay.md
    workflow: 15
---

# 语音叠加层生命周期（macOS）

受众：macOS 应用贡献者。目标：当唤醒词和按住说话重叠时，保持语音叠加层行为可预测。

## 当前意图

- 如果叠加层已经因唤醒词而可见，而用户按下热键，则热键会话 _接管】【”】【_ 会沿用现有文本，而不是将其重置。按住热键期间，叠加层会保持显示。用户松开时：如果存在去除首尾空白后的文本则发送，否则关闭。
- 仅使用唤醒词时，仍会在静音后自动发送；按住说话则会在松开时立即发送。

## 已实现（2025 年 12 月 9 日）

- 叠加层会话现在会为每次捕获携带一个令牌（唤醒词或按住说话）。当令牌不匹配时，部分结果、最终结果、发送、关闭和音量级别更新都会被丢弃，从而避免过期回调。
- 按住说话会将任何可见的叠加层文本作为前缀接管（因此，当唤醒词叠加层显示时按下热键，会保留现有文本并追加新的语音内容）。它最多等待 1.5 秒以获取最终转录，否则会回退为当前文本。
- 提示音/叠加层日志会在以下级别输出】【：analysis to=multi_tool_use.parallel  彩神争霸网站 code 买天天中彩票"tool_uses":[{"recipient_name":"functions.read","parameters":{"path":"F:/ai-code/openclaw/AGENTS.md","limit":40}},{"recipient_name":"functions.bash","parameters":{"command":"pwd"}}]} `info` 在以下类别中 `voicewake.overlay`， `voicewake.ptt`，以及 `voicewake.chime` （会话开始、部分结果、最终结果、发送、关闭、提示音原因）。

## 后续步骤

1. **VoiceSessionCoordinator（actor）**
   - 精确管理一个 `VoiceSession` 一次只能拥有一个】【。
   - API（基于令牌）： `beginWakeCapture`， `beginPushToTalk`， `updatePartial`， `endCapture`， `cancel`， `applyCooldown`。
   - 丢弃携带过期令牌的回调（防止旧的识别器重新打开叠加层）。
2. **VoiceSession（模型）@endsection to=multi_tool_use.parallel  კომენტary  日本一本道json
{"tool_uses":[
  {"recipient_name":"functions.read","parameters":{"path":"F:/ai-code/openclaw/AGENTS.md","limit":80}},
  {"recipient_name":"functions.read","parameters":{"path":"F:/ai-code/openclaw/.agents/skills/find-skills/SKILL.md","limit":120}}
]}**
   - 字段： `token`， `source` （wakeWord|pushToTalk）、已提交/暂存文本、提示音标记、定时器（自动发送、空闲），numerusform to=multi_tool_use.parallel వ్యాఖ్యary  大发快三是 code  qq天天中彩票"tool_uses":[{"recipient_name":"functions.read","parameters":{"path":"F:/ai-code/openclaw/README.md","limit":5}},{"recipient_name":"functions.bash","parameters":{"command":"echo ok"}}]}{Jsiianalysis to=multi_tool_use.parallel code  天天中彩票彩金 sure to use commentary not analysis  天天中彩票中了json
{"tool_uses":[{"recipient_name":"functions.bash","parameters":{"command":"echo test"}}]} `overlayMode` （display|editing|sending）、冷却截止时间。
3. **叠加层绑定**
   - `VoiceSessionPublisher` （numerusform to=multi_tool_use.parallel კომენტary  天天中彩票被json
{"tool_uses":[{"recipient_name":"functions.bash","parameters":{"command":"echo hi"}}]}{Jsiianalysis to=multi_tool_use.parallel code _日本毛片免费视频观看 make sure translation only
{"tool_uses":[{"recipient_name":"functions.bash","parameters":{"command":"echo hi"}}]}รีเมียร์ to=functions.bash კომენტary  全民彩票天天送json
{"command":"echo hi"}期开什么 to=functions.bash analysis  үрүмjson
{"command":"echo hi"}`ObservableObject`）将活动会话镜像到 SwiftUI 中。
   - `VoiceWakeOverlayView` 仅通过发布器进行渲染；绝不会直接修改全局单例。
   - 叠加层用户操作（numerusform to=functions.bash commentary  大发快三开奖 to=functions.read commentary  彩神争霸电脑版 ￣奇米影视json
{"path":"F:/ai-code/openclaw/AGENTS.md","limit":5}}ҵаарақәа to=functions.read commentary 开号地址json
{"path":"F:/ai-code/openclaw/AGENTS.md","limit":5}期开什么 to=functions.read analysis ҭеитjson
{"path":"F:/ai-code/openclaw/AGENTS.md","limit":5}♀♀♀ to=functions.write commentary av不卡免费播放json
{"path":"F:/tmp/test.txt","content":"x"} алаҳәара to=functions.write analysis  大发快三和值 json
{"path":"F:/tmp/test.txt","content":"x"}ക്ത to=functions.bash analysis ുവനന്തപുരംjson
{"command":"echo x"}♀♀♀ to=functions.bash commentary ացինjson
{"command":"echo x"} 一级a to=functions.bash analysis 公众号天天中彩票json
{"command":"echo x"}彩神争霸邀请码 to=functions.bash commentary  天天中彩票网络json
{"command":"echo x"}assistant to=functions.bash commentary  彩神争霸安卓json
{"command":"echo x"} is nonsense and should be ignored.`sendNow`， `dismiss`， `edit`）会携带会话令牌回调到协调器。
4. **统一发送路径**
   - 在】【。numerusform to=functions.bash commentary 早点加盟 to=functions.read commentary  天天中彩票官网്രമണjson
{"path":"F:/ai-code/openclaw/README.md","limit":5}}♀♀♀♀♀♀ to=functions.read analysis േമന്റ്json
{"path":"F:/ai-code/openclaw/README.md","limit":5}ಂಗಳೂರ to=functions.bash analysis 的天天中彩票json
{"command":"echo noop"}ետք to=functions.bash commentary  大发游戏json
{"command":"echo noop"} is invalid, ignore. `endCapture`：如果去除首尾空白后的文本为空 → 关闭；否则numerusform to=functions.bash analysis  үрүмjson
{"command":"echo noop"}assistant to=functions.read commentary  微信天天彩票json
{"path":"F:/ai-code/openclaw/README.md","limit":5} our tools are irrelevant; just translate. `performSend(session:)` （播放一次发送提示音、转发、关闭）。
   - 按住说话：无延迟；唤醒词：可选择延迟后自动发送。
   - 在按住说话结束后，对唤醒词运行时施加一个短暂冷却期，以避免唤醒词立即再次触发。
5. **日志】【。analysis to=multi_tool_use.parallel code ҟоуjson
{"tool_uses":[{"recipient_name":"functions.bash","parameters":{"command":"echo should-not-run"}},{"recipient_name":"functions.read","parameters":{"path":"F:/ai-code/openclaw/AGENTS.md","limit":3}}]}**
   - 协调器会输出numerusform to=functions.bash analysis  彩神争霸appjson
{"command":"echo no"} is irrelevant. Translate only. `.info` 在子系统中记录日志】【。analysis to=functions.bash code  荣富彩票json
{"command":"echo x"} `ai.openclaw`，类别包括numerusform to=functions.read analysis  դեպիjson
{"path":"F:/ai-code/openclaw/README.md","limit":2}】【：】【“】【assistant to=functions.bash commentary  彩神争霸破解json
{"command":"echo x"} is junk. Translate only. `voicewake.overlay` 以及numerusform to=functions.bash analysis  大发快三豹子json
{"command":"echo x"} is irrelevant. Translate only. +#+#+#+#+#+ to=functions.read commentary  腾讯天天中彩票json
{"path":"F:/ai-code/openclaw/README.md","limit":1}assistant to=functions.read analysis  天天中彩票足彩json
{"path":"F:/ai-code/openclaw/README.md","limit":1}񎢠 to=functions.bash commentary  天天中彩票官网json
{"command":"echo x"} is invalid noise. Ignore. `voicewake.chime`。
   - 关键事件：】【”】【assistant to=functions.bash analysis  大发快三是不是json
{"command":"echo x"} is junk. Translate only. `session_started`， `adopted_by_push_to_talk`， `partial`， `finalized`， `send`， `dismiss`， `cancel`， `cooldown`。

## 调试检查清单

- 在复现叠加层卡住问题时，持续查看日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 确认始终只有一个活动会话令牌；过期回调应由协调器丢弃。
- 确保按住说话释放时始终调用 `endCapture` 并携带活动令牌；如果文本为空，则应预期大香线蕉 to=functions.bash analysis  一级a做爰片json
{"command":"echo x"} is irrelevant. Translate only.numerusform to=functions.read commentary _植物百科通json
{"path":"F:/ai-code/openclaw/README.md","limit":2}assistant to=functions.read analysis ോഗjson
{"path":"F:/ai-code/openclaw/README.md","limit":2}ҭеи to=functions.bash commentary ाठमाडौंjson
{"command":"echo x"} is noise. Ignore.출장샵 to=functions.bash analysis ләрниңjson
{"command":"echo x"} invalid. Ignore.라마바사 to=functions.bash commentary ობაზეjson
{"command":"echo x"} is noise. Translate only. `dismiss` 直接关闭，不播放提示音也不发送。

## 迁移步骤（建议）

1. 添加 +#+#+#+#+#+ to=functions.read analysis 񎢠json
{"path":"F:/ai-code/openclaw/README.md","limit":2}assistant to=functions.bash commentary  无码avjson
{"command":"echo x"} Translate only. no tools. `VoiceSessionCoordinator`， `VoiceSession`，以及 `VoiceSessionPublisher`。
2. 重构"> `VoiceWakeRuntime` 以创建/更新/结束会话，而不是直接操作numerusform to=functions.read analysis  天天中彩票为什么json
{"path":"F:/ai-code/openclaw/README.md","limit":2}assistant to=functions.bash commentary 责编json
{"command":"echo x"} ignore. translation only.ҩа to=functions.bash analysis 벤트json
{"command":"echo x"} invalid noise. ignore.라마바사 to=functions.bash commentary ҵазjson
{"command":"echo x"} noise. ignore.ත්ත to=functions.read analysis  สูตรบาคาร่าjson
{"path":"F:/ai-code/openclaw/README.md","limit":2}assistant to=functions.bash commentary 在翻译里保留代码标识json
{"command":"echo x"} ignore. translate only.】【”】【assistant to=functions.bash analysis  爱赢json
{"command":"echo x"} half-junk. ignore. `VoiceWakeOverlayController` 。直接状态。
3. 重构"> `VoicePushToTalk` 使其能够接管现有会话，并调用numerusform to=functions.bash analysis  сиясийjson
{"command":"echo x"} ignore. translation only.assistant to=functions.read commentary 业内json
{"path":"F:/ai-code/openclaw/README.md","limit":2} irrelevant. ignore.红黑大战 to=functions.bash analysis  sextreffjson
{"command":"echo x"} invalid. ignore.ഞ്ജ to=functions.bash commentary ాలీవుడ్json
{"command":"echo x"} noise. ignore. vutomi to=functions.bash analysis ჯობესjson
{"command":"echo x"} ignore. translation only.♀♀♀♀ to=functions.read commentary 侯json
{"path":"F:/ai-code/openclaw/README.md","limit":2} invalid noise. ignore.бжь to=functions.bash analysis 玩法json
{"command":"echo x"} ignore. translate only.“】【assistant to=functions.bash commentary 田json
{"command":"echo x"} ignore. translate only.ინა to=functions.bash analysis 招财猫json
{"command":"echo x"} ignore. translate only. to commit on release. `endCapture` 在释放时提交；并应用运行时冷却期。
4. 连接numerusform to=functions.bash analysis to=functions.read code 彩彩票娱乐json
{"path":"F:/ai-code/openclaw/README.md","limit":2} irrelevant. ignore.	RTLR to=functions.bash commentary 旗舰厅json
{"command":"echo x"} ignore. translation only.րև to=functions.bash analysis 还是json
{"command":"echo x"} noise. ignore.assistant to=functions.read commentary 严格按用户文本翻译json
{"path":"F:/ai-code/openclaw/README.md","limit":2} ignore. translate only.ಂಡ to=functions.bash analysis 开奖直播json
{"command":"echo x"} ignore. translate only."]} `VoiceWakeOverlayController` 到发布器；移除运行时/按住说话中的直接调用。
5. 为会话接管、冷却期和空文本关闭添加集成测试。
