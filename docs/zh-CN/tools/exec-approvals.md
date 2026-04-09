---
read_when:
    - 配置 exec 审批或允许列表
    - 在 macOS 应用中实现 exec 审批 UX
    - 审查沙箱逃逸提示及其影响
summary: Exec 审批、允许列表与沙箱逃逸提示
title: Exec 审批
x-i18n:
    generated_at: "2026-04-09T00:57:00Z"
    model: gpt-5.4
    provider: openai
    source_hash: 6041929185bab051ad873cc4822288cb7d6f0470e19e7ae7a16b70f76dfc2cd9
    source_path: tools\exec-approvals.md
    workflow: 15
---

# Exec 审批

Exec 审批是允许处于沙箱隔离中的智能体在真实主机（`gateway` 或 `node`）上运行
命令时的**配套应用 / 节点主机防护栏**。你可以将它理解为一种安全联锁：
只有当策略 + 允许列表 +（可选的）用户审批全部同意时，命令才会被允许。
Exec 审批是对工具策略和提权门控的**额外补充**（除非提权被设为 `full`，那样会跳过审批）。
生效策略是 `tools.exec.*` 与审批默认值中**更严格**的一方；如果某个审批字段被省略，则使用 `tools.exec` 中的值。
主机 exec 还会使用该机器上的本地审批状态。主机本地
`~/.openclaw/exec-approvals.json` 中的 `ask: "always"` 即使在会话或配置默认值要求 `ask: "on-miss"` 时，也会持续提示。
使用 `openclaw approvals get`、`openclaw approvals get --gateway` 或
`openclaw approvals get --node <id|name|ip>` 可以检查请求的策略、
主机策略来源以及最终的生效结果。

如果配套应用 UI **不可用**，任何需要提示的请求都会由
**ask 回退**来处理（默认：deny）。

原生聊天审批客户端还可以在待处理审批消息上暴露特定渠道的交互能力。
例如，Matrix 可以在审批提示上预置表情快捷方式
（`✅` 允许一次、`❌` 拒绝，以及在可用时 `♾️` 始终允许），
同时仍在消息中保留 `/approve ...` 命令作为回退方式。

## 适用范围

Exec 审批会在执行主机本地强制执行：

- **gateway 主机** → gateway 机器上的 `openclaw` 进程
- **node 主机** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 通过 Gateway 网关认证的调用方被视为该 Gateway 网关的受信任操作员。
- 已配对的节点会将这种受信任操作员能力扩展到节点主机。
- Exec 审批会降低误执行风险，但它不是按用户划分的认证边界。
- 已批准的 node-host 运行会绑定规范执行上下文：规范 cwd、精确 argv、存在时的 env 绑定，以及在适用时固定的可执行文件路径。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 还会尝试绑定
  一个具体的本地文件操作数。如果该绑定文件在批准后、执行前发生变化，
  运行会被拒绝，而不是执行已漂移的内容。
- 这种文件绑定有意保持为尽力而为，并不是对所有
  解释器/运行时加载路径的完整语义模型。如果审批模式无法识别出
  恰好一个可绑定的具体本地文件，它会拒绝签发基于审批的运行，
  而不是假装提供了完整覆盖。

macOS 拆分：

- **node host 服务** 会通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用** 负责强制执行审批并在 UI 上下文中执行命令。

## 设置与存储

审批信息保存在执行主机上的本地 JSON 文件中：

`~/.openclaw/exec-approvals.json`

示例结构：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 无审批的 “YOLO” 模式

如果你希望主机 exec 在没有审批提示的情况下运行，你必须同时放开**两层**策略：

- OpenClaw 配置中的请求 exec 策略（`tools.exec.*`）
- `~/.openclaw/exec-approvals.json` 中主机本地的审批策略

这现在是默认的主机行为，除非你显式收紧：

- `tools.exec.security`：在 `gateway`/`node` 上为 `full`
- `tools.exec.ask`：`off`
- 主机 `askFallback`：`full`

