---
read_when:
    - 你想从外部系统触发或驱动 TaskFlows
    - 你正在配置内置 webhooks 插件
summary: Webhooks 插件：为受信任的外部自动化提供带认证的 TaskFlow 入口
title: Webhooks 插件
x-i18n:
    generated_at: "2026-04-08T06:49:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: a5da12a887752ec6ee853cfdb912db0ae28512a0ffed06fe3828ef2eee15bc9d
    source_path: plugins\webhooks.md
    workflow: 15
---

# Webhooks（插件）

Webhooks 插件会添加带认证的 HTTP 路由，将外部自动化绑定到 OpenClaw TaskFlows。

当你希望使用受信任的系统（例如 Zapier、n8n、CI 任务或内部服务）来创建并驱动受管 TaskFlows，而又不想先编写自定义插件时，请使用它。

## 运行位置

Webhooks 插件运行在 Gateway 网关进程内部。

如果你的 Gateway 网关运行在另一台机器上，请在该 Gateway 网关主机上安装并配置此插件，然后重启 Gateway 网关。

## 配置路由

在 `plugins.entries.webhooks.config` 下设置配置：

```json5
{
  plugins: {
    entries: {
      webhooks: {
        enabled: true,
        config: {
          routes: {
            zapier: {
              path: "/plugins/webhooks/zapier",
              sessionKey: "agent:main:main",
              secret: {
                source: "env",
                provider: "default",
                id: "OPENCLAW_WEBHOOK_SECRET",
              },
              controllerId: "webhooks/zapier",
              description: "Zapier TaskFlow bridge",
            },
          },
        },
      },
    },
  },
}
```

路由字段：

- `enabled`：可选，默认为 `true`
- `path`：可选，默认为 `/plugins/webhooks/<routeId>`
- `sessionKey`：必填，拥有绑定 TaskFlows 的会话
- `secret`：必填，共享密钥或 SecretRef
- `controllerId`：可选，用于已创建受管 flow 的控制器 id
- `description`：可选，供运维者参考的说明

支持的 `secret` 输入：

- 纯字符串
- 带有 `source: "env" | "file" | "exec"` 的 SecretRef

如果某个基于 secret 的路由在启动时无法解析其 secret，插件会跳过该路由，并记录警告日志，而不是暴露一个损坏的端点。

## 安全模型

每条路由都被信任为可以使用其所配置 `sessionKey` 的 TaskFlow 权限执行操作。

这意味着该路由可以检查和修改属于该会话的 TaskFlows，因此你应该：

- 为每条路由使用强度高且唯一的 secret
- 优先使用 secret 引用，而不是内联明文 secret
- 将路由绑定到满足工作流需求的最小权限会话
- 仅暴露你需要的特定 webhook 路径

插件会应用：

- 共享密钥认证
- 请求体大小和超时保护
- 固定窗口限流
- 并发请求数限制
- 通过 `api.runtime.taskFlow.bindSession(...)` 实现基于 owner 绑定的 TaskFlow 访问

## 请求格式

发送 `POST` 请求时请使用：

- `Content-Type: application/json`
- `Authorization: Bearer <secret>` 或 `x-openclaw-webhook-secret: <secret>`

示例：

```bash
curl -X POST https://gateway.example.com/plugins/webhooks/zapier \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SHARED_SECRET' \
  -d '{"action":"create_flow","goal":"Review inbound queue"}'
```

## 支持的动作

该插件当前接受以下 JSON `action` 值：

- `create_flow`
- `get_flow`
- `list_flows`
- `find_latest_flow`
- `resolve_flow`
- `get_task_summary`
- `set_waiting`
- `resume_flow`
- `finish_flow`
- `fail_flow`
- `request_cancel`
- `cancel_flow`
- `run_task`

### `create_flow`

为路由绑定的会话创建一个受管 TaskFlow。

示例：

```json
{
  "action": "create_flow",
  "goal": "Review inbound queue",
  "status": "queued",
  "notifyPolicy": "done_only"
}
```

### `run_task`

在现有受管 TaskFlow 内创建一个受管子任务。

允许的运行时为：

- `subagent`
- `acp`

示例：

```json
{
  "action": "run_task",
  "flowId": "flow_123",
  "runtime": "acp",
  "childSessionKey": "agent:main:acp:worker",
  "task": "Inspect the next message batch"
}
```

## 响应结构

成功响应会返回：

```json
{
  "ok": true,
  "routeId": "zapier",
  "result": {}
}
```

被拒绝的请求会返回：

```json
{
  "ok": false,
  "routeId": "zapier",
  "code": "not_found",
  "error": "TaskFlow not found.",
  "result": {}
}
```

该插件会有意从 webhook 响应中清除 owner / 会话元数据。

## 相关文档

- [插件运行时 SDK](/zh-CN/plugins/sdk-runtime)
- [Hooks 和 webhooks 概览](/zh-CN/automation/hooks)
- [CLI webhooks](/cli/webhooks)
