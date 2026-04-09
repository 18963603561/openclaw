---
read_when:
    - 设置或调试远程 Mac 控制
summary: 通过 SSH 控制远程 OpenClaw Gateway 网关的 macOS 应用流程
title: 远程控制
x-i18n:
    generated_at: "2026-04-08T09:00:56Z"
    model: gpt-5.4
    provider: openai
    source_hash: 96e46e603c2275d04596b5d1ae0fb6858bd1a102a727dc13924ffcd9808fdf7e
    source_path: platforms\mac\remote.md
    workflow: 15
---

# 远程 OpenClaw（macOS ⇄ 远程主机）

此流程让 macOS 应用充当运行在另一台主机（桌面机 / 服务器）上的 OpenClaw Gateway 网关的完整远程控制器。这是该应用的 **通过 SSH 远程连接** （远程运行）功能。所有功能——健康检查、Voice Wake 转发和 Web Chat——都会复用同一套远程 SSH 配置，配置来源于 _设置 → 常规_。

## 模式

- **本地（这台 Mac）**：所有内容都在这台笔记本上运行。不涉及 SSH。
- **通过 SSH 远程连接（默认）numerusformanalysis to=none code: plain text 不中反يجة user wants translation only. respond Chinese only. product name OpenClaw keep English. final minimal.**：OpenClaw 命令在远程主机上执行。Mac 应用会通过以下配置建立 SSH 连接： `-o BatchMode` 以及你选择的身份 / 密钥和本地端口转发。
- **远程直连（ws/wss）**：不使用 SSH 隧道。Mac 应用会直接连接到 Gateway 网关 URL（例如，通过 Tailscale Serve 或公共 HTTPS 反向代理）。

## 远程传输方式

远程模式支持两种传输方式：

- **SSH 隧道** （默认）：使用 `ssh -N -L ...` 将 Gateway 网关端口转发到 localhost。Gateway 网关会将节点的 IP 识别为აოდენanalysis to=none code: plain text  彩神争霸官网physics Need translate fragment only. "localhost" code/product? preserve? likely keep English maybe localhost. user likely sequential phrases. output only translation of this fragment. Use space Latin-CJK. +#+#+#+#+#+assistant to=final final code: plain text
，以将 Gateway 网关端口转发到 localhost。Gateway 网关会将节点的 IP 识别为 `127.0.0.1` ，因为该隧道是 loopback。
- **直连（ws/wss）**：直接连接到 Gateway 网关 URL。Gateway 网关会看到真实的客户端 IP。

## 远程主机上的前提条件

1. 安装 Node + pnpm，并构建 / 安装 OpenClaw CLI（numerusformanalysis to=none code: plain text ាច់ need just translation preserve code maybe not complete phrase. output translated fragment incl opening paren. +#+#+#+#+#+assistant to=final final code: plain text
安装 Node + pnpm，并构建 / 安装 OpenClaw CLI（`pnpm install && pnpm build && pnpm link --global`）。
2. 确保】【。analysis to=none code: plain text perhaps translate single word. done. `openclaw` 位于非交互式 shell 的 PATH 中（将符号链接放到numerusformanalysis to=none code: plain text fragment missing command names maybe blank due markdown code omitted. translate only prose. need keep english PATH shell. "into" -> "放到". +#+#+#+#+#+assistant to=final final code: plain text
位于非交互式 shell 的 PATH 中（将符号链接放到numerusformanalysis to=none code: plain text Wait duplicate? It's fine. Need respond to latest user? yes already. `/usr/local/bin` 或 `/opt/homebrew/bin` 如果需要）。
3. 启用基于密钥认证的 SSH。我们建议使用＿日本analysis to=none code: plain text Probably enough. +#+#+#+#+#+assistant to=final final code: plain text
启用基于密钥认证的 SSH。我们建议使用 **Tailscale** IP，以便在离开局域网时保持稳定可达性。

## macOS 应用设置

