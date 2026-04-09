---
read_when:
    - 你需要了解某个 CI 作业为什么运行或没有运行
    - 你正在调试失败的 GitHub Actions 检查
summary: CI 作业图、范围门控和本地等效命令
title: CI 流水线
x-i18n:
    generated_at: "2026-04-08T03:49:40Z"
    model: gpt-5.4
    provider: openai
    source_hash: 5a95b6e584b4309bc249866ea436b4dfe30e0298ab8916eadbc344edae3d1194
    source_path: ci.md
    workflow: 15
---

# CI 流水线

CI 会在每次推送到 `main` 以及每个 pull request 上运行。它使用智能范围控制，在仅变更了不相关区域时跳过高开销作业。

## 作业概览

| 作业                      | 用途                                                                                      | 运行时机                            |
| ------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| `preflight`               | 检测仅文档变更、变更范围、变更的扩展，并构建 CI 清单                                     | 所有非草稿 push 和 PR               |
| `security-fast`           | 私钥检测、通过 `zizmor` 进行工作流审计、生产依赖审计                                     | 所有非草稿 push 和 PR               |
| `build-artifacts`         | 构建 `dist/` 和 Control UI 一次，并上传供下游作业复用的产物                              | 与 Node 相关的变更                  |
| `checks-fast-core`        | 快速 Linux 正确性路径，例如内置/插件契约/协议检查                                        | 与 Node 相关的变更                  |
| `checks-fast-extensions`  | 在 `checks-fast-extensions-shard` 完成后聚合扩展分片路径                                 | 与 Node 相关的变更                  |
| `extension-fast`          | 仅针对已变更内置插件的聚焦测试                                                           | 检测到扩展变更时                    |
| `check`                   | CI 中的主要本地门禁：`pnpm check` 加 `pnpm build:strict-smoke`                           | 与 Node 相关的变更                  |
| `check-additional`        | 架构与边界防护，以及 gateway watch 回归测试框架                                          | 与 Node 相关的变更                  |
| `build-smoke`             | 已构建 CLI 的冒烟测试和启动内存冒烟测试                                                  | 与 Node 相关的变更                  |
| `checks`                  | 更重的 Linux Node 路径：完整测试、渠道测试，以及仅 push 运行的 Node 22 兼容性检查        | 与 Node 相关的变更                  |
| `check-docs`              | 文档格式、lint 和失效链接检查                                                            | 文档发生变更时                      |
| `skills-python`           | 针对 Python 支持的 Skills 运行 Ruff + pytest                                             | 与 Python Skills 相关的变更         |
| `checks-windows`          | Windows 特定测试路径                                                                     | 与 Windows 相关的变更               |
| `macos-node`              | 使用共享构建产物的 macOS TypeScript 测试路径                                             | 与 macOS 相关的变更                 |
| `macos-swift`             | macOS 应用的 Swift lint、构建和测试                                                      | 与 macOS 相关的变更                 |
| `android`                 | Android 构建与测试矩阵                                                                   | 与 Android 相关的变更               |

## 失败优先顺序

作业的排序方式使得低成本检查会在高成本作业运行前先失败：

1. `preflight` 决定哪些路径实际存在。`docs-scope` 和 `changed-scope` 逻辑是该作业内部的步骤，不是独立作业。
2. `security-fast`、`check`、`check-additional`、`check-docs` 和 `skills-python` 会快速失败，而无需等待更重的产物和平台矩阵作业。
3. `build-artifacts` 会与快速 Linux 路径并行进行，这样下游消费者就可以在共享构建准备好后立即开始。
4. 更重的平台和运行时路径随后展开：`checks-fast-core`、`checks-fast-extensions`、`extension-fast`、`checks`、`checks-windows`、`macos-node`、`macos-swift` 和 `android`。

范围逻辑位于 `scripts/ci-changed-scope.mjs`，并由 `src/scripts/ci-changed-scope.test.ts` 中的单元测试覆盖。
独立的 `install-smoke` 工作流通过其自己的 `preflight` 作业复用同一范围脚本。它根据更窄的 changed-smoke 信号计算 `run_install_smoke`，因此 Docker/安装冒烟测试仅会在安装、打包和容器相关变更时运行。

在 push 上，`checks` 矩阵会增加仅限 push 的 `compat-node22` 路径。在 pull request 上，该路径会被跳过，矩阵会专注于常规测试/渠道路径。

## 运行器

| 运行器                           | 作业                                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `blacksmith-16vcpu-ubuntu-2404`  | `preflight`、`security-fast`、`build-artifacts`、Linux 检查、文档检查、Python Skills、`android`    |
| `blacksmith-32vcpu-windows-2025` | `checks-windows`                                                                                     |
| `macos-latest`                   | `macos-node`、`macos-swift`                                                                          |

## 本地等效命令

```bash
pnpm check          # types + lint + format
pnpm build:strict-smoke
pnpm test:gateway:watch-regression
pnpm test           # vitest tests
pnpm test:channels
pnpm check:docs     # docs format + lint + broken links
pnpm build          # 当 CI 的 artifact/build-smoke 路径相关时构建 dist
```
