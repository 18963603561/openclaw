---
read_when:
    - 你需要 `definePluginEntry` 或 `defineChannelPluginEntry` 的精确类型签名
    - 你想了解注册模式（full 与 setup 与 CLI 元数据）
    - 你正在查找入口点选项
sidebarTitle: Entry Points
summary: '`definePluginEntry`、`defineChannelPluginEntry` 和 `defineSetupPluginEntry` 的参考说明'
title: 插件入口点
x-i18n:
    generated_at: "2026-04-08T06:44:24Z"
    model: gpt-5.4
    provider: openai
    source_hash: 799dbfe71e681dd8ba929a7a631dfe745c3c5c69530126fea2f9c137b120f51f
    source_path: plugins\sdk-entrypoints.md
    workflow: 15
---

# 插件入口点

每个插件都会导出一个默认入口对象。SDK 提供了三个辅助函数来创建它们。

<Tip>
  **在找演练指南？** 请参见 [渠道插件](/zh-CN/plugins/sdk-channel-plugins)
  或 [提供商插件](/zh-CN/plugins/sdk-provider-plugins) 获取分步指南。
</Tip>

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于提供商插件、工具插件、hook 插件，以及任何**不是**消息渠道的插件。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| 字段           | 类型                                                             | 必填 | 默认值             |
| -------------- | ---------------------------------------------------------------- | ---- | ------------------ |
| `id`           | `string`                                                         | 是   | —                  |
| `name`         | `string`                                                         | 是   | —                  |
| `description`  | `string`                                                         | 是   | —                  |
| `kind`         | `string`                                                         | 否   | —                  |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema      |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —                  |

- `id` 必须与你的 `openclaw.plugin.json` 清单一致。
- `kind` 用于排他性槽位：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个用于延迟求值的函数。
- OpenClaw 会在首次访问时解析并记忆化该 schema，因此高开销的 schema
  构建器只会运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

通过渠道专属接线封装 `definePluginEntry`。会自动调用
`api.registerChannel({ plugin })`，暴露一个可选的根帮助 CLI 元数据边界，并根据注册模式控制 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 字段                  | 类型                                                             | 必填 | 默认值             |
| --------------------- | ---------------------------------------------------------------- | ---- | ------------------ |
| `id`                  | `string`                                                         | 是   | —                  |
| `name`                | `string`                                                         | 是   | —                  |
| `description`         | `string`                                                         | 是   | —                  |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —                  |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema      |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —                  |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —                  |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —                  |

- `setRuntime` 会在注册期间调用，以便你存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在捕获 CLI 元数据期间会跳过。
- `registerCliMetadata` 会在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 两种情况下运行。
  请将其作为渠道自有 CLI 描述符的规范位置，这样根帮助就能保持非激活式加载，同时普通 CLI 命令注册仍与完整插件加载兼容。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。在仅设置加载期间会跳过。
- 与 `definePluginEntry` 一样，`configSchema` 也可以是延迟工厂，且 OpenClaw
  会在首次访问时记忆化解析后的 schema。
- 对于插件自有的根 CLI 命令，当你希望命令保持延迟加载，同时又不从根 CLI 解析树中消失时，优先使用 `api.registerCli(..., { descriptors: [...] })`。
  对于渠道插件，优先在 `registerCliMetadata(...)` 中注册这些描述符，并让 `registerFull(...)` 专注于仅运行时工作。
- 如果 `registerFull(...)` 还注册 Gateway 网关 RPC 方法，请为其使用插件专属前缀。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终会被强制归入 `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

适用于轻量级 `setup-entry.ts` 文件。它只返回 `{ plugin }`，不包含
运行时或 CLI 接线。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当某个渠道被禁用、未配置，或启用了延迟加载时，OpenClaw 会加载这个入口，而不是完整入口。关于这在何时重要，请参见
[设置和配置](/zh-CN/plugins/sdk-setup#setup-entry)。

在实践中，请将 `defineSetupPluginEntry(...)` 与这些窄范围设置辅助函数族配合使用：

- `openclaw/plugin-sdk/setup-runtime`：提供运行时安全的设置辅助函数，例如导入安全的设置补丁适配器、查找说明输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委派设置代理
- `openclaw/plugin-sdk/channel-setup`：用于可选安装的设置界面
- `openclaw/plugin-sdk/setup-tools`：用于设置 / 安装 CLI / 归档 / 文档辅助函数

请将重量级 SDK、CLI 注册以及长生命周期运行时服务保留在完整入口中。

## 注册模式

`api.registrationMode` 会告诉你的插件它是如何被加载的：

| 模式              | 时机                           | 应注册的内容                                                                         |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `"full"`          | 正常 Gateway 网关启动          | 一切内容                                                                             |
| `"setup-only"`    | 渠道被禁用 / 未配置            | 仅渠道注册                                                                           |
| `"setup-runtime"` | 设置流程中且运行时可用         | 渠道注册，以及在完整入口加载前所需的轻量运行时                                       |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获        | 仅 CLI 描述符                                                                        |

`defineChannelPluginEntry` 会自动处理这类拆分。如果你对渠道直接使用
`definePluginEntry`，请自行检查模式：

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // 仅运行时的重量级注册
  api.registerService(/* ... */);
}
```

请将 `"setup-runtime"` 视为这样一个窗口：仅设置启动界面必须存在，但又不能重新进入完整的内置渠道运行时。适合放在这里的是渠道注册、设置安全的 HTTP 路由、设置安全的 Gateway 网关方法，以及委派设置辅助函数。重量级后台服务、CLI 注册器和提供商 / 客户端 SDK 启动仍应归入 `"full"`。

对于 CLI 注册器，尤其要注意：

- 当注册器拥有一个或多个根命令，并且你希望 OpenClaw 在首次调用时延迟加载真实 CLI 模块时，请使用 `descriptors`
- 请确保这些描述符覆盖该注册器暴露的每个顶层命令根
- 仅在急切兼容路径中单独使用 `commands`

## 插件形态

OpenClaw 会根据插件的注册行为对已加载插件进行分类：

| 形态                  | 描述                                     |
| --------------------- | ---------------------------------------- |
| **plain-capability**  | 单一能力类型（例如仅提供商）             |
| **hybrid-capability** | 多种能力类型（例如提供商 + 语音）        |
| **hook-only**         | 仅有 hooks，没有能力                     |
| **non-capability**    | 有工具 / 命令 / 服务，但没有能力         |

使用 `openclaw plugins inspect <id>` 可查看某个插件的形态。

## 相关内容

- [SDK 概览](/zh-CN/plugins/sdk-overview) —— 注册 API 和子路径参考
- [运行时辅助函数](/zh-CN/plugins/sdk-runtime) —— `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/zh-CN/plugins/sdk-setup) —— 清单、设置入口、延迟加载
- [渠道插件](/zh-CN/plugins/sdk-channel-plugins) —— 构建 `ChannelPlugin` 对象
- [提供商插件](/zh-CN/plugins/sdk-provider-plugins) —— 提供商注册与 hooks
