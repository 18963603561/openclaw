---
read_when:
    - 查找公开发布渠道定义
    - 查找版本命名和发布节奏
summary: 公开发布渠道、版本命名和发布节奏
title: 发布策略
x-i18n:
    generated_at: "2026-04-08T07:02:34Z"
    model: gpt-5.4
    provider: openai
    source_hash: bb52a13264c802395aa55404c6baeec5c7b2a6820562e7a684057e70cc85668f
    source_path: reference\RELEASING.md
    workflow: 15
---

# 发布策略

OpenClaw 有三个公开发布通道：

- stable：带标签的发布，默认发布到 npm `beta`，或在明确指定时发布到 npm `latest`
- beta：预发布标签，发布到 npm `beta`
- dev：`main` 的持续更新头部版本

## 版本命名

- Stable 发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Stable 修正发布版本：`YYYY.M.D-N`
  - Git 标签：`vYYYY.M.D-N`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月和日不要补零
- `latest` 表示当前已提升为正式版的 stable npm 发布
- `beta` 表示当前 beta 安装目标
- Stable 和 stable 修正发布默认发布到 npm `beta`；发布操作员可以显式指定发布到 `latest`，或在之后提升一个经过验证的 beta 构建
- 每个 OpenClaw 发布都会同时交付 npm 包和 macOS 应用

## 发布节奏

- 发布先走 beta-first 流程
- 只有在最新 beta 通过验证后，stable 才会跟进
- 详细的发布流程、审批、凭证和恢复说明仅限维护者查看

## 发布前检查

- 在运行 `pnpm release:check` 之前先运行 `pnpm build && pnpm ui:build`，以确保打包校验步骤所需的 `dist/*` 发布产物和 Control UI bundle 已存在
- 每次带标签发布前都运行 `pnpm release:check`
- `main` 分支的 npm 预检还会在打包 tarball 前运行
  `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_CACHE_TEST=1 pnpm test:live:cache`，
  并使用 `OPENAI_API_KEY` 和
  `ANTHROPIC_API_KEY` workflow secrets
- 在审批前运行 `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  （或对应的 beta/修正标签）
- npm 发布后，运行
  `node --import tsx scripts/openclaw-npm-postpublish-verify.ts YYYY.M.D`
  （或对应的 beta/修正版本），以在全新的临时前缀中验证已发布注册表安装路径
- 维护者发布自动化现在采用“先预检，再提升”的方式：
  - 真正的 npm 发布必须通过成功的 npm `preflight_run_id`
  - stable npm 发布默认使用 `beta`
  - stable npm 发布可以通过 workflow 输入显式指定 `latest`
  - 仍然支持通过受信任的 `OpenClaw NPM Release` workflow，以显式手动模式将 stable npm 从 `beta` 提升到 `latest`
  - 该提升模式仍然需要 `npm-release` 环境中的有效 `NPM_TOKEN`，因为 npm `dist-tag` 管理独立于受信任发布
  - 公开的 `macOS Release` 仅执行验证
  - 真正的私有 mac 发布必须通过成功的私有 mac
    `preflight_run_id` 和 `validate_run_id`
  - 真正的发布路径会提升已准备好的产物，而不是再次重新构建它们
- 对于像 `YYYY.M.D-N` 这样的 stable 修正发布，发布后验证器还会检查从 `YYYY.M.D` 升级到 `YYYY.M.D-N` 的相同临时前缀升级路径，以确保发布修正不会悄悄让旧的全局安装继续停留在基础 stable 载荷上
- npm 发布预检会在 tarball 未包含 `dist/control-ui/index.html` 和非空的 `dist/control-ui/assets/` 载荷时直接失败，以避免再次发布一个空的浏览器仪表板
- 如果发布工作涉及 CI 规划、扩展时序清单或快速测试矩阵，请在审批前从 `.github/workflows/ci.yml` 重新生成并审查由 planner 管理的 `checks-fast-extensions`
  workflow matrix 输出，以免发布说明描述的是过期的 CI 布局
- Stable macOS 发布就绪还包括更新器相关界面：
  - GitHub release 最终必须包含打包好的 `.zip`、`.dmg` 和 `.dSYM.zip`
  - 发布后，`main` 上的 `appcast.xml` 必须指向新的 stable zip
  - 打包应用必须保持非 debug bundle id、非空的 Sparkle feed
    URL，以及不低于该发布版本规范 Sparkle build floor 的 `CFBundleVersion`

## NPM workflow 输入项

`OpenClaw NPM Release` 接受以下由操作员控制的输入项：

- `tag`：必需的发布标签，例如 `v2026.4.2`、`v2026.4.2-1`，或
  `v2026.4.2-beta.1`
- `preflight_only`：`true` 表示仅做验证/构建/打包，`false` 表示
  真正的发布路径
- `preflight_run_id`：在真正发布路径上为必需，这样 workflow 可以复用
  成功预检运行中准备好的 tarball
- `npm_dist_tag`：发布路径的 npm 目标标签；默认为 `beta`
- `promote_beta_to_latest`：`true` 表示跳过发布，并将已发布的
  stable `beta` 构建移动到 `latest`

规则：

- Stable 和修正标签可以发布到 `beta` 或 `latest`
- Beta 预发布标签只能发布到 `beta`
- 真正的发布路径必须使用与预检相同的 `npm_dist_tag`；
  workflow 会在继续发布前验证该元数据
- 提升模式必须使用 stable 或修正标签、`preflight_only=false`、
  空的 `preflight_run_id` 以及 `npm_dist_tag=beta`
- 提升模式还要求在 `npm-release`
  环境中有有效的 `NPM_TOKEN`，因为 `npm dist-tag add` 仍需要常规 npm 凭证

## Stable npm 发布顺序

在切 stable npm 发布时：

1. 运行 `OpenClaw NPM Release`，并设置 `preflight_only=true`
2. 在正常的 beta-first 流程中选择 `npm_dist_tag=beta`，或仅在你有意直接发布 stable 时选择 `latest`
3. 保存成功的 `preflight_run_id`
4. 再次运行 `OpenClaw NPM Release`，设置 `preflight_only=false`，并使用相同的
   `tag`、相同的 `npm_dist_tag` 以及保存的 `preflight_run_id`
5. 如果该发布落到了 `beta`，那么当你想把这个已发布构建移动到 `latest` 时，可稍后使用相同的 stable `tag`、`promote_beta_to_latest=true`、`preflight_only=false`、
   空的 `preflight_run_id` 和 `npm_dist_tag=beta`
   再运行一次 `OpenClaw NPM Release`

提升模式仍然需要 `npm-release` 环境审批，以及该环境中的有效
`NPM_TOKEN`。

这样可以让直接发布路径和 beta-first 提升路径都保持有文档说明且对操作员可见。

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者会使用私有发布文档
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的实际运行手册。
