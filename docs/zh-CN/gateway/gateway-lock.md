---
read_when:
    - 运行或调试 Gateway 网关进程
    - 排查单实例强制机制
summary: 使用 WebSocket 监听器绑定实现的 Gateway 网关单实例保护
title: Gateway 网关锁
x-i18n:
    generated_at: "2026-04-08T04:26:01Z"
    model: gpt-5.4
    provider: openai
    source_hash: 726c687ab53f2dd1e46afed8fc791b55310a5c1e62f79a0e38a7dc4ca7576093
    source_path: gateway\gateway-lock.md
    workflow: 15
---

# Gateway 网关锁

## 原因

- 确保同一主机上、每个基础端口只运行一个 Gateway 网关实例；额外的 Gateway 网关必须使用隔离的 profile 和唯一端口。
- 在崩溃或 `SIGKILL` 后仍然有效，不会留下陈旧的锁文件。
- 当控制端口已被占用时，以清晰的错误快速失败。

## 机制

- Gateway 网关在启动时会立即绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`），使用独占的 TCP 监听器。
- 如果绑定因 `EADDRINUSE` 失败，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 操作系统会在任何进程退出时自动释放监听器，包括崩溃和 `SIGKILL`——不需要单独的锁文件或清理步骤。
- 关闭时，Gateway 网关会关闭 WebSocket 服务器和底层 HTTP 服务器，以便及时释放端口。

## 错误表现

- 如果端口被其他进程占用，启动会抛出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他绑定失败会表现为 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 运维说明

- 如果端口被_其他_进程占用，错误也是一样；请释放该端口，或使用 `openclaw gateway --port <port>` 选择其他端口。
- macOS 应用在启动 Gateway 网关前仍会维护它自己的轻量级 PID 守护；运行时锁则由 WebSocket 绑定强制执行。

## 相关内容

- [多个 Gateway 网关](/zh-CN/gateway/multiple-gateways) — 使用唯一端口运行多个实例
- [故障排除](/zh-CN/gateway/troubleshooting) — 诊断 `EADDRINUSE` 和端口冲突
