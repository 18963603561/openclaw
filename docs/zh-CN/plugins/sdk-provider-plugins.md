---
read_when:
    - 你正在构建新的模型提供商插件
    - 你想为 OpenClaw 添加一个 OpenAI 兼容代理或自定义 LLM
    - 你需要理解提供商认证、目录和运行时 hook
sidebarTitle: Provider Plugins
summary: 为 OpenClaw 构建模型提供商插件的分步指南
title: 构建提供商插件
x-i18n:
    generated_at: "2026-04-08T06:48:22Z"
    model: gpt-5.4
    provider: openai
    source_hash: 4da82a353e1bf4fe6dc09e14b8614133ac96565679627de51415926014bd3990
    source_path: plugins\sdk-provider-plugins.md
    workflow: 15
---

# 构建提供商插件

本指南将带你构建一个提供商插件，用于向 OpenClaw 添加模型提供商（LLM）。完成后，你将拥有一个具备模型目录、API key 认证和动态模型解析能力的提供商。

<Info>
  如果你此前从未构建过任何 OpenClaw 插件，请先阅读
  [入门指南](/zh-CN/plugins/building-plugins)，了解基础包结构和清单设置。
</Info>

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包和清单">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-ai",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "providers": ["acme-ai"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-ai",
      "name": "Acme AI",
      "description": "Acme AI model provider",
      "providers": ["acme-ai"],
      "modelSupport": {
        "modelPrefixes": ["acme-"]
      },
      "providerAuthEnvVars": {
        "acme-ai": ["ACME_AI_API_KEY"]
      },
      "providerAuthChoices": [
        {
          "provider": "acme-ai",
          "method": "api-key",
          "choiceId": "acme-ai-api-key",
          "choiceLabel": "Acme AI API key",
          "groupId": "acme-ai",
          "groupLabel": "Acme AI",
          "cliFlag": "--acme-ai-api-key",
          "cliOption": "--acme-ai-api-key <key>",
          "cliDescription": "Acme AI API key"
        }
      ],
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    清单声明了 `providerAuthEnvVars`，这样 OpenClaw 就可以在不加载你的插件运行时的情况下检测凭证。`modelSupport` 是可选项，它让 OpenClaw 能够在运行时 hook 存在之前，就根据像 `acme-large` 这样的简写模型 id 自动加载你的提供商插件。如果你要在 ClawHub 上发布该提供商，那么这些 `openclaw.compat` 和 `openclaw.build` 字段在 `package.json` 中是必需的。

  </Step>

  <Step title="注册提供商">
    一个最小可用的提供商需要 `id`、`label`、`auth` 和 `catalog`：

    ```typescript index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { createProviderApiKeyAuthMethod } from "openclaw/plugin-sdk/provider-auth";

    export default definePluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      register(api) {
        api.registerProvider({
          id: "acme-ai",
          label: "Acme AI",
          docsPath: "/providers/acme-ai",
          envVars: ["ACME_AI_API_KEY"],

          auth: [
            createProviderApiKeyAuthMethod({
              providerId: "acme-ai",
              methodId: "api-key",
              label: "Acme AI API key",
              hint: "API key from your Acme AI dashboard",
              optionKey: "acmeAiApiKey",
              flagName: "--acme-ai-api-key",
              envVar: "ACME_AI_API_KEY",
              promptMessage: "Enter your Acme AI API key",
              defaultModel: "acme-ai/acme-large",
            }),
          ],

          catalog: {
            order: "simple",
            run: async (ctx) => {
              const apiKey =
                ctx.resolveProviderApiKey("acme-ai").apiKey;
              if (!apiKey) return null;
              return {
                provider: {
                  baseUrl: "https://api.acme-ai.com/v1",
                  apiKey,
                  api: "openai-completions",
                  models: [
                    {
                      id: "acme-large",
                      name: "Acme Large",
                      reasoning: true,
                      input: ["text", "image"],
                      cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
                      contextWindow: 200000,
                      maxTokens: 32768,
                    },
                    {
                      id: "acme-small",
                      name: "Acme Small",
                      reasoning: false,
                      input: ["text"],
                      cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
                      contextWindow: 128000,
                      maxTokens: 8192,
                    },
                  ],
                },
              };
            },
          },
        });
      },
    });
    ```

    这就是一个可工作的提供商。用户现在可以运行
    `openclaw onboard --acme-ai-api-key <key>`，并选择
    `acme-ai/acme-large` 作为他们的模型。

    对于只注册一个文本提供商、使用 API key
    认证并配有单一 catalog 支持运行时的内置提供商，优先使用更窄的
    `defineSingleProviderPluginEntry(...)` helper：

    ```typescript
    import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";

    export default defineSingleProviderPluginEntry({
      id: "acme-ai",
      name: "Acme AI",
      description: "Acme AI model provider",
      provider: {
        label: "Acme AI",
        docsPath: "/providers/acme-ai",
        auth: [
          {
            methodId: "api-key",
            label: "Acme AI API key",
            hint: "API key from your Acme AI dashboard",
            optionKey: "acmeAiApiKey",
            flagName: "--acme-ai-api-key",
            envVar: "ACME_AI_API_KEY",
            promptMessage: "Enter your Acme AI API key",
            defaultModel: "acme-ai/acme-large",
          },
        ],
        catalog: {
          buildProvider: () => ({
            api: "openai-completions",
            baseUrl: "https://api.acme-ai.com/v1",
            models: [{ id: "acme-large", name: "Acme Large" }],
          }),
        },
      },
    });
    ```

    如果你的认证流程在新手引导期间还需要补丁 `models.providers.*`、别名以及智能体默认模型，请使用
    `openclaw/plugin-sdk/provider-onboard` 中的预设 helper。最窄的 helper 是
    `createDefaultModelPresetAppliers(...)`、
    `createDefaultModelsPresetAppliers(...)`，以及
    `createModelCatalogPresetAppliers(...)`。

    当某个提供商的原生端点在正常的 `openai-completions` 传输上支持流式用量块时，优先使用
    `openclaw/plugin-sdk/provider-catalog-shared` 中的共享 catalog helper，而不要硬编码
    provider-id 判断。`supportsNativeStreamingUsageCompat(...)` 和
    `applyProviderNativeStreamingUsageCompat(...)` 会从端点能力映射中检测支持情况，因此像原生 Moonshot / DashScope 这类端点，即使插件使用的是自定义 provider id，也仍可选择启用。

  </Step>

  <Step title="添加动态模型解析">
    如果你的提供商接受任意模型 ID（例如代理或路由器），请添加 `resolveDynamicModel`：

    ```typescript
    api.registerProvider({
      // ... id, label, auth, catalog from above

      resolveDynamicModel: (ctx) => ({
        id: ctx.modelId,
        name: ctx.modelId,
        provider: "acme-ai",
        api: "openai-completions",
        baseUrl: "https://api.acme-ai.com/v1",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192,
      }),
    });
    ```

    如果解析需要网络调用，请使用 `prepareDynamicModel` 进行异步预热——在它完成后，`resolveDynamicModel` 会再次运行。

  </Step>

  <Step title="按需添加运行时 hook">
    大多数提供商只需要 `catalog` + `resolveDynamicModel`。随着你的提供商需求增加，再逐步添加 hook。

    共享 helper builder 现在已经覆盖最常见的 replay / 工具兼容性家族，因此插件通常不需要手工逐个接入每个 hook：

    ```typescript
    import { buildProviderReplayFamilyHooks } from "openclaw/plugin-sdk/provider-model-shared";
    import { buildProviderStreamFamilyHooks } from "openclaw/plugin-sdk/provider-stream";
    import { buildProviderToolCompatFamilyHooks } from "openclaw/plugin-sdk/provider-tools";

    const GOOGLE_FAMILY_HOOKS = {
      ...buildProviderReplayFamilyHooks({ family: "google-gemini" }),
      ...buildProviderStreamFamilyHooks("google-thinking"),
      ...buildProviderToolCompatFamilyHooks("gemini"),
    };

    api.registerProvider({
      id: "acme-gemini-compatible",
      // ...
      ...GOOGLE_FAMILY_HOOKS,
    });
    ```

    当前可用的 replay 家族：

    | 家族 | 它会接入什么 |
    | --- | --- |
    | `openai-compatible` | 适用于 OpenAI 兼容传输的共享 OpenAI 风格 replay 策略，包括 tool-call-id 净化、assistant 优先顺序修复，以及在传输需要时提供通用 Gemini turn 校验 |
    | `anthropic-by-model` | 按 `modelId` 选择的 Claude 感知 replay 策略，因此 Anthropic-message 传输仅会在解析出的模型确实是 Claude id 时获得 Claude 专属 thinking-block 清理 |
    | `google-gemini` | 原生 Gemini replay 策略，加上 bootstrap replay 净化和带标签的 reasoning-output 模式 |
    | `passthrough-gemini` | 适用于通过 OpenAI 兼容代理传输运行的 Gemini 模型的 Gemini thought-signature 净化；不会启用原生 Gemini replay 校验或 bootstrap 重写 |
    | `hybrid-anthropic-openai` | 适用于在一个插件中混合 Anthropic-message 和 OpenAI 兼容模型能力面的提供商的混合策略；可选的 Claude 专属 thinking-block 丢弃仍会限制在 Anthropic 一侧 |

    真实的内置示例：

    - `google` 和 `google-gemini-cli`：`google-gemini`
    - `openrouter`、`kilocode`、`opencode` 和 `opencode-go`：`passthrough-gemini`
    - `amazon-bedrock` 和 `anthropic-vertex`：`anthropic-by-model`
    - `minimax`：`hybrid-anthropic-openai`
    - `moonshot`、`ollama`、`xai` 和 `zai`：`openai-compatible`

    当前可用的 stream 家族：

    | 家族 | 它会接入什么 |
    | --- | --- |
    | `google-thinking` | 共享 stream 路径上的 Gemini thinking 载荷规范化 |
    | `kilocode-thinking` | 共享代理 stream 路径上的 Kilo reasoning wrapper，`kilo/auto` 和不受支持的代理 reasoning id 会跳过 thinking 注入 |
    | `moonshot-thinking` | 根据配置和 `/think` 级别，将 Moonshot 二元原生 thinking 载荷进行映射 |
    | `minimax-fast-mode` | 共享 stream 路径上的 MiniMax fast-mode 模型重写 |
    | `openai-responses-defaults` | 共享的原生 OpenAI / Codex Responses wrapper：归因 headers、`/fast` / `serviceTier`、文本详细度、原生 Codex Web 搜索、reasoning 兼容载荷整形，以及 Responses 上下文管理 |
    | `openrouter-thinking` | 面向代理路由的 OpenRouter reasoning wrapper，集中处理不受支持模型 / `auto` 跳过 |
    | `tool-stream-default-on` | 默认开启的 `tool_stream` wrapper，适用于像 Z.AI 这样希望除非显式禁用，否则始终启用工具流式传输的提供商 |

    真实的内置示例：

    - `google` 和 `google-gemini-cli`：`google-thinking`
    - `kilocode`：`kilocode-thinking`
    - `moonshot`：`moonshot-thinking`
    - `minimax` 和 `minimax-portal`：`minimax-fast-mode`
    - `openai` 和 `openai-codex`：`openai-responses-defaults`
    - `openrouter`：`openrouter-thinking`
    - `zai`：`tool-stream-default-on`

    `openclaw/plugin-sdk/provider-model-shared` 还导出了 replay-family
    枚举，以及这些家族所基于的共享 helper。常见公共导出包括：

    - `ProviderReplayFamily`
    - `buildProviderReplayFamilyHooks(...)`
    - 共享 replay builder，例如 `buildOpenAICompatibleReplayPolicy(...)`、
      `buildAnthropicReplayPolicyForModel(...)`、
      `buildGoogleGeminiReplayPolicy(...)`，以及
      `buildHybridAnthropicOrOpenAIReplayPolicy(...)`
    - Gemini replay helper，例如 `sanitizeGoogleGeminiReplayHistory(...)`
      和 `resolveTaggedReasoningOutputMode()`
    - 端点 / 模型 helper，例如 `resolveProviderEndpoint(...)`、
      `normalizeProviderId(...)`、`normalizeGooglePreviewModelId(...)`，以及
      `normalizeNativeXaiModelId(...)`

    `openclaw/plugin-sdk/provider-stream` 同时暴露了 family builder
    以及这些家族复用的公共 wrapper helper。常见公共导出包括：

    - `ProviderStreamFamily`
    - `buildProviderStreamFamilyHooks(...)`
    - `composeProviderStreamWrappers(...)`
    - 共享的 OpenAI / Codex wrapper，例如
      `createOpenAIAttributionHeadersWrapper(...)`、
      `createOpenAIFastModeWrapper(...)`、
      `createOpenAIServiceTierWrapper(...)`、
      `createOpenAIResponsesContextManagementWrapper(...)`，以及
      `createCodexNativeWebSearchWrapper(...)`
    - 共享代理 / 提供商 wrapper，例如 `createOpenRouterWrapper(...)`、
      `createToolStreamWrapper(...)` 和 `createMinimaxFastModeWrapper(...)`

    某些 stream helper 会有意保留在 provider 本地。当前的内置示例：
    `@openclaw/anthropic-provider` 从其公共 `api.ts` /
    `contract-api.ts` 接缝中导出
    `wrapAnthropicProviderStream`、`resolveAnthropicBetas`、
    `resolveAnthropicFastMode`、`resolveAnthropicServiceTier`，以及更底层的 Anthropic wrapper builder。这些 helper 仍然保持 Anthropic 专属，因为它们还编码了 Claude OAuth beta 处理和 `context1m` 门控。

    其他内置提供商也会在行为无法干净地跨家族共享时，将传输专属 wrapper 保留在本地。当前示例：内置 xAI 插件将原生 xAI Responses 整形保留在自己的
    `wrapStreamFn` 中，其中包括 `/fast` 别名重写、默认 `tool_stream`、不受支持的 strict-tool 清理，以及 xAI 专属 reasoning 载荷移除。

    `openclaw/plugin-sdk/provider-tools` 当前暴露了一个共享的
    工具 schema 家族，以及共享 schema / 兼容性 helper：

    - `ProviderToolCompatFamily` 记录了当前的共享家族清单。
    - `buildProviderToolCompatFamilyHooks("gemini")` 会为需要 Gemini 安全工具 schema 的提供商接入 Gemini schema 清理 + 诊断。
    - `normalizeGeminiToolSchemas(...)` 和 `inspectGeminiToolSchemas(...)`
      是底层公共 Gemini schema helper。
    - `resolveXaiModelCompatPatch()` 返回内置的 xAI 兼容性补丁：
      `toolSchemaProfile: "xai"`、不受支持的 schema 关键字、原生
      `web_search` 支持，以及 HTML entity 工具调用参数解码。
    - `applyXaiModelCompat(model)` 会在模型到达 runner 之前，将同样的 xAI 兼容性补丁应用到解析后的模型上。

    真实的内置示例：xAI 插件使用 `normalizeResolvedModel` 加
    `contributeResolvedModelCompat`，让这些兼容性元数据由提供商拥有，而不是在 core 中硬编码 xAI 规则。

    同样的 package-root 模式也支撑了其他内置提供商：

    - `@openclaw/openai-provider`：`api.ts` 导出 provider builder、
      默认模型 helper 和实时 provider builder
    - `@openclaw/openrouter-provider`：`api.ts` 导出 provider builder，
      以及新手引导 / 配置 helper

    <Tabs>
      <Tab title="Token 交换">
        对于需要在每次推理调用前进行 token 交换的提供商：

        ```typescript
        prepareRuntimeAuth: async (ctx) => {
          const exchanged = await exchangeToken(ctx.apiKey);
          return {
            apiKey: exchanged.token,
            baseUrl: exchanged.baseUrl,
            expiresAt: exchanged.expiresAt,
          };
        },
        ```
      </Tab>
      <Tab title="自定义 headers">
        对于需要自定义请求 header 或请求体修改的提供商：

        ```typescript
        // wrapStreamFn returns a StreamFn derived from ctx.streamFn
        wrapStreamFn: (ctx) => {
          if (!ctx.streamFn) return undefined;
          const inner = ctx.streamFn;
          return async (params) => {
            params.headers = {
              ...params.headers,
              "X-Acme-Version": "2",
            };
            return inner(params);
          };
        },
        ```
      </Tab>
      <Tab title="原生传输身份">
        对于需要在通用 HTTP 或 WebSocket 传输上附带原生请求 / 会话 header 或元数据的提供商：

        ```typescript
        resolveTransportTurnState: (ctx) => ({
          headers: {
            "x-request-id": ctx.turnId,
          },
          metadata: {
            session_id: ctx.sessionId ?? "",
            turn_id: ctx.turnId,
          },
        }),
        resolveWebSocketSessionPolicy: (ctx) => ({
          headers: {
            "x-session-id": ctx.sessionId ?? "",
          },
          degradeCooldownMs: 60_000,
        }),
        ```
      </Tab>
      <Tab title="用量与计费">
        对于暴露用量 / 计费数据的提供商：

        ```typescript
        resolveUsageAuth: async (ctx) => {
          const auth = await ctx.resolveOAuthToken();
          return auth ? { token: auth.token } : null;
        },
        fetchUsageSnapshot: async (ctx) => {
          return await fetchAcmeUsage(ctx.token, ctx.timeoutMs);
        },
        ```
      </Tab>
    </Tabs>

    <Accordion title="所有可用的提供商 hook">
      OpenClaw 会按以下顺序调用 hook。大多数提供商只会使用 2–3 个：

      | # | Hook | 何时使用 |
      | --- | --- | --- |
      | 1 | `catalog` | 模型目录或 base URL 默认值 |
      | 2 | `applyConfigDefaults` | 在配置物化期间应用提供商拥有的全局默认值 |
      | 3 | `normalizeModelId` | 在查找前清理旧式 / 预览 model-id 别名 |
      | 4 | `normalizeTransport` | 在通用模型组装前清理提供商族的 `api` / `baseUrl` |
      | 5 | `normalizeConfig` | 规范化 `models.providers.<id>` 配置 |
      | 6 | `applyNativeStreamingUsageCompat` | 对配置型提供商应用原生流式用量兼容性重写 |
      | 7 | `resolveConfigApiKey` | 提供商拥有的 env-marker 认证解析 |
      | 8 | `resolveSyntheticAuth` | 本地 / 自托管或配置支持的 synthetic 认证 |
      | 9 | `shouldDeferSyntheticProfileAuth` | 让 synthetic 已存储 profile 占位符在优先级上低于 env / config 认证 |
      | 10 | `resolveDynamicModel` | 接受任意上游模型 ID |
      | 11 | `prepareDynamicModel` | 在解析前异步获取元数据 |
      | 12 | `normalizeResolvedModel` | 在 runner 之前进行传输重写 |

    运行时回退说明：

    - `normalizeConfig` 会先检查匹配到的提供商，再检查其他
      具备相应 hook 能力的提供商插件，直到其中某一个真正修改了配置。
      如果没有任何提供商 hook 重写某个受支持的 Google 族配置项，
      内置 Google 配置规范化器仍然会生效。
    - `resolveConfigApiKey` 在 provider 暴露该 hook 时会使用它。内置的
      `amazon-bedrock` 路径在这里还有一个内建的 AWS env-marker 解析器，
      尽管 Bedrock 运行时认证本身仍然使用 AWS SDK 默认链。
      | 13 | `contributeResolvedModelCompat` | 为运行在另一兼容传输后的厂商模型提供兼容标志 |
      | 14 | `capabilities` | 旧式静态能力包；仅为兼容保留 |
      | 15 | `normalizeToolSchemas` | 在注册前清理提供商拥有的工具 schema |
      | 16 | `inspectToolSchemas` | 提供商拥有的工具 schema 诊断 |
      | 17 | `resolveReasoningOutputMode` | 带标签还是原生的 reasoning-output 契约 |
      | 18 | `prepareExtraParams` | 默认请求参数 |
      | 19 | `createStreamFn` | 完全自定义的 StreamFn 传输 |
      | 20 | `wrapStreamFn` | 正常 stream 路径上的自定义 headers / 请求体 wrapper |
      | 21 | `resolveTransportTurnState` | 原生每轮 headers / 元数据 |
      | 22 | `resolveWebSocketSessionPolicy` | 原生 WS 会话 headers / 冷却策略 |
      | 23 | `formatApiKey` | 自定义运行时 token 形态 |
      | 24 | `refreshOAuth` | 自定义 OAuth 刷新 |
      | 25 | `buildAuthDoctorHint` | 认证修复指引 |
      | 26 | `matchesContextOverflowError` | 提供商拥有的溢出检测 |
      | 27 | `classifyFailoverReason` | 提供商拥有的限流 / 过载分类 |
      | 28 | `isCacheTtlEligible` | 提示缓存 TTL 门控 |
      | 29 | `buildMissingAuthMessage` | 自定义缺失认证提示 |
      | 30 | `suppressBuiltInModel` | 隐藏过时上游条目 |
      | 31 | `augmentModelCatalog` | synthetic 前向兼容条目 |
      | 32 | `isBinaryThinking` | 二元 thinking 开 / 关 |
      | 33 | `supportsXHighThinking` | `xhigh` 推理支持 |
      | 34 | `resolveDefaultThinkingLevel` | 默认 `/think` 策略 |
      | 35 | `isModernModelRef` | live / smoke 模型匹配 |
      | 36 | `prepareRuntimeAuth` | 推理前 token 交换 |
      | 37 | `resolveUsageAuth` | 自定义用量凭证解析 |
      | 38 | `fetchUsageSnapshot` | 自定义用量端点 |
      | 39 | `createEmbeddingProvider` | 用于 memory / search 的提供商拥有 embedding 适配器 |
      | 40 | `buildReplayPolicy` | 自定义转录 replay / 压缩策略 |
      | 41 | `sanitizeReplayHistory` | 通用清理之后的提供商专属 replay 重写 |
      | 42 | `validateReplayTurns` | 嵌入式 runner 之前的严格 replay turn 校验 |
      | 43 | `onModelSelected` | 选择后的回调（例如遥测） |

      提示词调优说明：

      - `resolveSystemPromptContribution` 允许提供商为某个模型族注入感知缓存的
        system prompt 指引。当行为属于某个提供商 / 模型族并且应保留稳定 / 动态缓存拆分时，应优先使用它，而不是
        `before_prompt_build`。

      如需详细说明和真实示例，请参阅
      [插件内部机制](/zh-CN/plugins/architecture#provider-runtime-hooks)。
    </Accordion>

  </Step>

  <Step title="添加额外能力（可选）">
    <a id="step-5-add-extra-capabilities"></a>
    提供商插件除了文本推理外，还可以注册 Speech、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 抓取和 Web 搜索：

    ```typescript
    register(api) {
      api.registerProvider({ id: "acme-ai", /* ... */ });

      api.registerSpeechProvider({
        id: "acme-ai",
        label: "Acme Speech",
        isConfigured: ({ config }) => Boolean(config.messages?.tts),
        synthesize: async (req) => ({
          audioBuffer: Buffer.from(/* PCM data */),
          outputFormat: "mp3",
          fileExtension: ".mp3",
          voiceCompatible: false,
        }),
      });

      api.registerRealtimeTranscriptionProvider({
        id: "acme-ai",
        label: "Acme Realtime Transcription",
        isConfigured: () => true,
        createSession: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          close: () => {},
          isConnected: () => true,
        }),
      });

      api.registerRealtimeVoiceProvider({
        id: "acme-ai",
        label: "Acme Realtime Voice",
        isConfigured: ({ providerConfig }) => Boolean(providerConfig.apiKey),
        createBridge: (req) => ({
          connect: async () => {},
          sendAudio: () => {},
          setMediaTimestamp: () => {},
          submitToolResult: () => {},
          acknowledgeMark: () => {},
          close: () => {},
          isConnected: () => true,
        }),
      });

      api.registerMediaUnderstandingProvider({
        id: "acme-ai",
        capabilities: ["image", "audio"],
        describeImage: async (req) => ({ text: "A photo of..." }),
        transcribeAudio: async (req) => ({ text: "Transcript..." }),
      });

      api.registerImageGenerationProvider({
        id: "acme-ai",
        label: "Acme Images",
        generate: async (req) => ({ /* image result */ }),
      });

      api.registerVideoGenerationProvider({
        id: "acme-ai",
        label: "Acme Video",
        capabilities: {
          generate: {
            maxVideos: 1,
            maxDurationSeconds: 10,
            supportsResolution: true,
          },
          imageToVideo: {
            enabled: true,
            maxVideos: 1,
            maxInputImages: 1,
            maxDurationSeconds: 5,
          },
          videoToVideo: {
            enabled: false,
          },
        },
        generateVideo: async (req) => ({ videos: [] }),
      });

      api.registerWebFetchProvider({
        id: "acme-ai-fetch",
        label: "Acme Fetch",
        hint: "Fetch pages through Acme's rendering backend.",
        envVars: ["ACME_FETCH_API_KEY"],
        placeholder: "acme-...",
        signupUrl: "https://acme.example.com/fetch",
        credentialPath: "plugins.entries.acme.config.webFetch.apiKey",
        getCredentialValue: (fetchConfig) => fetchConfig?.acme?.apiKey,
        setCredentialValue: (fetchConfigTarget, value) => {
          const acme = (fetchConfigTarget.acme ??= {});
          acme.apiKey = value;
        },
        createTool: () => ({
          description: "Fetch a page through Acme Fetch.",
          parameters: {},
          execute: async (args) => ({ content: [] }),
        }),
      });

      api.registerWebSearchProvider({
        id: "acme-ai-search",
        label: "Acme Search",
        search: async (req) => ({ content: [] }),
      });
    }
    ```

    OpenClaw 会将其归类为**hybrid-capability** 插件。这是公司插件（每个厂商一个插件）的推荐模式。参见
    [内部机制：能力归属](/zh-CN/plugins/architecture#capability-ownership-model)。

    对于视频生成，优先使用上面展示的感知模式的能力结构：
    `generate`、`imageToVideo` 和 `videoToVideo`。像
    `maxInputImages`、`maxInputVideos` 和 `maxDurationSeconds`
    这样的扁平汇总字段，不足以清晰表达转换模式支持或禁用模式。

    音乐生成提供商也应遵循相同模式：
    `generate` 用于纯提示词生成，`edit` 用于基于参考图像的生成。
    像 `maxInputImages`、
    `supportsLyrics` 和 `supportsFormat` 这样的扁平汇总字段不足以表达 edit 支持；显式的 `generate` / `edit` 块才是预期契约。

  </Step>

  <Step title="测试">
    <a id="step-6-test"></a>
    ```typescript src/provider.test.ts
    import { describe, it, expect } from "vitest";
    // Export your provider config object from index.ts or a dedicated file
    import { acmeProvider } from "./provider.js";

    describe("acme-ai provider", () => {
      it("resolves dynamic models", () => {
        const model = acmeProvider.resolveDynamicModel!({
          modelId: "acme-beta-v3",
        } as any);
        expect(model.id).toBe("acme-beta-v3");
        expect(model.provider).toBe("acme-ai");
      });

      it("returns catalog when key is available", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: "test-key" }),
        } as any);
        expect(result?.provider?.models).toHaveLength(2);
      });

      it("returns null catalog when no key", async () => {
        const result = await acmeProvider.catalog!.run({
          resolveProviderApiKey: () => ({ apiKey: undefined }),
        } as any);
        expect(result).toBeNull();
      });
    });
    ```

  </Step>
</Steps>

## 发布到 ClawHub

提供商插件的发布方式与任何其他外部代码插件相同：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
```

这里不要使用旧式的仅 Skills 发布别名；插件包应使用
`clawhub package publish`。

## 文件结构

```
<bundled-plugin-root>/acme-ai/
├── package.json              # openclaw.providers 元数据
├── openclaw.plugin.json      # 带有 providerAuthEnvVars 的清单
├── index.ts                  # definePluginEntry + registerProvider
└── src/
    ├── provider.test.ts      # 测试
    └── usage.ts              # 用量端点（可选）
```

## 目录顺序参考

`catalog.order` 控制你的目录相对于内置
provider 的合并时机：

| 顺序 | 时机 | 用例 |
| --------- | ------------- | ----------------------------------------------- |
| `simple`  | 第一轮    | 普通 API key 提供商 |
| `profile` | 在 simple 之后  | 受 auth profile 门控的提供商 |
| `paired`  | 在 profile 之后 | 合成多个相关条目 |
| `late`    | 最后一轮    | 覆盖现有提供商（冲突时胜出） |

## 后续步骤

- [渠道插件](/zh-CN/plugins/sdk-channel-plugins) —— 如果你的插件还提供一个渠道
- [插件运行时辅助工具](/zh-CN/plugins/sdk-runtime) —— `api.runtime` helper（TTS、搜索、子智能体）
- [插件 SDK 概览](/zh-CN/plugins/sdk-overview) —— 完整子路径导入参考
- [插件内部机制](/zh-CN/plugins/architecture#provider-runtime-hooks) —— hook 细节和内置示例
