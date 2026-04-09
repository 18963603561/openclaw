---
read_when:
    - 你希望在工作流中加入一个仅输出 JSON 的 LLM 步骤
    - 你需要用于自动化的、经过 schema 校验的 LLM 输出
summary: 用于工作流的仅 JSON LLM 任务（可选插件工具）
title: LLM 任务
x-i18n:
    generated_at: "2026-04-09T00:57:15Z"
    model: gpt-5.4
    provider: openai
    source_hash: cbe9b286a8e958494de06a59b6e7b750a82d492158df344c7afe30fce24f0584
    source_path: tools\llm-task.md
    workflow: 15
---

# LLM 任务

`llm-task` 是一个**可选插件工具**，用于运行一个仅输出 JSON 的 LLM 任务，
并返回结构化输出（可选地根据 JSON Schema 进行校验）。

这非常适合 Lobster 这类工作流引擎：你可以添加一个单独的 LLM 步骤，
而无需为每个工作流编写自定义 OpenClaw 代码。

## 启用插件

1. 启用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 将该工具加入允许列表（它以 `optional: true` 注册）：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是一个由 `provider/model` 字符串组成的允许列表。如果设置了它，任何不在列表中的请求都会被拒绝。

## 工具参数

- `prompt`（string，必填）
- `input`（任意类型，可选）
- `schema`（object，可选的 JSON Schema）
- `provider`（string，可选）
- `model`（string，可选）
- `thinking`（string，可选）
- `authProfileId`（string，可选）
- `temperature`（number，可选）
- `maxTokens`（number，可选）
- `timeoutMs`（number，可选）

`thinking` 接受标准的 OpenClaw 推理预设，例如 `low` 或 `medium`。

## 输出

返回 `details.json`，其中包含解析后的 JSON（当提供 `schema` 时，还会依据其进行校验）。

## 示例：Lobster 工作流步骤

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## 安全说明

- 该工具是**仅 JSON**的，并会指示模型只输出 JSON（不使用代码围栏，不附带说明文字）。
- 本次运行不会向模型暴露任何工具。
- 除非你使用 `schema` 进行校验，否则应将输出视为不可信。
- 在任何会产生副作用的步骤（发送、发布、执行）之前，请先加入审批步骤。
