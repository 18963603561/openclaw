---
read_when:
    - 你正在构建一个新的消息渠道插件
    - 你想将 OpenClaw 连接到某个消息平台
    - 你需要理解 ChannelPlugin 适配器接口
sidebarTitle: Channel Plugins
summary: 构建 OpenClaw 消息渠道插件的分步指南
title: 构建渠道插件
x-i18n:
    generated_at: "2026-04-08T06:44:11Z"
    model: gpt-5.4
    provider: openai
    source_hash: d23365b6d92006b30e671f9f0afdba40a2b88c845c5d2299d71c52a52985672f
    source_path: plugins\sdk-channel-plugins.md
    workflow: 15
---

# 构建渠道插件

本指南将带你构建一个把 OpenClaw 连接到消息平台的渠道插件。完成后，你将拥有一个可工作的渠道，具备私信安全、配对、回复线程以及出站消息能力。

<Info>
  如果你之前从未构建过任何 OpenClaw 插件，请先阅读
  [入门指南](/zh-CN/plugins/building-plugins)，了解基础的软件包结构和 manifest 设置。
</Info>

## 渠道插件如何工作

渠道插件不需要自带 send/edit/react 工具。OpenClaw 在核心中保留了一个共享的 `message` 工具。你的插件负责：

- **配置** —— 账号解析和设置向导
- **安全** —— 私信策略和 allowlists
- **配对** —— 私信审批流程
- **会话语法** —— provider 特定的会话 id 如何映射到基础聊天、线程 id 和父级回退
- **出站** —— 向平台发送文本、媒体和投票
- **线程处理** —— 如何对回复进行线程化

核心负责共享的 message 工具、prompt 连接、外层 session key 形状、通用 `:thread:` 记账以及分发。

如果你的平台将额外作用域存储在会话 id 中，请将该解析逻辑保留在插件中，使用 `messaging.resolveSessionConversation(...)`。这是将 `rawId` 映射为基础会话 id、可选线程 id、显式 `baseConversationId` 以及任意 `parentConversationCandidates` 的规范钩子。
当你返回 `parentConversationCandidates` 时，请按从最窄父级到最宽/基础会话的顺序排列。

如果内置插件在渠道注册表启动前也需要进行相同解析，它们还可以暴露一个顶层 `session-key-api.ts` 文件，并导出匹配的 `resolveSessionConversation(...)`。只有当运行时插件注册表尚不可用时，核心才会使用这一可安全引导的接口。

`messaging.resolveParentConversationCandidates(...)` 仍然作为旧版兼容回退保留，适用于插件仅需要在通用/raw id 之上增加父级回退的情况。如果两个钩子都存在，核心会优先使用
`resolveSessionConversation(...).parentConversationCandidates`，只有当规范钩子省略它们时，才会回退到 `resolveParentConversationCandidates(...)`。

## 审批与渠道能力

大多数渠道插件不需要编写审批专用代码。

