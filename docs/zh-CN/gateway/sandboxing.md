---
read_when: You want a dedicated explanation of sandboxing or need to tune agents.defaults.sandbox.
status: active
summary: OpenClaw 沙箱隔离的工作原理：模式、作用范围、工作区访问和镜像
title: 沙箱隔离
x-i18n:
    generated_at: "2026-04-08T05:51:23Z"
    model: gpt-5.4
    provider: openai
    source_hash: 756ebd5b9806c23ba720a311df7e3b4ffef6ce41ba4315ee4b36b5ea87b26e60
    source_path: gateway\sandboxing.md
    workflow: 15
---

# 沙箱隔离

OpenClaw 可以在**沙箱后端内运行工具**，以降低影响范围。
这是**可选的**，并由配置控制（`agents.defaults.sandbox` 或
`agents.list[].sandbox`）。如果关闭沙箱隔离，工具将在宿主机上运行。
Gateway 网关保持在宿主机上；启用后，工具执行会在隔离的沙箱中运行。

这不是完美的安全边界，但当模型做出愚蠢操作时，它能显著限制文件系统
和进程访问。

## 哪些内容会被沙箱隔离

- 工具执行（`exec`、`read`、`write`、`edit`、`apply_patch`、`process` 等）。
- 可选的沙箱隔离浏览器（`agents.defaults.sandbox.browser`）。
  - 默认情况下，当浏览器工具需要它时，沙箱浏览器会自动启动（确保 CDP 可达）。
    通过 `agents.defaults.sandbox.browser.autoStart` 和 `agents.defaults.sandbox.browser.autoStartTimeoutMs` 进行配置。
  - 默认情况下，沙箱浏览器容器使用专用的 Docker 网络（`openclaw-sandbox-browser`），而不是全局 `bridge` 网络。
    使用 `agents.defaults.sandbox.browser.network` 配置。
  - 可选的 `agents.defaults.sandbox.browser.cdpSourceRange` 可通过 CIDR 允许列表限制容器边缘的 CDP 入站访问（例如 `172.21.0.1/32`）。
  - noVNC 观察者访问默认受密码保护；OpenClaw 会输出一个短时有效的令牌 URL，它提供一个本地引导页面，并使用 URL 片段中的密码打开 noVNC（不会出现在查询参数或请求头日志中）。
  - `agents.defaults.sandbox.browser.allowHostControl` 允许沙箱隔离会话显式以宿主机浏览器为目标。
  - 可选允许列表可对 `target: "custom"` 进行限制：`allowedControlUrls`、`allowedControlHosts`、`allowedControlPorts`。

不会被沙箱隔离的内容：

- Gateway 网关进程本身。
- 任何被明确允许在沙箱外运行的工具（例如 `tools.elevated`）。
  - **Elevated exec 会绕过沙箱隔离，并使用已配置的逃逸路径（默认是 `gateway`，当 exec 目标是 `node` 时则为 `node`）。**
  - 如果关闭了沙箱隔离，`tools.elevated` 不会改变执行位置（本来就在宿主机上）。参见 [提权模式](/zh-CN/tools/elevated)。

## 模式

`agents.defaults.sandbox.mode` 控制**何时**使用沙箱隔离：

- `"off"`：不使用沙箱隔离。
- `"non-main"`：仅对**非主**会话启用沙箱隔离（如果你希望普通聊天保留在宿主机上，这是默认选项）。
- `"all"`：每个会话都在沙箱中运行。
  注意：`"non-main"` 是基于 `session.mainKey`（默认 `"main"`），而不是智能体 id。
  群组/渠道会话使用它们自己的键，因此会被视为非主会话，并会被沙箱隔离。

## 作用范围

`agents.defaults.sandbox.scope` 控制**会创建多少个容器**：

- `"agent"`（默认）：每个智能体一个容器。
- `"session"`：每个会话一个容器。
- `"shared"`：所有沙箱隔离会话共享一个容器。

## 后端

`agents.defaults.sandbox.backend` 控制**由哪个运行时**提供沙箱：

- `"docker"`（默认）：本地 Docker 支持的沙箱运行时。
- `"ssh"`：通用的 SSH 远程沙箱运行时。
- `"openshell"`：由 OpenShell 支持的沙箱运行时。

SSH 专属配置位于 `agents.defaults.sandbox.ssh` 下。
OpenShell 专属配置位于 `plugins.entries.openshell.config` 下。

### 选择后端

