---
read_when:
    - 你正在将合成 QA 传输接入本地或 CI 测试运行
    - 你需要内置 qa-channel 的配置接口
    - 你正在迭代端到端 QA 自动化
summary: 用于确定性 OpenClaw QA 场景的合成 Slack 类渠道插件
title: QA 渠道
x-i18n:
    generated_at: "2026-04-08T03:45:25Z"
    model: gpt-5.4
    provider: openai
    source_hash: 65c2c908d3ec27c827087616c4ea278f10686810091058321ff26f68296a1782
    source_path: channels\qa-channel.md
    workflow: 15
---

# QA 渠道

`qa-channel` 是一个内置的合成消息传输层，用于自动化 OpenClaw QA。

它不是生产渠道。它的存在是为了在保持状态可预测且完全可检查的前提下，演练真实传输层所使用的同一渠道插件边界。

## 当前功能

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 基于 HTTP 的合成总线，用于：
  - 注入入站消息
  - 捕获出站消息记录
  - 创建线程
  - 表情回应
  - 编辑
  - 删除
  - 搜索与读取操作
- 内置的主机侧自检运行器，可写出 Markdown 报告

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

支持的账户键：

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## 运行器

当前纵向切片：

```bash
pnpm qa:e2e
```

现在它会通过内置的 `qa-lab` 扩展进行路由。它会启动仓库内的
QA 总线，启动内置的 `qa-channel` 运行时切片，执行确定性的
自检，并将 Markdown 报告写入 `.artifacts/qa-e2e/`。

私有调试器 UI：

```bash
pnpm qa:lab:up
```

这一条命令会构建 QA 站点、启动基于 Docker 的 Gateway 网关 + QA Lab
栈，并输出 QA Lab URL。在该站点中，你可以选择场景、选择模型通道、
发起单次运行，并实时查看结果。

完整的仓库支撑 QA 套件：

```bash
pnpm openclaw qa suite
```

这会在本地 URL 启动私有 QA 调试器，与随发行提供的 Control UI
bundle 分开。

## 范围

当前范围有意保持精简：

- 总线 + 插件传输层
- 线程化路由语法
- 渠道拥有的消息操作
- Markdown 报告
- 带运行控制的基于 Docker 的 QA 站点

后续工作将添加：

- 提供商/模型矩阵执行
- 更丰富的场景发现
- 后续加入 OpenClaw 原生编排
