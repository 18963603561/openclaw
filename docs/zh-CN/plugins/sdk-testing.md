---
read_when:
    - 你正在为插件编写测试
    - 你需要插件 SDK 中的测试工具
    - 你想了解内置插件的契约测试
sidebarTitle: Testing
summary: OpenClaw 插件的测试工具与模式
title: 插件 SDK 测试
x-i18n:
    generated_at: "2026-04-08T06:48:08Z"
    model: gpt-5.4
    provider: openai
    source_hash: 2e95ed58ed180feadad17bb5138bd09e3b45f1f3ecdff4e2fba4874bb80099fe
    source_path: plugins\sdk-testing.md
    workflow: 15
---

# 插件测试

这是 OpenClaw 插件测试工具、模式和 lint 约束的参考说明。

<Tip>
  **想看测试示例？** 操作指南中包含完整测试示例：
  [渠道插件测试](/zh-CN/plugins/sdk-channel-plugins#step-6-test) 和
  [提供商插件测试](/zh-CN/plugins/sdk-provider-plugins#step-6-test)。
</Tip>

## 测试工具

**导入：** `openclaw/plugin-sdk/testing`

testing 子路径为插件作者导出了一组精简的辅助工具：

```typescript
import {
  installCommonResolveTargetErrorCases,
  shouldAckReaction,
  removeAckReactionAfterReply,
} from "openclaw/plugin-sdk/testing";
```

### 可用导出

| 导出 | 用途 |
| -------------------------------------- | ------------------------------------------------------ |
| `installCommonResolveTargetErrorCases` | 目标解析错误处理的共享测试用例 |
| `shouldAckReaction` | 检查某个渠道是否应添加 ack reaction |
| `removeAckReactionAfterReply` | 在回复投递后移除 ack reaction |

### 类型

testing 子路径还会重新导出一些对测试文件有用的类型：

```typescript
import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
  OpenClawConfig,
  PluginRuntime,
  RuntimeEnv,
  MockFn,
} from "openclaw/plugin-sdk/testing";
```

## 测试目标解析

使用 `installCommonResolveTargetErrorCases` 为渠道目标解析添加标准错误场景：

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/testing";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // Your channel's target resolution logic
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // Add channel-specific test cases
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## 测试模式

### 渠道插件的单元测试

```typescript
import { describe, it, expect, vi } from "vitest";

describe("my-channel plugin", () => {
  it("should resolve account from config", () => {
    const cfg = {
      channels: {
        "my-channel": {
          token: "test-token",
          allowFrom: ["user1"],
        },
      },
    };

    const account = myPlugin.setup.resolveAccount(cfg, undefined);
    expect(account.token).toBe("test-token");
  });

  it("should inspect account without materializing secrets", () => {
    const cfg = {
      channels: {
        "my-channel": { token: "test-token" },
      },
    };

    const inspection = myPlugin.setup.inspectAccount(cfg, undefined);
    expect(inspection.configured).toBe(true);
    expect(inspection.tokenStatus).toBe("available");
    // No token value exposed
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### 提供商插件的单元测试

```typescript
import { describe, it, expect } from "vitest";

describe("my-provider plugin", () => {
  it("should resolve dynamic models", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... context
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("should return catalog when API key is available", async () => {
    const result = await myProvider.catalog.run({
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
      // ... context
    });

    expect(result?.provider?.models).toHaveLength(2);
  });
});
```

### Mock 插件运行时

对于使用 `createPluginRuntimeStore` 的代码，请在测试中 mock 运行时：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>("test runtime not set");

// In test setup
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... other mocks
  },
  config: {
    loadConfig: vi.fn(),
    writeConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### 使用按实例 stub 进行测试

优先使用按实例 stub，而不是修改原型：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 契约测试（仓库内插件）

内置插件带有契约测试，用于验证注册归属关系：

```bash
pnpm test -- src/plugins/contracts/
```

这些测试会断言：

- 哪些插件注册了哪些 providers
- 哪些插件注册了哪些语音 providers
- 注册形状是否正确
- 运行时契约是否合规

### 运行作用域测试

针对特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

仅运行契约测试：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Lint 约束（仓库内插件）

对于仓库内插件，`pnpm check` 会强制执行三条规则：

1. **禁止整体根导入** —— 不允许使用 `openclaw/plugin-sdk` 根 barrel 导入
2. **禁止直接导入 `src/`** —— 插件不能直接导入 `../../src/`
3. **禁止自导入** —— 插件不能导入自己的 `plugin-sdk/<name>` 子路径

外部插件不受这些 lint 规则限制，但仍建议遵循相同模式。

## 测试配置

OpenClaw 使用 Vitest，并启用 V8 覆盖率阈值。对于插件测试：

```bash
# Run all tests
pnpm test

# Run specific plugin tests
pnpm test -- <bundled-plugin-root>/my-channel/src/channel.test.ts

# Run with a specific test name filter
pnpm test -- <bundled-plugin-root>/my-channel/ -t "resolves account"

# Run with coverage
pnpm test:coverage
```

如果本地运行导致内存压力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相关内容

- [插件 SDK 概览](/zh-CN/plugins/sdk-overview) -- 导入约定
- [渠道插件 SDK](/zh-CN/plugins/sdk-channel-plugins) -- 渠道插件接口
- [提供商插件 SDK](/zh-CN/plugins/sdk-provider-plugins) -- 提供商插件 hooks
- [构建插件](/zh-CN/plugins/building-plugins) -- 入门指南
