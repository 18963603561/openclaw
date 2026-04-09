---
read_when:
    - 添加或修改后台 exec 行为
    - 调试长时间运行的 exec 任务
summary: 后台 exec 执行与进程管理
title: 后台 Exec 与 Process 工具
x-i18n:
    generated_at: "2026-04-08T04:07:38Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4398e2850f6f050944f103ad637cd9f578e9cc7fb478bc5cd5d972c92289b831
    source_path: gateway\background-process.md
    workflow: 15
---

# 后台 Exec 与 Process 工具

OpenClaw 通过 `exec` 工具运行 shell 命令，并将长时间运行的任务保存在内存中。`process` 工具用于管理这些后台会话。

## exec 工具

关键参数：

- `command`（必填）
- `yieldMs`（默认 10000）：超过该延迟后自动转入后台
- `background`（bool）：立即在后台运行
- `timeout`（秒，默认 1800）：超过该超时时间后终止进程
- `elevated`（bool）：如果已启用/允许 elevated 模式，则在沙箱外运行（默认为 `gateway`，或者当 exec 目标是 `node` 时为 `node`）
- 需要真实 TTY？设置 `pty: true`。
- `workdir`、`env`

行为：

- 前台运行会直接返回输出。
- 当转入后台时（显式指定或因超时），工具会返回 `status: "running"` + `sessionId`，以及一小段尾部输出。
- 输出会一直保存在内存中，直到该会话被轮询或清除。
- 如果 `process` 工具被禁用，`exec` 会同步运行，并忽略 `yieldMs`/`background`。
- 启动的 exec 命令会接收 `OPENCLAW_SHELL=exec`，用于感知上下文的 shell/profile 规则。
- 对于从现在开始的长时间运行任务，只需启动一次，并在启用了自动完成唤醒时，依赖命令产生输出或失败后的自动完成唤醒。
- 如果自动完成唤醒不可用，或者你需要为一个无输出但正常退出的命令确认静默成功，请使用 `process` 确认完成状态。
- 不要用 `sleep` 循环或反复轮询来模拟提醒或延迟后续操作；未来任务请使用 cron。

## 子进程桥接

当在 exec/process 工具之外生成长时间运行的子进程时（例如 CLI 重启生成的进程或 gateway 辅助进程），请挂接子进程桥接辅助工具，以便转发终止信号，并在退出/报错时移除监听器。这样可以避免在 systemd 下留下孤儿进程，并保持各平台上的关闭行为一致。

环境变量覆盖：

- `PI_BASH_YIELD_MS`：默认 yield 时间（ms）
- `PI_BASH_MAX_OUTPUT_CHARS`：内存中输出上限（字符数）
- `OPENCLAW_BASH_PENDING_MAX_OUTPUT_CHARS`：每个流待处理 stdout/stderr 的上限（字符数）
- `PI_BASH_JOB_TTL_MS`：已结束会话的 TTL（ms，限制在 1 分钟到 3 小时之间）

配置（推荐）：

- `tools.exec.backgroundMs`（默认 10000）
- `tools.exec.timeoutSec`（默认 1800）
- `tools.exec.cleanupMs`（默认 1800000）
- `tools.exec.notifyOnExit`（默认 true）：当后台 exec 退出时，排入一个系统事件并请求 heartbeat。
- `tools.exec.notifyOnExitEmptySuccess`（默认 false）：如果为 true，也会为无输出但成功完成的后台运行排入完成事件。

## process 工具

操作：

- `list`：运行中 + 已结束的会话
- `poll`：提取某个会话的新输出（同时报告退出状态）
- `log`：读取聚合输出（支持 `offset` + `limit`）
- `write`：发送 stdin（`data`，可选 `eof`）
- `send-keys`：向 PTY 支持的会话发送显式按键 token 或字节
- `submit`：向 PTY 支持的会话发送 Enter / 回车
- `paste`：发送字面文本，可选用 bracketed paste mode 包裹
- `kill`：终止后台会话
- `clear`：从内存中移除已结束会话
- `remove`：如果仍在运行则终止，否则如果已结束则清除

说明：

- 只有后台会话会被列出并保存在内存中。
- 进程重启后会话会丢失（不会持久化到磁盘）。
- 只有当你运行 `process poll/log` 并记录工具结果时，会话日志才会保存到聊天历史中。
- `process` 的作用域按智能体隔离；它只能看到由该智能体启动的会话。
- 当你需要状态、日志、静默成功确认，或在自动完成唤醒不可用时确认完成状态，请使用 `poll` / `log`。
- 当你需要输入或人工干预时，请使用 `write` / `send-keys` / `submit` / `paste` / `kill`。
- `process list` 包含一个派生的 `name`（命令动词 + 目标），便于快速浏览。
- `process log` 使用基于行的 `offset`/`limit`。
- 当 `offset` 和 `limit` 都省略时，它会返回最后 200 行，并包含分页提示。
- 当提供了 `offset` 而省略 `limit` 时，它会返回从 `offset` 到结尾的内容（不会限制为 200 行）。
- 轮询用于按需查看状态，而不是用于等待循环调度。如果工作应在稍后发生，请改用 cron。

## 示例

运行一个长任务，稍后再轮询：

```json
{ "tool": "exec", "command": "sleep 5 && echo done", "yieldMs": 1000 }
```

```json
{ "tool": "process", "action": "poll", "sessionId": "<id>" }
```

立即在后台启动：

```json
{ "tool": "exec", "command": "npm run build", "background": true }
```

发送 stdin：

```json
{ "tool": "process", "action": "write", "sessionId": "<id>", "data": "y\n" }
```

发送 PTY 按键：

```json
{ "tool": "process", "action": "send-keys", "sessionId": "<id>", "keys": ["C-c"] }
```

提交当前行：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴字面文本：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```