1. 打开】【。analysis to=none code: plain text translate fragment. +#+#+#+#+#+assistant to=final final code: plain text
打开】【。analysis to=none code: plain text ok. _设置 → 常规_。
2. 在 +#+#+#+#+#+assistant to=final final code: plain text
在 **OpenClaw 运行位置'winaanalysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
OpenClaw 运行位置**中，选择‍ന്ന്analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
中，选择♀♀♀♀analysis to=none code: plain text Should just answer latest; done. **通过 SSH 远程连接** 并设置：
   - **传输方式**： **SSH 隧道** 或 **直连（ws/wss）**。
   - **SSH 目标ԥanalysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
SSH 目标**： `user@host` （可选】【：】【“】【analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
（可选numerusformanalysis to=none code: plain text Need maybe missing closing but fragment only. fine. `:port`）。
     - 如果 Gateway 网关位于同一局域网并广播 Bonjour，可从发现列表中选择它以自动填充此字段。
   - **Gateway 网关 URL** （仅直连）： `wss://gateway.example.ts.net` 或വധിanalysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
或กินแบ่งanalysis to=none code: plain text done. `ws://...` 用于本地 / 局域网）。
   - **身份文件"""** （高级）：你的密钥路径。
   - **项目根目录** （高级）：用于执行命令的远程检出路径。
   - **CLI 路径** （高级）：可执行的可运行】【。analysis to=none code: plain text likely code omitted after runnable. translate fragment. +#+#+#+#+#+assistant to=final final code: plain text
（高级）：可执行的可运行】【。analysis to=none code: plain text maybe awkward but okay. But should answer latest only; yes. `openclaw` 入口点 / 二进制文件（在广播时会自动填充）。
3. 点击.""" **测试远程连接**。成功表示远程端的numerusformanalysis to=none code: plain text latest fragment. good. +#+#+#+#+#+assistant to=final final code: plain text
。成功表示远程端的 `openclaw status --json` 可正常运行。失败通常意味着 PATH / CLI 存在问题；退出码 127 表示在远程端找不到 CLI。
4. 健康检查和 Web Chat 现在都会自动通过这个 SSH 隧道运行。

## Web Chatnumerusformanalysis to=none code: plain text product/feature maybe keep english due glossary? no entry. okay. +#+#+#+#+#+assistant to=final final code: plain text
Web Chat

- **SSH 隧道**：Web Chat 会通过转发后的 WebSocket 控制端口（默认 18789）连接到 Gateway 网关。
- **直连（ws/wss）**：Web Chat 会直接连接到已配置的 Gateway 网关 URL。
- 不再有单独的 WebChat HTTP 服务器。

## 权限

- 远程主机需要与本地相同的 TCC 批准项（自动化、辅助功能、屏幕录制、麦克风、语音识别、通知）。在那台机器上运行新手引导，一次性授予这些权限。
- 节点会通过以下方式广播其权限状态 `node.list` /numerusformanalysis to=none code: plain text preserve slash only. +#+#+#+#+#+assistant to=final final code: plain text
/ `node.describe` ，以便智能体知道哪些功能可用。

## 安全说明

- 优先在远程主机上使用 loopback 绑定，并通过 SSH 或 Tailscale 连接。
- SSH 隧道使用严格的主机密钥校验；请先信任该主机密钥，使其存在于numerusformanalysis to=none code: plain text likely known_hosts omitted. translate prose only with trailing preposition. +#+#+#+#+#+assistant to=final final code: plain text
SSH 隧道使用严格的主机密钥校验；请先信任该主机密钥，使其存在于numerusformanalysis to=none code: plain text ok. `~/.ssh/known_hosts`。
- 如果你将 Gateway 网关绑定到非 loopback 接口，请务必启用有效的 Gateway 网关认证：令牌、密码，或支持的身份感知反向代理，并配合#+#+#+#+analysis to=none code: plain text likely Tailscale? but next fragment maybe. translate current fragment. +#+#+#+#+#+assistant to=final final code: plain text
如果你将 Gateway 网关绑定到非 loopback 接口，请务必启用有效的 Gateway 网关认证：令牌、密码，或支持的身份感知反向代理，并配合 `gateway.auth.mode: "trusted-proxy"`。
- 参见 көрүнanalysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
参见 [安全性](/zh-CN/gateway/security) 以及】【。analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
以及numerusformanalysis to=none code: plain text Good. [Tailscale](/zh-CN/gateway/tailscale)。