- 核心负责同聊天内的 `/approve`、共享审批按钮载荷以及通用回退投递。
- 当渠道需要审批专用行为时，优先在渠道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已移除。请将审批投递/原生/渲染/鉴权事实放到 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/登出；核心不再从该对象中读取审批鉴权钩子。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范的审批鉴权接缝。
- 对于同聊天审批鉴权可用性，请使用 `approvalCapability.getActionAvailabilityState`。
- 如果你的渠道暴露原生 exec 审批，请在发起界面/原生客户端状态与同聊天审批鉴权不同时使用 `approvalCapability.getExecInitiatingSurfaceState`。核心使用这个 exec 专用钩子来区分 `enabled` 与 `disabled`、判断发起渠道是否支持原生 exec 审批，并在原生客户端回退指引中包含该渠道。`createApproverRestrictedNativeApprovalCapability(...)` 会为常见场景补全这一点。
- 对于渠道特定的载荷生命周期行为，例如隐藏重复的本地审批提示或在投递前发送输入中指示器，请使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload`。
- 仅在原生审批路由或回退抑制时使用 `approvalCapability.delivery`。
- 对于渠道自有的原生审批事实，请使用 `approvalCapability.nativeRuntime`。在高频渠道入口上请保持其惰性，可通过 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 按需导入你的运行时模块，同时仍让核心组装审批生命周期。
- 仅当渠道确实需要自定义审批载荷而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当渠道希望在禁用路径回复中说明启用原生 exec 审批所需的确切配置项时，请使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；命名账号渠道应渲染账号作用域路径，例如 `channels.<channel>.accounts.<id>.execApprovals.*`，而不是顶层默认值。
- 如果某个渠道可以从现有配置中推断出稳定的类所有者私信身份，请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 来限制同聊天 `/approve`，而无需添加审批专用核心逻辑。
- 如果某个渠道需要原生审批投递，请让渠道代码专注于目标标准化以及传输/展示事实。请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将渠道特定事实放在 `approvalCapability.nativeRuntime` 后面，最好通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，这样核心就可以组装处理器，并负责请求过滤、路由、去重、过期、Gateway 网关订阅以及“已路由到其他位置”的通知。`nativeRuntime` 被拆分为几个更小的接缝：
- `availability` —— 账号是否已配置，以及某个请求是否应被处理
- `presentation` —— 将共享审批视图模型映射为 pending/resolved/expired 原生载荷或最终动作
- `transport` —— 准备目标，并发送/更新/删除原生审批消息
- `interactions` —— 原生按钮或 reaction 的可选 bind/unbind/clear-action 钩子
- `observe` —— 可选的投递诊断钩子
- 如果渠道需要运行时自有对象，例如客户端、token、Bolt 应用或 webhook 接收器，请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册。通用 runtime context 注册表让核心可以从渠道启动状态引导基于能力的处理器，而无需添加审批专用包装胶水代码。
- 只有在基于能力的接缝仍不足以表达需求时，才使用更底层的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批渠道必须同时通过这些辅助工具路由 `accountId` 和 `approvalKind`。`accountId` 可让多账号审批策略限定到正确的机器人账号，`approvalKind` 则让 exec 与插件审批行为在渠道侧可用，而无需在核心中写死分支。
- 核心现在也负责审批重路由通知。渠道插件不应再从 `createChannelNativeApprovalRuntime` 发送自己的“审批已发往私信/其他渠道”跟进消息；请改为通过共享审批能力辅助工具暴露准确的 origin + approver 私信路由，让核心在向发起聊天回发任何通知前先聚合实际投递结果。
- 在端到端过程中保留已投递审批 id 的 kind。原生客户端不应根据渠道本地状态猜测或重写 exec 与插件审批路由。
- 不同审批 kind 可以有意暴露不同的原生界面。
  当前内置示例：
  - Slack 对 exec 和插件 id 都保留原生审批路由能力。
  - Matrix 对 exec 和插件审批保留相同的原生私信/渠道路由和 reaction UX，同时仍允许鉴权按审批 kind 不同。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容包装器存在，但新代码应优先使用能力构建器，并在插件上暴露 `approvalCapability`。

对于高频渠道入口，当你只需要这一家族中的某一部分时，请优先使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样地，当你不需要更宽泛的总入口时，请优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

针对设置部分：

- `openclaw/plugin-sdk/setup-runtime` 包含运行时安全的设置辅助工具：
  import 安全的设置 patch 适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、查找说明输出、
  `promptResolvedAllowFrom`、`splitSetupEntries`，以及委托式
  setup-proxy 构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是面向 `createEnvPatchedAccountSetupAdapter` 的窄接口、环境感知适配器接缝
- `openclaw/plugin-sdk/channel-setup` 覆盖可选安装的设置构建器以及少量设置安全原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、

如果你的渠道支持基于环境变量的设置或鉴权，并且通用启动/配置流程需要在运行时加载前知道这些环境变量名称，请在插件 manifest 中用 `channelEnvVars` 声明它们。渠道运行时中的 `envVars` 或本地常量仅用于面向运维者的文案。
`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 仅当你还需要更重的共享设置/配置辅助工具（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更宽泛的 `openclaw/plugin-sdk/setup` 接缝

如果你的渠道只想在设置界面中提示“先安装此插件”，请优先使用 `createOptionalChannelSetupSurface(...)`。生成的 adapter/wizard 在配置写入和最终化时会默认失败关闭，并会在验证、最终化和文档链接文案中复用同一条“需要安装”的消息。