重要区别：

- `tools.exec.host=auto` 决定 exec 在哪里运行：有沙箱时在沙箱中，否则在 gateway。
- YOLO 决定主机 exec 如何获批：`security=full` 加 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不会在已配置的主机 exec 策略之上，再额外加入单独的启发式命令混淆审批关卡。
- `auto` 不会让来自沙箱隔离会话的 gateway 路由变成一种可自由覆盖的能力。来自 `auto` 的单次调用 `host=node` 请求是允许的，而只有在没有激活沙箱运行时时，来自 `auto` 的 `host=gateway` 才允许。如果你需要稳定的非 auto 默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

如果你希望采用更保守的设置，可以将任一层重新收紧到 `allowlist` / `on-miss`
或 `deny`。

持久化的 gateway 主机“永不提示”设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

然后将主机审批文件设置为匹配：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

对于 node 主机，请改为在该节点上应用相同的审批文件：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

仅会话快捷方式：

- `/exec security=full ask=off` 只会更改当前会话。
- `/elevated full` 是一种紧急放行快捷方式，同时也会为该会话跳过 exec 审批。

如果主机审批文件仍然比配置更严格，那么更严格的主机策略仍然会生效。

## 策略控制项

### 安全性（`exec.security`）

- **deny**：阻止所有主机 exec 请求。
- **allowlist**：只允许允许列表中的命令。
- **full**：允许一切（等同于提权）。

### 提示（`exec.ask`）

- **off**：从不提示。
- **on-miss**：仅当允许列表未命中时提示。
- **always**：每条命令都提示。
- 当生效的 ask 模式是 `always` 时，`allow-always` 持久信任不会抑制提示

### 提示回退（`askFallback`）

如果需要提示但没有可达的 UI，则由回退策略决定：

- **deny**：阻止。
- **allowlist**：仅当允许列表命中时允许。
- **full**：允许。

### 内联解释器 eval 加固（`tools.exec.strictInlineEval`）

当 `tools.exec.strictInlineEval=true` 时，OpenClaw 会将内联代码 eval 形式
视为仅能通过审批运行，即使解释器二进制本身已经在允许列表中。

示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

这是针对那些无法干净映射到单一稳定文件操作数的解释器加载路径所做的纵深防御。在严格模式下：

- 这些命令仍然需要显式审批；
- `allow-always` 不会自动为它们持久化新的允许列表条目。

## 允许列表（按智能体）

允许列表是**按智能体**划分的。如果存在多个智能体，请在 macOS 应用中切换你要编辑的智能体。
模式采用**大小写不敏感的 glob 匹配**。
模式应解析为**二进制路径**（仅文件名条目会被忽略）。
旧版的 `agents.default` 条目会在加载时迁移到 `agents.main`。
诸如 `echo ok && pwd` 这样的 shell 链式命令，仍然要求每个顶层片段都满足允许列表规则。

示例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目会跟踪：

- **id**：用于 UI 身份识别的稳定 UUID（可选）
- **last used**：上次使用时间戳
- **last used command**：上次使用的命令
- **last resolved path**：上次解析到的路径

## 自动允许 Skill CLI

启用 **Auto-allow skill CLIs** 后，已知 Skills 引用的可执行文件
会在节点（macOS 节点或无头节点主机）上被视为已进入允许列表。
这是通过 Gateway RPC 上的 `skills.bins` 获取 skill bin 列表实现的。
如果你想使用严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式的便捷允许列表**，与手动路径允许列表条目分离。
- 它适用于 Gateway 网关与节点处于同一信任边界内的受信任操作员环境。
- 如果你需要严格的显式信任，请保持 `autoAllowSkills: false`，并仅使用手动路径允许列表条目。

## Safe bins（仅 stdin）

