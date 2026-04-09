---
read_when:
    - 你想在 OpenClaw 中使用 Qwen
    - 你之前使用过 Qwen OAuth
summary: 通过 OpenClaw 内置的 qwen 提供商使用 Qwen Cloud
title: Qwen
x-i18n:
    generated_at: "2026-04-08T06:57:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: f175793693ab6a4c3f1f4d42040e673c15faf7603a500757423e9e06977c989d
    source_path: providers\qwen.md
    workflow: 15
---

# Qwen

<Warning>

**Qwen OAuth 已被移除。** 使用 `portal.qwen.ai` 端点的免费层 OAuth 集成
（`qwen-portal`）现已不可用。背景信息请参见 [Issue #49557](https://github.com/openclaw/openclaw/issues/49557)。

</Warning>

## 推荐：Qwen Cloud

OpenClaw 现在将 Qwen 视为一个一等内置提供商，其规范 id
为 `qwen`。该内置提供商面向 Qwen Cloud / Alibaba DashScope 和
Coding Plan 端点，并保留旧版 `modelstudio` id 作为兼容别名。

- 提供商：`qwen`
- 首选环境变量：`QWEN_API_KEY`
- 同时接受以保持兼容：`MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY`
- API 风格：兼容 OpenAI

如果你想使用 `qwen3.6-plus`，优先选择**标准版（按量付费）**端点。
Coding Plan 对公共目录的支持可能会滞后。

```bash
# Global Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key

# China Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key-cn

# Global Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key

# China Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key-cn
```

旧版 `modelstudio-*` auth-choice id 和 `modelstudio/...` 模型引用仍然可作为兼容别名使用，但新的设置流程应优先使用规范的
`qwen-*` auth-choice id 和 `qwen/...` 模型引用。

完成新手引导后，设置一个默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "qwen/qwen3.5-plus" },
    },
  },
}
```

## 计划类型与端点

| 计划类型                    | 区域   | auth choice                | 端点                                             |
| --------------------------- | ------ | -------------------------- | ------------------------------------------------ |
| 标准版（按量付费）          | 中国   | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| 标准版（按量付费）          | 全球   | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan（订阅制）       | 中国   | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan（订阅制）       | 全球   | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

该提供商会根据你的 auth choice 自动选择端点。规范选项使用
`qwen-*` 系列；`modelstudio-*` 仅保留用于兼容。
你也可以在配置中通过自定义 `baseUrl` 进行覆盖。

原生 Model Studio 端点会在共享 `openai-completions` 传输上声明流式用量兼容性。OpenClaw 现在会依据端点能力来判断，因此指向相同原生 host 的兼容 DashScope 自定义提供商 id 也会继承相同的流式用量行为，而不再必须特定使用内置的 `qwen` 提供商 id。

## 获取你的 API 密钥

- **管理密钥**：[home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys)
- **文档**：[docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)

## 内置目录

OpenClaw 当前内置了以下 Qwen 目录：

| 模型引用                    | 输入        | 上下文长度  | 说明                                               |
| --------------------------- | ----------- | ----------- | -------------------------------------------------- |
| `qwen/qwen3.5-plus`         | text, image | 1,000,000   | 默认模型                                           |
| `qwen/qwen3.6-plus`         | text, image | 1,000,000   | 需要此模型时优先使用标准版端点                     |
| `qwen/qwen3-max-2026-01-23` | text        | 262,144     | Qwen Max 系列                                      |
| `qwen/qwen3-coder-next`     | text        | 262,144     | 编码                                               |
| `qwen/qwen3-coder-plus`     | text        | 1,000,000   | 编码                                               |
| `qwen/MiniMax-M2.5`         | text        | 1,000,000   | 已启用推理                                         |
| `qwen/glm-5`                | text        | 202,752     | GLM                                                |
| `qwen/glm-4.7`              | text        | 202,752     | GLM                                                |
| `qwen/kimi-k2.5`            | text, image | 262,144     | 通过 Alibaba 提供的 Moonshot AI                    |

即使某个模型出现在内置目录中，其可用性仍可能因端点和计费方案不同而变化。

原生流式用量兼容性同时适用于 Coding Plan hosts 和标准版 DashScope 兼容 hosts：

- `https://coding.dashscope.aliyuncs.com/v1`
- `https://coding-intl.dashscope.aliyuncs.com/v1`
- `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## Qwen 3.6 Plus 可用性

`qwen3.6-plus` 可在标准版（按量付费）Model Studio
端点上使用：

- 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
- 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

如果 Coding Plan 端点对 `qwen3.6-plus` 返回“unsupported model”错误，请切换到标准版（按量付费），而不是继续使用 Coding Plan
端点 / 密钥组合。

## 能力规划

`qwen` 扩展正被定位为完整 Qwen
Cloud 能力面的厂商归属入口，而不仅仅是编码 / 文本模型。

- 文本 / 聊天模型：现已内置
- 工具调用、结构化输出、thinking：继承自兼容 OpenAI 的传输
- 图像生成：计划在提供商插件层实现
- 图像 / 视频理解：现已在标准版端点内置
- 语音 / 音频：计划在提供商插件层实现
- 记忆 embeddings / 重排序：计划通过 embedding 适配器界面实现
- 视频生成：现已通过共享视频生成能力内置

## 多模态附加能力

`qwen` 扩展现在还暴露了：

- 通过 `qwen-vl-max-latest` 提供的视频理解
- 通过以下模型提供的 Wan 视频生成：
  - `wan2.6-t2v`（默认）
  - `wan2.6-i2v`
  - `wan2.6-r2v`
  - `wan2.6-r2v-flash`
  - `wan2.7-r2v`

这些多模态界面使用的是**标准版** DashScope 端点，而不是
Coding Plan 端点。

- 全球 / 国际标准版 base URL：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- 中国标准版 base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`

对于视频生成，OpenClaw 会先将已配置的 Qwen 区域映射到对应的
DashScope AIGC host，然后再提交任务：

- 全球 / 国际：`https://dashscope-intl.aliyuncs.com`
- 中国：`https://dashscope.aliyuncs.com`

这意味着，即使普通的 `models.providers.qwen.baseUrl` 指向的是
Coding Plan 或标准版 Qwen hosts，视频生成仍会保持使用正确的区域性 DashScope 视频端点。

对于视频生成，请显式设置一个默认模型：

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

当前内置 Qwen 视频生成限制：

- 每次请求最多 **1** 个输出视频
- 最多 **1** 张输入图像
- 最多 **4** 个输入视频
- 最长 **10 秒** 时长
- 支持 `size`、`aspectRatio`、`resolution`、`audio` 和 `watermark`
- 参考图像 / 视频模式当前要求使用**远程 http(s) URL**。本地
  文件路径会被直接拒绝，因为 DashScope 视频端点不接受为这些参考上传本地缓冲区。

有关共享工具参数、提供商选择和故障转移行为，请参见
[视频生成](/zh-CN/tools/video-generation)。

## 环境说明

如果 Gateway 网关以守护进程方式运行（launchd / systemd），请确保 `QWEN_API_KEY`
对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过
`env.shellEnv` 提供）。
