# `src/cli/run-main.ts` 初学者阅读说明

## 1. 这个文件的职责
`run-main.ts` 是 OpenClaw CLI 的主入口调度文件。它自己并不直接实现具体业务命令，而是负责把“用户输入的命令行参数”整理干净，然后决定程序应该走哪条启动路径，例如：容器执行、快速路由、帮助信息、Commander 正常解析、插件命令注册，以及最终的异常收口和资源清理。

## 2. 程序启动流程
大致流程可以按下面顺序理解：

`runCli(argv)`  
→ 标准化 Windows 参数 `normalizeWindowsArgv()`  
→ 解析 `--container` 参数 `parseCliContainerArgs()`  
→ 解析 `--profile/--dev` 参数 `parseCliProfileArgs()`  
→ 如果指定 profile，则先写入环境变量 `applyCliProfileEnv()`  
→ 如果命中容器模式，则交给 `maybeRunCliInContainer()`，当前进程直接结束  
→ 按需加载 `.env`、规范化环境变量 `normalizeEnv()`  
→ 按命令类型决定是否确保 `openclaw` 已在 PATH 中  
→ 校验运行时版本 `assertSupportedRuntime()`  
→ 如果是根帮助命令，走帮助快速路径 `shouldUseRootHelpFastPath()`  
→ 如果命中“路由优先”的命令，走 `tryRouteCli()`  
→ 启用控制台捕获 `enableConsoleCapture()`  
→ 动态导入并构建 Commander 程序 `buildProgram()`  
→ 安装未处理 Promise 拒绝与未捕获异常处理器  
→ 必要时只注册主命令，减少启动开销  
→ 按需注册插件命令  
→ `program.parseAsync()` 开始正式解析和执行  
→ `finally` 中关闭内存管理器 `closeCliMemoryManagers()`

## 3. 关键函数和调用顺序
最核心的函数是 `runCli()`，其余函数大多是在帮助它做“分流”。

- `rewriteUpdateFlagArgv()`：把兼容参数 `--update` 改写成子命令 `update`
- `shouldEnsureCliPath()`：判断当前命令是否需要先确保 `openclaw` 在 PATH 中
- `shouldUseRootHelpFastPath()`：判断是否可以跳过完整初始化，直接输出根帮助
- `resolveMissingPluginCommandMessage()`：当插件命令不存在时，判断是不是被配置禁用了
- `closeCliMemoryManagers()`：CLI 退出前尽力释放内存相关资源
- `isCliMainModule()`：判断当前文件是不是作为主模块直接执行

如果只记一条主线，可以记成：  
“参数预处理 → 环境准备 → 特殊路径短路 → 构建 Commander → 注册命令 → 解析执行 → 统一清理”。

## 4. 它依赖了哪些重要模块
- `src/cli/profile.ts`：处理 `--profile`、`--dev`
- `src/cli/container-target.ts`：处理 `--container`，必要时转到容器内执行
- `src/cli/route.ts`：尝试走“路由优先”快速执行
- `src/cli/argv-invocation.ts`：从 argv 中提取主命令、命令路径、help/version 状态
- `src/cli/command-registration-policy.ts`：决定是否只注册主命令、是否跳过插件命令注册
- `src/cli/program/build-program.ts`：真正创建 Commander 的 `program`
- `src/plugins/cli.ts`：按配置注册插件 CLI 命令
- `src/infra/runtime-guard.ts`：校验 Node 运行时版本
- `src/logging.ts`：把控制台输出纳入日志体系

## 5. 读代码时最容易困惑的地方
- 这个文件不是“业务入口”，而是“启动调度入口”，很多真正干活的逻辑都在动态导入的模块里。
- 它有多条“提前返回”路径：容器模式、根帮助快速路径、路由优先路径，所以程序不一定会走到 `buildProgram()`。
- “路由优先”和 “Commander 解析” 是两套执行入口；前者更轻、更快，后者更通用。
- 命令注册不是一次性全量完成的，代码在尽量做“按需注册”和“懒加载”。
- 插件命令不存在时，不一定是代码没写，也可能是配置里被禁用了，所以有 `resolveMissingPluginCommandMessage()` 这层补充判断。
- `tryHandleRootVersionFastPath` 这个名字容易让人以为只有版本号有快速路径，但当前文件里你更应该重点关注的是“根帮助快速路径”和“路由优先路径”这两个真正影响主流程的分支。