`tools.exec.safeBins` 定义了一小组**仅 stdin** 的二进制文件（例如 `cut`），
它们可以在 allowlist 模式下**无需**显式允许列表条目运行。Safe bins 会拒绝
位置文件参数和类似路径的 token，因此它们只能处理输入流。
请将其视为面向流过滤器的一条狭窄快速通道，而不是通用信任列表。
**不要**将解释器或运行时二进制（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）
添加到 `safeBins` 中。
如果某个命令按设计可以执行代码、执行子命令或读取文件，请优先使用显式允许列表条目，并保持审批提示开启。
自定义 safe bin 必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式 profile。
校验仅依据 argv 形状进行确定性处理（不检查主机文件系统中是否存在），
这可以防止因允许/拒绝差异而形成文件存在性预言机行为。
对于默认 safe bins，面向文件的选项会被拒绝（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
Safe bins 还会对那些会破坏仅 stdin 行为的选项实施显式的按二进制文件划分的 flag 策略
（例如 `sort -o/--output/--compress-program` 和 grep 递归 flag）。
在 safe-bin 模式下，长选项会以默认拒绝方式校验：未知 flag 和有歧义的缩写都会被拒绝。
按 safe-bin profile 拒绝的 flag：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins 还会强制在执行时将 argv token 视为**字面文本**
（不进行 glob 展开，也不进行 `$VARS` 展开）用于仅 stdin 片段，
这样像 `*` 或 `$HOME/...` 这样的模式就不能被用来偷偷读取文件。
Safe bins 还必须从受信任的二进制目录中解析出来（系统默认目录加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会被自动信任。
默认受信任的 safe-bin 目录被有意保持得很小：`/bin`、`/usr/bin`。
如果你的 safe-bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），
请将它们显式添加到 `tools.exec.safeBinTrustedDirs`。
在 allowlist 模式下，shell 链式命令和重定向不会被自动允许。

当每个顶层片段都满足 allowlist
（包括 safe bins 或 skill 自动允许）时，shell 链式命令（`&&`、`||`、`;`）是允许的。
在 allowlist 模式下，重定向仍不受支持。
命令替换（`$()` / 反引号）会在 allowlist 解析阶段被拒绝，即使它位于双引号内；如果你需要字面量 `$()` 文本，请使用单引号。
在 macOS 配套应用审批中，包含 shell 控制或展开语法
（`&&`、`||`、`;`、`|`、`` ` ``、`$`、`<`、`>`、`(`、`)`）的原始 shell 文本会被视为 allowlist 未命中，
除非 shell 二进制本身已在允许列表中。
对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的 env 覆盖会被缩减为一个小型显式允许列表
（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于 allowlist 模式下的 allow-always 决策，已知的分发包装器
（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，而不是包装器路径。
shell 多路复用器（`busybox`、`toybox`）在处理 shell applet（`sh`、`ash` 等）时也会被拆包，
从而持久化内部可执行文件而不是多路复用器二进制本身。如果某个包装器或
多路复用器无法被安全拆包，则不会自动持久化任何允许列表条目。
如果你将 `python3` 或 `node` 这类解释器加入允许列表，建议启用 `tools.exec.strictInlineEval=true`，这样内联 eval 仍然需要显式审批。
在严格模式下，`allow-always` 仍然可以持久化无害的解释器/脚本调用，
但内联 eval 载体不会被自动持久化。

默认 safe bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果你选择启用它们，请为其
非 stdin 工作流保留显式允许列表条目。
在 safe-bin 模式下使用 `grep` 时，请使用 `-e`/`--regexp` 提供模式；
位置模式形式会被拒绝，这样就无法把文件操作数伪装成有歧义的位置参数。

### Safe bins 与 allowlist 的区别

| 主题 | `tools.exec.safeBins` | Allowlist（`exec-approvals.json`） |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 目标 | 自动允许狭义的 stdin 过滤器 | 显式信任特定可执行文件 |
| 匹配类型 | 可执行文件名 + safe-bin argv 策略 | 已解析可执行文件路径 glob 模式 |
| 参数范围 | 受 safe-bin profile 和字面 token 规则限制 | 仅路径匹配；参数其余部分由你自行负责 |
| 典型示例 | `head`, `tail`, `tr`, `wc` | `jq`, `python3`, `node`, `ffmpeg`, 自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换 | 任何具有更广泛行为或副作用的工具 |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或按智能体配置的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或按智能体配置的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或按智能体配置的 `agents.list[].tools.exec.safeBinProfiles`）。按智能体的 profile 键会覆盖全局键。
- allowlist 条目保存在主机本地 `~/.openclaw/exec-approvals.json` 的 `agents.<id>.allowlist` 下（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制出现在 `safeBins` 中但没有显式 profile 时，`openclaw security audit` 会给出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以为缺失的自定义 `safeBinProfiles.<bin>` 条目生成 `{}` 骨架（之后请审查并收紧）。解释器/运行时二进制不会被自动生成骨架。

自定义 profile 示例：
__OC_I18N_900004__
如果你显式将 `jq` 加入 `safeBins`，OpenClaw 在 safe-bin
模式下仍会拒绝 `env` 内置值，因此 `jq -n env` 无法在没有显式允许列表路径
或审批提示的情况下导出主机进程环境。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、按智能体
覆盖项以及允许列表。选择一个范围（Defaults 或某个智能体），调整策略，
添加/删除允许列表模式，然后点击**保存**。UI 会显示每个模式的 **last used** 元数据，
便于你保持列表整洁。

目标选择器可选择 **Gateway**（本地审批）或 **Node**。节点
必须声明 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
如果某个节点尚未声明 exec approvals，请直接编辑其本地
`~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持编辑 gateway 或 node（参见 [Approvals CLI](/cli/approvals)）。

