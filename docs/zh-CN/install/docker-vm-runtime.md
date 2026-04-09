---
read_when:
    - 你正在使用 Docker 在云 VM 上部署 OpenClaw
    - 你需要共享的二进制预构建、持久化和更新流程
summary: 面向长期运行 OpenClaw Gateway 网关主机的共享 Docker VM 运行时步骤
title: Docker VM 运行时
x-i18n:
    generated_at: "2026-04-08T06:00:51Z"
    model: gpt-5.4
    provider: openai
    source_hash: 854403a48fe15a88cc9befb9bebe657f1a7c83f1df2ebe2346fac9a6e4b16992
    source_path: install\docker-vm-runtime.md
    workflow: 15
---

# Docker VM 运行时

适用于基于 VM 的 Docker 安装的共享运行时步骤，例如 GCP、Hetzner 以及类似的 VPS 提供商。

## 将所需二进制预构建到镜像中

在正在运行的容器内安装二进制是一个陷阱。
任何在运行时安装的内容都会在重启后丢失。

Skills 所需的所有外部二进制都必须在镜像构建时安装。

下面的示例仅展示三个常见二进制：

- 用于 Gmail 访问的 `gog`
- 用于 Google Places 的 `goplaces`
- 用于 WhatsApp 的 `wacli`

这些只是示例，并不是完整列表。
你可以使用相同模式安装任意多个所需的二进制。

如果你之后添加了依赖额外二进制的新 Skills，则必须：

1. 更新 Dockerfile
2. 重新构建镜像
3. 重启容器

**示例 Dockerfile**

```dockerfile
FROM node:24-bookworm

RUN apt-get update && apt-get install -y socat && rm -rf /var/lib/apt/lists/*

# Example binary 1: Gmail CLI
RUN curl -L https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/gog

# Example binary 2: Google Places CLI
RUN curl -L https://github.com/steipete/goplaces/releases/latest/download/goplaces_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/goplaces

# Example binary 3: WhatsApp CLI
RUN curl -L https://github.com/steipete/wacli/releases/latest/download/wacli_Linux_x86_64.tar.gz \
  | tar -xz -C /usr/local/bin && chmod +x /usr/local/bin/wacli

# Add more binaries below using the same pattern

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY scripts ./scripts

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

CMD ["node","dist/index.js"]
```

<Note>
上面的下载 URL 适用于 x86_64（amd64）。对于基于 ARM 的 VM（例如 Hetzner ARM、GCP Tau T2A），请将下载 URL 替换为各工具发布页中对应的 ARM64 变体。
</Note>

## 构建并启动

```bash
docker compose build
docker compose up -d openclaw-gateway
```

如果在 `pnpm install --frozen-lockfile` 期间构建失败，并出现 `Killed` 或 `exit code 137`，说明 VM 内存不足。
请先改用更大的机器规格，再重试。

验证二进制：

```bash
docker compose exec openclaw-gateway which gog
docker compose exec openclaw-gateway which goplaces
docker compose exec openclaw-gateway which wacli
```

预期输出：

```
/usr/local/bin/gog
/usr/local/bin/goplaces
/usr/local/bin/wacli
```

验证 Gateway 网关：

```bash
docker compose logs -f openclaw-gateway
```

预期输出：

```
[gateway] listening on ws://0.0.0.0:18789
```

## 各项内容持久化在哪里

OpenClaw 运行在 Docker 中，但 Docker 不是权威数据来源。
所有长期状态都必须在重启、重建和重启主机后仍然保留。

| 组件 | 位置 | 持久化机制 | 说明 |
| ------------------- | --------------------------------- | ---------------------- | ------------------------------------------------------------- |
| Gateway 网关配置 | `/home/node/.openclaw/` | 主机卷挂载 | 包含 `openclaw.json`、`.env` |
| 模型 auth profiles | `/home/node/.openclaw/agents/` | 主机卷挂载 | `agents/<agentId>/agent/auth-profiles.json`（OAuth、API keys） |
| Skill 配置 | `/home/node/.openclaw/skills/` | 主机卷挂载 | Skill 级状态 |
| 智能体工作区 | `/home/node/.openclaw/workspace/` | 主机卷挂载 | 代码和智能体产物 |
| WhatsApp 会话 | `/home/node/.openclaw/` | 主机卷挂载 | 保留 QR 登录状态 |
| Gmail keyring | `/home/node/.openclaw/` | 主机卷 + 密码 | 需要 `GOG_KEYRING_PASSWORD` |
| 外部二进制 | `/usr/local/bin/` | Docker 镜像 | 必须在构建时预构建进去 |
| Node 运行时 | 容器文件系统 | Docker 镜像 | 每次镜像构建时都会重建 |
| OS 软件包 | 容器文件系统 | Docker 镜像 | 不要在运行时安装 |
| Docker 容器 | 临时性 | 可重启 | 可以安全销毁 |

## 更新

要在 VM 上更新 OpenClaw：

```bash
git pull
docker compose build
docker compose up -d
```