对于其他高频渠道路径，也请优先使用窄接口辅助工具，而不是更宽泛的旧版接口：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用于多账号配置和默认账号回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch`，用于入站路由/envelope 以及记录并分发连接
- `openclaw/plugin-sdk/messaging-targets`，用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime`，用于媒体加载以及出站身份/发送委托
- `openclaw/plugin-sdk/thread-bindings-runtime`，用于线程绑定生命周期和 adapter 注册
- 仅当仍需要旧版 agent/media 载荷字段布局时，才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config`，用于 Telegram 自定义命令标准化、重复/冲突校验，以及稳定回退的命令配置契约

仅鉴权渠道通常可以止步于默认路径：核心处理审批，而插件只暴露出站/鉴权能力。像 Matrix、Slack、Telegram 和自定义聊天传输这样的原生审批渠道，应使用共享的原生辅助工具，而不是自己实现审批生命周期。

## 入站提及策略

请将入站提及处理分成两层：

- 插件自有的证据收集
- 共享的策略求值

共享层请使用 `openclaw/plugin-sdk/channel-inbound`。

适合放在插件本地逻辑中的内容：

- 回复机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 证明机器人参与所需的平台原生缓存

适合放在共享辅助工具中的内容：

- `requireMention`
- 显式提及结果
- 隐式提及 allowlist
- 命令绕过
- 最终跳过决策

推荐流程：

1. 计算本地提及事实。
2. 将这些事实传给 `resolveInboundMentionDecision({ facts, policy })`。
3. 在你的入站门控中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

```typescript
import {
  implicitMentionKindWhen,
  matchesMentionWithExplicit,
  resolveInboundMentionDecision,
} from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [
    ...implicitMentionKindWhen("reply_to_bot", isReplyToBot),
    ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot),
  ],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` 为已经依赖运行时注入的内置渠道插件暴露了相同的共享提及辅助工具：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

旧版 `resolveMentionGating*` 辅助工具仍保留在
`openclaw/plugin-sdk/channel-inbound` 中，但仅作为兼容导出。新代码
应使用 `resolveInboundMentionDecision({ facts, policy })`。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="软件包与 manifest">
    创建标准插件文件。`package.json` 中的 `channel` 字段
    会将其标记为一个渠道插件。有关完整的软件包元数据接口，
    参见 [插件设置与配置](/zh-CN/plugins/sdk-setup#openclawchannel)：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "acme-chat": {
            "type": "object",
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

  </Step>

  <Step title="构建渠道插件对象">
    `ChannelPlugin` 接口有许多可选 adapter 接口。从最小集合开始——`id` 和 `setup`——然后按需添加 adapter。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    <Accordion title="createChatChannelPlugin 为你做了什么">
      你无需手动实现底层 adapter 接口，而是传入声明式选项，由构建器进行组合：

      | 选项 | 它会连接的内容 |
      | --- | --- |
      | `security.dm` | 从配置字段解析带作用域的私信安全 |
      | `pairing.text` | 基于文本的私信配对流程，带验证码交换 |
      | `threading` | reply-to 模式解析器（固定、账号作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（message ID）的发送函数 |

      如果你需要完全控制，也可以直接传入原始 adapter 对象，而不是这些声明式选项。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    将渠道自有的 CLI 描述符放在 `registerCliMetadata(...)` 中，这样 OpenClaw
    就可以在不激活完整渠道运行时的情况下在根帮助中显示它们，
    同时常规完整加载仍会拾取相同描述符以进行真实命令注册。`registerFull(...)`
    只保留给运行时专用工作。
    如果 `registerFull(...)` 注册 Gateway 网关 RPC 方法，请使用
    插件专用前缀。核心管理命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）会保留，并始终
    解析到 `operator.admin`。
    `defineChannelPluginEntry` 会自动处理注册模式拆分。参见
    [入口点](/zh-CN/plugins/sdk-entrypoints#definechannelpluginentry) 了解全部
    选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts`，用于在新手引导期间进行轻量加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 会加载这个入口，而不是完整入口。
    这样可以避免在设置流程中拉入沉重的运行时代码。
    详情参见 [设置与配置](/zh-CN/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="处理入站消息">
    你的插件需要接收来自平台的消息并将其转发到 OpenClaw。典型模式是一个 webhook：验证请求后，通过你的渠道入站处理器进行分发：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      入站消息处理是渠道特定的。每个渠道插件都负责自己的入站管线。
      请查看内置渠道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）中的真实模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
编写并 colocated 放置测试文件 `src/channel.test.ts`：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    共享测试辅助工具参见 [测试](/zh-CN/plugins/sdk-testing)。

  </Step>
</Steps>

## 文件结构

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## 高级主题

<CardGroup cols={2}>
  <Card title="线程处理选项" icon="git-branch" href="/zh-CN/plugins/sdk-entrypoints#registration-mode">
    固定、账号作用域或自定义回复模式
  </Card>
  <Card title="Message 工具集成" icon="puzzle" href="/zh-CN/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和动作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/zh-CN/plugins/architecture#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/zh-CN/plugins/sdk-runtime">
    TTS、STT、媒体、通过 `api.runtime` 使用 subagent
  </Card>
</CardGroup>

<Note>
一些内置辅助工具接缝仍然保留，用于维护内置插件和兼容性。
对于新的渠道插件，它们并不是推荐模式；
除非你正在直接维护该内置插件家族，否则应优先使用通用 SDK 接口中的 channel/setup/reply/runtime 子路径。
</Note>

## 后续步骤

- [提供商插件](/zh-CN/plugins/sdk-provider-plugins) —— 如果你的插件也提供模型
- [插件 SDK 概览](/zh-CN/plugins/sdk-overview) —— 完整子路径导入参考
- [插件 SDK 测试](/zh-CN/plugins/sdk-testing) —— 测试工具与契约测试
- [插件清单](/zh-CN/plugins/manifest) —— 完整 manifest schema