## 审批流程

当需要提示时，gateway 会向操作员客户端广播 `exec.approval.requested`。
Control UI 和 macOS 应用通过 `exec.approval.resolve` 处理它，然后 gateway 再将
已批准的请求转发给 node host。

对于 `host=node`，审批请求会包含规范化的 `systemRunPlan` 载荷。gateway 会在转发已批准的 `system.run`
请求时，将该计划用作权威的命令/cwd/会话上下文。

这对于异步审批延迟非常重要：

- node exec 路径会预先准备一个规范化计划
- 审批记录会存储该计划及其绑定元数据
- 一旦获批，最终转发的 `system.run` 调用会复用这个已存储计划
  而不是信任后续调用方的修改
- 如果调用方在审批请求创建后修改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，gateway 会将转发运行拒绝为审批不匹配

## 解释器/运行时命令

基于审批的解释器/运行时执行会有意保持保守：

- 始终绑定精确的 argv/cwd/env 上下文。
- 直接 shell 脚本与直接运行时文件形式会尽力绑定到一个具体本地文件快照。
- 对于仍然能解析为单一直连本地文件的常见包管理器包装形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`），会在绑定前先拆包。
- 如果 OpenClaw 无法为某个解释器/运行时命令识别出恰好一个具体本地文件
  （例如包脚本、eval 形式、运行时特定加载链或含糊的多文件形式），
  那么基于审批的执行会被拒绝，而不是声称它覆盖了自己并未真正覆盖的语义。
- 对于这些工作流，建议优先使用沙箱隔离、单独的主机边界，
  或让操作员接受更广泛运行时语义的显式受信任 allowlist/full 工作流。

当需要审批时，exec 工具会立即返回一个审批 id。使用该 id 可以关联后续系统事件
（`Exec finished` / `Exec denied`）。如果在超时前没有收到决策，
该请求会被视为审批超时，并作为拒绝原因呈现。

### 后续消息投递行为

在一个已批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个后续 `agent` 轮次。

- 如果存在有效的外部投递目标（可投递渠道加目标 `to`），后续投递会使用该渠道。
- 在仅 webchat 或内部会话流中，如果没有外部目标，后续投递会保持为仅会话（`deliver: false`）。
- 如果调用方显式要求严格外部投递，但又无法解析出外部渠道，请求将以 `INVALID_REQUEST` 失败。
- 如果启用了 `bestEffortDeliver` 且无法解析外部渠道，投递会降级为仅会话，而不是失败。

确认对话框包含：

- command + args
- cwd
- agent id
- 已解析的可执行文件路径
- host + policy 元数据

操作项：

- **Allow once** → 立即运行
- **Always allow** → 加入允许列表并运行
- **Deny** → 阻止

## 将审批转发到聊天渠道

你可以将 exec 审批提示转发到任何聊天渠道（包括插件渠道），并通过 `/approve` 进行审批。
这使用的是正常的出站投递管道。

配置：
__OC_I18N_900005__
在聊天中回复：
__OC_I18N_900006__
`/approve` 命令同时处理 exec 审批和插件审批。如果该 ID 未匹配到待处理的 exec 审批，
它会自动继续检查插件审批。

### 插件审批转发

插件审批转发与 exec 审批使用同一投递管道，但它在 `approvals.plugin` 下有自己
独立的配置。启用或禁用其中一个，不会影响另一个。
__OC_I18N_900007__
该配置结构与 `approvals.exec` 完全相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式一致。

支持共享交互式回复的渠道，会为 exec 和插件审批渲染相同的审批按钮。
不支持共享交互式 UI 的渠道，则会回退为包含 `/approve`
说明的纯文本。

### 任意渠道中的同聊天审批

当 exec 或插件审批请求源自一个可投递的聊天界面时，同一聊天
现在默认也可以通过 `/approve` 直接审批。
这适用于 Slack、Matrix 和 Microsoft Teams 等渠道，
以及现有的 Web UI 和终端 UI 流程。

这种共享的文本命令路径使用该会话对应渠道的正常认证模型。
如果发起审批请求的聊天本来就能发送命令并接收回复，那么审批请求
就不再需要额外的原生投递适配器来维持待处理状态。

Discord 和 Telegram 也支持同聊天 `/approve`，但即使禁用了原生审批投递，
这些渠道在授权时仍会使用它们解析出的 approver 列表。

对于 Telegram 和其他会直接调用 Gateway 网关的原生审批客户端，
这种回退有意仅限于“找不到审批”失败。真正的
exec 审批拒绝/错误不会被静默重试为插件审批。

### 原生审批投递

某些渠道也可以充当原生审批客户端。原生客户端会在共享的同聊天 `/approve`
流程之上，增加 approver 私信、原始聊天扇出以及渠道特定的交互式审批 UX。

当原生审批卡片/按钮可用时，该原生 UI 就是主要的
智能体面向路径。除非工具结果说明聊天审批不可用或手动审批
是唯一剩余路径，否则智能体不应再重复回显一条普通聊天
`/approve` 命令。

通用模型：

- 是否需要 exec 审批，仍由主机 exec 策略决定
- `approvals.exec` 控制是否将审批提示转发到其他聊天目标
- `channels.<channel>.execApprovals` 控制该渠道是否充当原生审批客户端

当满足以下所有条件时，原生审批客户端会自动启用优先私信投递：

- 该渠道支持原生审批投递
- 可以从显式的 `execApprovals.approvers` 或该
  渠道文档规定的回退来源中解析出 approver
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 可显式禁用原生审批客户端。设置 `enabled: true` 可在 approver 可解析时强制启用。
公开的原始聊天投递仍通过 `channels.<channel>.execApprovals.target` 显式控制。

常见问题：[为什么聊天审批有两套 exec 审批配置？](/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些原生审批客户端会在共享的同聊天 `/approve` 流程和共享审批按钮之上，
增加私信路由和可选的渠道扇出。

共享行为：

- Slack、Matrix、Microsoft Teams 以及类似的可投递聊天界面，会对同聊天 `/approve` 使用正常的渠道认证模型
- 当原生审批客户端自动启用时，默认原生投递目标是 approver 私信
- 对于 Discord 和 Telegram，只有解析出的 approver 才能批准或拒绝
- Discord approver 可以显式设置（`execApprovals.approvers`），也可以从 `commands.ownerAllowFrom` 推断
- Telegram approver 可以显式设置（`execApprovals.approvers`），也可以从现有 owner 配置推断（`allowFrom`，以及在支持时的私信 `defaultTo`）
- Slack approver 可以显式设置（`execApprovals.approvers`），也可以从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮会保留审批 id 类型，因此 `plugin:` 类型的 id 可以解析到插件审批，而无需第二层 Slack 本地回退
- Matrix 原生私信/频道路由和表情快捷方式同时处理 exec 与插件审批；插件授权仍来自 `channels.matrix.dm.allowFrom`
- 请求者本身不需要是 approver
- 当原始聊天本来就支持命令和回复时，它可以直接通过 `/approve` 批准
- 原生 Discord 审批按钮会按审批 id 类型路由：`plugin:` 类型的 id 会
  直接进入插件审批，其余所有类型都会进入 exec 审批
- 原生 Telegram 审批按钮遵循与 `/approve` 相同的有界 exec 到插件回退
- 当原生 `target` 启用原始聊天投递时，审批提示中会包含命令文本
- 待处理的 exec 审批默认会在 30 分钟后过期
- 如果没有任何操作员 UI 或已配置的审批客户端可以接受该请求，提示会回退到 `askFallback`

Telegram 默认使用 approver 私信（`target: "dm"`）。如果你希望审批提示也出现在
发起请求的 Telegram 聊天/话题中，可以切换为 `channel` 或 `both`。
对于 Telegram 论坛话题，OpenClaw 会为审批提示和审批后续消息保留该话题。

参见：

- [Discord](/channels/discord)
- [Telegram](/channels/telegram)

### macOS IPC 流程
__OC_I18N_900008__
安全说明：

- Unix socket 权限模式 `0600`，token 存储在 `exec-approvals.json` 中。
- 同 UID 对等方检查。
- 质询/响应（nonce + HMAC token + request hash）+ 短 TTL。

## 系统事件

Exec 生命周期会以系统消息形式呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些消息会在节点上报事件后发布到智能体会话中。
Gateway 主机 exec 审批在命令结束时（以及可选地，当运行时间超过阈值时）也会发出相同的生命周期事件。
受审批控制的 exec 会复用审批 id 作为这些消息中的 `runId`，便于关联。

## 审批被拒绝时的行为

当异步 exec 审批被拒绝时，OpenClaw 会阻止智能体复用
该会话中此前相同命令的任何更早运行输出。拒绝原因
会附带明确说明，指出没有可用的命令输出，从而阻止
智能体声称存在新的输出，或者用先前成功运行留下的旧结果
来重复描述这次被拒绝的命令。

## 影响

- **full** 能力很强；如有可能，优先使用 allowlist。
- **ask** 可以让你保持在审批链路中，同时仍支持快速批准。
- 按智能体划分的允许列表可防止某个智能体的审批泄漏到其他智能体。
- 审批只适用于来自**已授权发送者**的主机 exec 请求。未授权发送者不能发出 `/exec`。
- `/exec security=full` 是面向已授权操作员的会话级便捷方式，并且按设计会跳过审批。
  如果你想硬性阻止主机 exec，请将审批安全性设为 `deny`，或通过工具策略拒绝 `exec` 工具。

相关内容：

- [Exec tool](/zh-CN/tools/exec)
- [提权模式](/zh-CN/tools/elevated)
- [Skills](/zh-CN/tools/skills)

## 相关内容

- [Exec](/zh-CN/tools/exec) — Shell 命令执行工具
- [沙箱隔离](/zh-CN/gateway/sandboxing) — 沙箱模式与工作区访问
- [安全](/zh-CN/gateway/security) — 安全模型与加固
- [Sandbox vs Tool Policy vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated) — 何时使用各自方案
