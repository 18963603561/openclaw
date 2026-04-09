---
read_when:
    - 你需要跨多个文件进行结构化文件编辑
    - 你想文档化或调试基于补丁的编辑
summary: 使用 apply_patch 工具应用多文件补丁
title: apply_patch 工具
x-i18n:
    generated_at: "2026-04-08T07:16:06Z"
    model: gpt-5.4
    provider: openai
    source_hash: acca6e702e7ccdf132c71dc6d973f1d435ad6d772e1b620512c8969420cb8f7a
    source_path: tools\apply-patch.md
    workflow: 15
---

# apply_patch 工具

使用结构化补丁格式应用文件变更。这非常适合多文件
或多 hunk 编辑，因为在这种情况下，单次 `edit` 调用会比较脆弱。

该工具接受一个 `input` 字符串，用于包装一个或多个文件操作：

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## 参数

- `input`（必填）：完整补丁内容，包括 `*** Begin Patch` 和 `*** End Patch`。

## 说明

- 补丁路径支持相对路径（相对于工作区目录）和绝对路径。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（限制在工作区内）。仅当你有意让 `apply_patch` 在工作区目录之外写入 / 删除时，才将其设为 `false`。
- 如需重命名文件，请在 `*** Update File:` hunk 中使用 `*** Move to:`。
- 在需要时，`*** End of File` 可标记仅在 EOF 处插入的内容。
- 对 OpenAI 和 OpenAI Codex 模型默认可用。设置
  `tools.exec.applyPatch.enabled: false` 可禁用它。
- 也可以通过
  `tools.exec.applyPatch.allowModels`
  按模型进行门控。
- 配置仅位于 `tools.exec` 下。

## 示例

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```