|                     | Docker                       | SSH                        | OpenShell                         |
| ------------------- | ---------------------------- | -------------------------- | --------------------------------- |
| **运行位置**        | 本地容器                     | 任意可通过 SSH 访问的主机  | 由 OpenShell 管理的沙箱           |
| **设置**            | `scripts/sandbox-setup.sh`   | SSH 密钥 + 目标主机        | 启用 OpenShell 插件               |
| **工作区模型**      | Bind-mount 或复制            | 远程为准（一次性初始化）   | `mirror` 或 `remote`              |
| **网络控制**        | `docker.network`（默认：无） | 取决于远程主机             | 取决于 OpenShell                  |
| **浏览器沙箱**      | 支持                         | 不支持                     | 尚不支持                          |
| **Bind mounts**     | `docker.binds`               | 不适用                     | 不适用                            |
| **最适合**          | 本地开发、完全隔离           | 卸载到远程机器执行         | 带可选双向同步的托管远程沙箱      |

### SSH 后端

当你希望 OpenClaw 在
任意可通过 SSH 访问的机器上对 `exec`、文件工具和媒体读取进行沙箱隔离时，请使用 `backend: "ssh"`。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        scope: "session",
        workspaceAccess: "rw",
        ssh: {
          target: "user@gateway-host:22",
          workspaceRoot: "/tmp/openclaw-sandboxes",
          strictHostKeyChecking: true,
          updateHostKeys: true,
          identityFile: "~/.ssh/id_ed25519",
          certificateFile: "~/.ssh/id_ed25519-cert.pub",
          knownHostsFile: "~/.ssh/known_hosts",
          // Or use SecretRefs / inline contents instead of local files:
          // identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          // certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          // knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

其工作方式如下：

- OpenClaw 会在 `sandbox.ssh.workspaceRoot` 下为每个作用范围创建一个远程根目录。
- 在创建或重建后的首次使用时，OpenClaw 会先从本地工作区向该远程工作区执行一次初始化复制。
- 之后，`exec`、`read`、`write`、`edit`、`apply_patch`、提示中的媒体读取以及入站媒体暂存都会直接通过 SSH 针对远程工作区运行。
- OpenClaw 不会自动将远程更改同步回本地工作区。

认证材料：

- `identityFile`、`certificateFile`、`knownHostsFile`：使用现有本地文件，并通过 OpenSSH 配置传递。
- `identityData`、`certificateData`、`knownHostsData`：使用内联字符串或 SecretRefs。OpenClaw 会通过常规 secrets 运行时快照解析它们，将其写入权限为 `0600` 的临时文件，并在 SSH 会话结束时删除这些文件。
- 如果同一项同时设置了 `*File` 和 `*Data`，则该 SSH 会话以 `*Data` 为准。

这是一个**远程为准**模型。在初始复制完成后，远程 SSH 工作区会成为真实的沙箱状态。

重要影响：

- 在初始化复制之后，如果你在 OpenClaw 外部对宿主机本地文件做了修改，这些修改在你重建沙箱之前不会反映到远程端。
- `openclaw sandbox recreate` 会删除每个作用范围对应的远程根目录，并在下次使用时再次从本地进行初始化复制。
- SSH 后端不支持浏览器沙箱隔离。
- `sandbox.docker.*` 设置不适用于 SSH 后端。

### OpenShell 后端

当你希望 OpenClaw 在
由 OpenShell 管理的远程环境中对工具进行沙箱隔离时，请使用 `backend: "openshell"`。完整设置指南、配置
参考以及工作区模式对比，请参见专门的
[OpenShell page](/zh-CN/gateway/openshell)。

OpenShell 复用了与通用 SSH 后端相同的核心 SSH 传输和远程文件系统桥接，
并增加了 OpenShell 专属的生命周期管理
（`sandbox create/get/delete`、`sandbox ssh-config`）以及可选的 `mirror`
工作区模式。

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "openshell",
        scope: "session",
        workspaceAccess: "rw",
      },
    },
  },
  plugins: {
    entries: {
      openshell: {
        enabled: true,
        config: {
          from: "openclaw",
          mode: "remote", // mirror | remote
          remoteWorkspaceDir: "/sandbox",
          remoteAgentWorkspaceDir: "/agent",
        },
      },
    },
  },
}
```

OpenShell 模式：

- `mirror`（默认）：本地工作区保持为准。OpenClaw 会在 exec 前将本地文件同步到 OpenShell，并在 exec 后将远程工作区同步回来。
- `remote`：沙箱创建后，OpenShell 工作区即为准。OpenClaw 会从本地工作区向远程工作区执行一次初始化复制，此后文件工具和 exec 都会直接针对远程沙箱运行，且不会将更改同步回本地。

远程传输细节：

- OpenClaw 会通过 `openshell sandbox ssh-config <name>` 向 OpenShell 请求沙箱专用的 SSH 配置。
- Core 会将该 SSH 配置写入临时文件，打开 SSH 会话，并复用 `backend: "ssh"` 所使用的同一套远程文件系统桥接。
- 仅在 `mirror` 模式下，生命周期有所不同：在 exec 之前先将本地同步到远程，然后在 exec 之后同步回来。

当前 OpenShell 的限制：

- 目前尚不支持沙箱浏览器
- OpenShell 后端不支持 `sandbox.docker.binds`
- `sandbox.docker.*` 下的 Docker 专属运行时选项仍然仅适用于 Docker 后端

#### 工作区模式

OpenShell 有两种工作区模型。这是实践中最重要的部分。

##### `mirror`

当你希望**本地工作区保持为准**时，请使用 `plugins.entries.openshell.config.mode: "mirror"`。

行为：

- 在 `exec` 之前，OpenClaw 会将本地工作区同步到 OpenShell 沙箱中。
- 在 `exec` 之后，OpenClaw 会将远程工作区同步回本地工作区。
- 文件工具仍然通过沙箱桥接运行，但在每轮交互之间，本地工作区仍是事实来源。

适用场景：

- 你会在 OpenClaw 外部本地编辑文件，并希望这些更改自动出现在沙箱中
- 你希望 OpenShell 沙箱的行为尽可能接近 Docker 后端
- 你希望宿主机工作区在每次 exec 之后反映沙箱中的写入结果

代价：

- exec 前后会产生额外的同步开销

##### `remote`

当你希望**OpenShell 工作区成为事实来源**时，请使用 `plugins.entries.openshell.config.mode: "remote"`。

行为：

- 沙箱首次创建时，OpenClaw 会从本地工作区向远程工作区执行一次初始化复制。
- 之后，`exec`、`read`、`write`、`edit` 和 `apply_patch` 都会直接针对远程 OpenShell 工作区运行。
- OpenClaw 在 exec 后**不会**将远程更改同步回本地工作区。
- 提示阶段的媒体读取仍然可用，因为文件和媒体工具是通过沙箱桥接读取，而不是假定存在本地宿主机路径。
- 传输方式是通过 `openshell sandbox ssh-config` 返回的 OpenShell 沙箱 SSH 配置进行 SSH 连接。

重要影响：

- 如果你在初始化复制之后于 OpenClaw 外部编辑宿主机文件，远程沙箱**不会**自动看到这些更改。
- 如果重建沙箱，远程工作区会再次从本地工作区初始化复制。
- 当使用 `scope: "agent"` 或 `scope: "shared"` 时，该远程工作区也会在相同作用范围内共享。

适用场景：

- 沙箱主要应驻留在远程 OpenShell 一侧
- 你希望降低每轮交互的同步开销
- 你不希望宿主机本地修改悄悄覆盖远程沙箱状态

如果你把沙箱视为临时执行环境，请选择 `mirror`。
如果你把沙箱视为真实工作区，请选择 `remote`。

#### OpenShell 生命周期

OpenShell 沙箱仍然通过常规沙箱生命周期进行管理：

- `openclaw sandbox list` 会显示 OpenShell 运行时以及 Docker 运行时
- `openclaw sandbox recreate` 会删除当前运行时，并让 OpenClaw 在下次使用时重新创建它
- prune 逻辑同样具备后端感知能力

对于 `remote` 模式，recreate 尤其重要：

- recreate 会删除该作用范围的规范远程工作区
- 下次使用时会从本地工作区初始化一个全新的远程工作区

对于 `mirror` 模式，recreate 主要是重置远程执行环境，
因为无论如何本地工作区仍是事实来源。

## 工作区访问

`agents.defaults.sandbox.workspaceAccess` 控制**沙箱可以看到什么**：

- `"none"`（默认）：工具会看到位于 `~/.openclaw/sandboxes` 下的沙箱工作区。
- `"ro"`：以只读方式将智能体工作区挂载到 `/agent`（会禁用 `write` / `edit` / `apply_patch`）。
- `"rw"`：以读写方式将智能体工作区挂载到 `/workspace`。

对于 OpenShell 后端：

- `mirror` 模式仍在 exec 轮次之间以本地工作区为事实来源
- `remote` 模式在初次初始化复制后以远程 OpenShell 工作区为事实来源
- `workspaceAccess: "ro"` 和 `"none"` 仍会以相同方式限制写入行为

入站媒体会被复制到当前活动的沙箱工作区中（`media/inbound/*`）。
Skills 说明：`read` 工具以沙箱根目录为基准。在 `workspaceAccess: "none"` 时，
OpenClaw 会将符合条件的 Skills 镜像到沙箱工作区（`.../skills`）中，
以便它们可被读取。使用 `"rw"` 时，工作区中的 Skills 可从
`/workspace/skills` 读取。

## 自定义 Bind mounts

`agents.defaults.sandbox.docker.binds` 会将额外的宿主机目录挂载到容器中。
格式：`host:container:mode`（例如 `"/home/user/source:/source:rw"`）。

全局和每个智能体的 binds 会**合并**（而非替换）。在 `scope: "shared"` 下，每个智能体的 binds 会被忽略。

`agents.defaults.sandbox.browser.binds` 仅将额外的宿主机目录挂载到**沙箱浏览器**容器中。

- 设置后（包括 `[]`），它会替代浏览器容器中的 `agents.defaults.sandbox.docker.binds`。
- 如果省略，浏览器容器会回退到 `agents.defaults.sandbox.docker.binds`（向后兼容）。

示例（只读源码 + 一个额外数据目录）：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        docker: {
          binds: ["/home/user/source:/source:ro", "/var/data/myapp:/data:ro"],
        },
      },
    },
    list: [
      {
        id: "build",
        sandbox: {
          docker: {
            binds: ["/mnt/cache:/cache:rw"],
          },
        },
      },
    ],
  },
}
```

安全说明：

- Binds 会绕过沙箱文件系统：它们会以你设置的模式（`:ro` 或 `:rw`）暴露宿主机路径。
- OpenClaw 会阻止危险的绑定源（例如：`docker.sock`、`/etc`、`/proc`、`/sys`、`/dev`，以及会暴露这些路径的父级挂载点）。
- OpenClaw 还会阻止常见的主目录凭据根路径，例如 `~/.aws`、`~/.cargo`、`~/.config`、`~/.docker`、`~/.gnupg`、`~/.netrc`、`~/.npm` 和 `~/.ssh`。
- 绑定校验不只是字符串匹配。OpenClaw 会先规范化源路径，然后再通过最深的现有祖先路径重新解析，之后再次检查被阻止路径和允许根路径。
- 这意味着，即使最终叶子路径尚不存在，通过父级符号链接逃逸的方式也仍会被默认拒绝。例如：如果 `run-link` 指向那里，那么 `/workspace/run-link/new-file` 仍会被解析为 `/var/run/...`。
- 允许的源根路径也会以相同方式规范化，因此某个路径即使在符号链接解析之前看起来位于允许列表内，仍会因为 `outside allowed roots` 而被拒绝。
- 敏感挂载（secrets、SSH 密钥、服务凭据）除非绝对必要，否则都应设为 `:ro`。
- 如果你只需要对工作区进行读取访问，请结合 `workspaceAccess: "ro"` 使用；绑定模式仍然彼此独立。
- 关于 binds 如何与工具策略及 elevated exec 交互，请参见 [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated)。

## 镜像 + 设置

默认 Docker 镜像：`openclaw-sandbox:bookworm-slim`

构建一次即可：

```bash
scripts/sandbox-setup.sh
```

注意：默认镜像**不**包含 Node。如果某个 skill 需要 Node（或
其他运行时），你需要构建自定义镜像，或通过
`sandbox.docker.setupCommand` 安装（需要网络出站 + 可写根文件系统 +
root 用户）。

如果你希望使用一个功能更完整、包含常用工具（例如
`curl`、`jq`、`nodejs`、`python3`、`git`）的沙箱镜像，请构建：

```bash
scripts/sandbox-common-setup.sh
```

然后将 `agents.defaults.sandbox.docker.image` 设置为
`openclaw-sandbox-common:bookworm-slim`。

沙箱浏览器镜像：

```bash
scripts/sandbox-browser-setup.sh
```

默认情况下，Docker 沙箱容器以**无网络**方式运行。
可通过 `agents.defaults.sandbox.docker.network` 覆盖。

内置的沙箱浏览器镜像还会对容器化工作负载应用保守的 Chromium 启动默认值。
当前容器默认值包括：

- `--remote-debugging-address=127.0.0.1`
- `--remote-debugging-port=<derived from OPENCLAW_BROWSER_CDP_PORT>`
- `--user-data-dir=${HOME}/.chrome`
- `--no-first-run`
- `--no-default-browser-check`
- `--disable-3d-apis`
- `--disable-gpu`
- `--disable-dev-shm-usage`
- `--disable-background-networking`
- `--disable-extensions`
- `--disable-features=TranslateUI`
- `--disable-breakpad`
- `--disable-crash-reporter`
- `--disable-software-rasterizer`
- `--no-zygote`
- `--metrics-recording-only`
- `--renderer-process-limit=2`
- 当启用 `noSandbox` 时，使用 `--no-sandbox` 和 `--disable-setuid-sandbox`。
- 三个图形加固标志（`--disable-3d-apis`、
  `--disable-software-rasterizer`、`--disable-gpu`）是可选的；当容器缺少 GPU 支持时，
  它们会很有用。如果你的工作负载需要 WebGL 或其他 3D/浏览器功能，请设置 `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`。
- `--disable-extensions` 默认启用；对于依赖扩展的流程，可通过
  `OPENCLAW_BROWSER_DISABLE_EXTENSIONS=0` 禁用该默认值。
- `--renderer-process-limit=2` 由
  `OPENCLAW_BROWSER_RENDERER_PROCESS_LIMIT=<N>` 控制，其中 `0` 表示保留 Chromium 的默认值。

如果你需要不同的运行时配置，请使用自定义浏览器镜像并提供
你自己的入口点。对于本地（非容器）Chromium 配置文件，请使用
`browser.extraArgs` 追加额外的启动标志。

默认安全设置：

- `network: "host"` 会被阻止。
- `network: "container:<id>"` 默认会被阻止（存在加入命名空间绕过风险）。
- 破窗覆盖：`agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin: true`。

Docker 安装以及容器化的 Gateway 网关位于这里：
[Docker](/zh-CN/install/docker)

对于 Docker Gateway 网关部署，`scripts/docker/setup.sh` 可以引导沙箱配置。
设置 `OPENCLAW_SANDBOX=1`（或 `true` / `yes` / `on`）即可启用该路径。你可以
通过 `OPENCLAW_DOCKER_SOCKET` 覆盖 socket 位置。完整设置和环境变量
参考： [Docker](/zh-CN/install/docker#agent-sandbox)。

## setupCommand（一次性容器设置）

`setupCommand` 会在沙箱容器创建后**仅运行一次**（不是每次运行都执行）。
它会通过 `sh -lc` 在容器内执行。

路径：

- 全局：`agents.defaults.sandbox.docker.setupCommand`
- 每个智能体：`agents.list[].sandbox.docker.setupCommand`

常见陷阱：

- 默认 `docker.network` 为 `"none"`（无出站访问），因此安装软件包会失败。
- `docker.network: "container:<id>"` 需要 `dangerouslyAllowContainerNamespaceJoin: true`，且仅用于破窗场景。
- `readOnlyRoot: true` 会阻止写入；请设置 `readOnlyRoot: false` 或构建自定义镜像。
- 安装软件包时，`user` 必须为 root（省略 `user` 或设置 `user: "0:0"`）。
- 沙箱 exec **不会**继承宿主机的 `process.env`。请使用
  `agents.defaults.sandbox.docker.env`（或自定义镜像）来提供 skill API 密钥。

## 工具策略 + 逃逸通道

工具允许/拒绝策略仍会先于沙箱规则生效。如果某个工具在全局
或每个智能体层面被拒绝，沙箱隔离也无法让它重新可用。

`tools.elevated` 是一个显式逃逸通道，会在沙箱外运行 `exec`（默认使用 `gateway`，当 exec 目标是 `node` 时则为 `node`）。
`/exec` 指令仅对已授权发送者生效，并会按会话持久化；如果要彻底禁用
`exec`，请使用工具策略拒绝（参见 [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated)）。

调试：

- 使用 `openclaw sandbox explain` 检查生效中的沙箱模式、工具策略和修复配置键。
- 关于“为什么这个被阻止了？”的理解模型，请参见 [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated)。
  保持严格锁定。

## 多智能体覆盖

每个智能体都可以覆盖沙箱和工具设置：
`agents.list[].sandbox` 和 `agents.list[].tools`（以及用于沙箱工具策略的 `agents.list[].tools.sandbox.tools`）。
优先级请参见 [多智能体沙箱与工具](/zh-CN/tools/multi-agent-sandbox-tools)。

## 最小启用示例

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session",
        workspaceAccess: "none",
      },
    },
  },
}
```

## 相关文档

- [OpenShell](/zh-CN/gateway/openshell) -- 托管沙箱后端设置、工作区模式和配置参考
- [????](/zh-CN/gateway/configuration-reference#agentsdefaultssandbox)
- [沙箱隔离 vs 工具策略 vs Elevated](/zh-CN/gateway/sandbox-vs-tool-policy-vs-elevated) -- 调试“为什么这个被阻止了？”
- [多智能体沙箱与工具](/zh-CN/tools/multi-agent-sandbox-tools) -- 每个智能体的覆盖和优先级
- [??](/zh-CN/gateway/security)