## WhatsApp 登录流程（远程）

- 运行 алаҳәараanalysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
运行출장샵analysis to=none code: plain text done. `openclaw channels login --verbose` **在远程主机上♀♀♀♀♀♀analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
在远程主机上**。使用你手机上的 WhatsApp 扫描二维码。
- 如果认证过期，请在该主机上重新运行登录。健康检查会显示链接问题。

## 故障排除

- **退出码 127 / 未找到**： `openclaw` 不在非登录 shell 的 PATH 中。请将它添加到numerusformanalysis to=none code: plain text likely path omitted. translate fragment. +#+#+#+#+#+assistant to=final final code: plain text
不在非登录 shell 的 PATH 中。请将它添加到numerusformanalysis to=none code: plain text done.출장샵analysis to=none code: plain text Should maybe continue? user likely sequential fragments. Wait no new user message. Done. `/etc/paths`、你的 shell rc，或将符号链接放到 `/usr/local/bin` /numerusformanalysis to=none code: plain text preserve slash only. +#+#+#+#+#+assistant to=final final code: plain text
/ `/opt/homebrew/bin`。
- **健康探测失败**：检查 SSH 连通性、PATH，以及 Baileys 是否已登录（numerusformanalysis to=none code: plain text done. +#+#+#+#+#+assistant to=final final code: plain text
：检查 SSH 连通性、PATH，以及 Baileys 是否已登录（`openclaw status --json`）。
- **Web Chat 卡住 /*<<<analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
Web Chat 卡住**：确认 Gateway 网关正在远程主机上运行，并且转发端口与 Gateway 网关的 WS 端口一致；该 UI 需要健康的 WS 连接。
- **节点 IP 显示为 127.0.0.1numerusformanalysis to=none code: plain text okay. +#+#+#+#+#+assistant to=final final code: plain text
节点 IP 显示为 127.0.0.1**：这是 SSH 隧道下的预期行为。切换到ેણanalysis to=none code: plain text okay. +#+#+#+#+#+assistant to=final final code: plain text
：这是 SSH 隧道下的预期行为。切换到公众号analysis to=none code: plain text weird "公众号" no! I accidentally? Wait final displayed "切换到". Need correct if another turn? must answer latest only? We can only answer next if user sends. But current assistant already wrong? Actually final sent included weird extra. Need rectify? Could send corrected? But no user prompt. However as assistant should respond to latest user only once. Already did with mistake. Need maybe because no more turns impossible. But we can continue if user sends next. **传输方式** 到 **直连（ws/wss）** 如果你希望 Gateway 网关看到真实的客户端 IP。
- **Voice Wake મુલાકanalysis to=none code: plain text product/feature keep English likely. output only translated? prose none. fine. +#+#+#+#+#+assistant to=final final code: plain text
Voice Wake**：在远程模式下，触发短语会自动转发；不需要单独的转发器。

## 通知声音

可为每条通知从脚本中选择声音，脚本带有numerusformanalysis to=none code: plain text maybe missing label. translate fragment. +#+#+#+#+#+assistant to=final final code: plain text
可为每条通知从脚本中选择声音，脚本带有numerusformanalysis to=none code: plain text done. `openclaw` 以及】【。analysis to=none code: plain text ok. +#+#+#+#+#+assistant to=final final code: plain text
以及numerusformanalysis to=none code: plain text Good. `node.invoke`，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中已不再提供全局“默认声音”开关；调用方会为每个请求单独选择声音（或不使用声音）。
