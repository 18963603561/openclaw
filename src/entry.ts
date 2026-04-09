#!/usr/bin/env node
import { spawn } from "node:child_process";
import { enableCompileCache } from "node:module";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isRootHelpInvocation, isRootVersionInvocation } from "./cli/argv.js";
import { parseCliContainerArgs, resolveCliContainerTarget } from "./cli/container-target.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
import { normalizeWindowsArgv } from "./cli/windows-argv.js";
import { buildCliRespawnPlan } from "./entry.respawn.js";
import { isTruthyEnvValue, normalizeEnv } from "./infra/env.js";
import { isMainModule } from "./infra/is-main.js";
import { ensureOpenClawExecMarkerOnProcess } from "./infra/openclaw-exec-env.js";
import { installProcessWarningFilter } from "./infra/warning-filter.js";
import { attachChildProcessBridge } from "./process/child-process-bridge.js";

/**
 * 入口包装器与真实入口文件的对应关系。
 * 用于判断当前模块是否由预期的 CLI 包装器触发。
 */
const ENTRY_WRAPPER_PAIRS = [
  { wrapperBasename: "openclaw.mjs", entryBasename: "entry.js" },
  { wrapperBasename: "openclaw.js", entryBasename: "entry.js" },
] as const;

/**
 * 判断当前命令是否需要将认证存储强制切换为只读模式。
 * 输入为完整命令行参数，输出为是否开启只读认证存储。
 * 目前仅对 `secrets audit` 子命令生效，避免审计流程意外修改本地认证状态。
 */
function shouldForceReadOnlyAuthStore(argv: string[]): boolean {
  // 仅保留位置参数，忽略可选标志位，便于识别子命令组合。
  const tokens = argv.slice(2).filter((token) => token.length > 0 && !token.startsWith("-"));
  for (let index = 0; index < tokens.length - 1; index += 1) {
    // 当命令链中包含 secrets audit 时，强制认证存储进入只读模式。
    if (tokens[index] === "secrets" && tokens[index + 1] === "audit") {
      return true;
    }
  }
  return false;
}

// 仅当当前文件作为主入口执行时才运行初始化逻辑。
// 打包产物可能会把 entry.js 作为共享依赖导入，如果没有这个保护，
// 下面的顶层启动代码会再次触发 runCli，导致重复拉起 gateway，
// 最终因为锁或端口冲突而使进程异常退出。
if (
  !isMainModule({
    currentFile: fileURLToPath(import.meta.url),
    wrapperEntryPairs: [...ENTRY_WRAPPER_PAIRS],
  })
) {
  // 作为依赖被导入时，跳过所有入口副作用，避免重复初始化。
} else {
  const { installGaxiosFetchCompat } = await import("./infra/gaxios-fetch-compat.js");

  // 安装 gaxios 与当前运行时 fetch 的兼容层，保证后续外部 HTTP 调用行为一致。
  await installGaxiosFetchCompat();
  process.title = "openclaw";
  ensureOpenClawExecMarkerOnProcess();
  installProcessWarningFilter();
  normalizeEnv();
  if (!isTruthyEnvValue(process.env.NODE_DISABLE_COMPILE_CACHE)) {
    try {
      // 启用编译缓存以减少后续模块加载开销，失败时不阻塞启动流程。
      enableCompileCache();
    } catch {
      // 编译缓存仅作为性能优化，初始化失败时保持静默并继续启动。
    }
  }

  if (shouldForceReadOnlyAuthStore(process.argv)) {
    // 审计类命令禁止写入认证存储，降低误修改风险。
    process.env.OPENCLAW_AUTH_STORE_READONLY = "1";
  }

  if (process.argv.includes("--no-color")) {
    // 显式关闭彩色输出，确保子流程与主流程的终端渲染行为一致。
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "0";
  }

  /**
   * 检查当前 CLI 是否需要先以受控方式重启。
   * 返回 true 表示父进程已完成子进程托管，当前流程应立即停止继续执行。
   */
  function ensureCliRespawnReady(): boolean {
    // 根据当前环境与参数构建重启方案；无需重启时直接返回。
    const plan = buildCliRespawnPlan();
    if (!plan) {
      return false;
    }

    // 通过子进程重新拉起 CLI，并继承标准输入输出，保证交互体验不变。
    const child = spawn(process.execPath, plan.argv, {
      stdio: "inherit",
      env: plan.env,
    });

    // 连接父子进程桥接逻辑，处理信号与生命周期同步。
    attachChildProcessBridge(child);

    child.once("exit", (code, signal) => {
      // 子进程若被信号终止，父进程统一按失败退出，避免误报成功。
      if (signal) {
        process.exitCode = 1;
        return;
      }
      process.exit(code ?? 1);
    });

    child.once("error", (error) => {
      // 子进程拉起失败时输出完整上下文与堆栈，便于排查启动问题。
      console.error(
        "[openclaw] Failed to respawn CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exit(1);
    });

    // 父进程已把执行权交给子进程，当前流程不能继续运行 CLI。
    return true;
  }

  /**
   * 处理根命令版本号的快速路径。
   * 当仅查询版本信息时，直接输出结果并退出，避免加载完整 CLI。
   */
  function tryHandleRootVersionFastPath(argv: string[]): boolean {
    // 容器目标模式有自己的解析路径，这里不抢先处理。
    if (resolveCliContainerTarget(argv)) {
      return false;
    }
    if (!isRootVersionInvocation(argv)) {
      return false;
    }
    // 并行加载版本号与提交哈希，缩短版本查询响应时间。
    Promise.all([import("./version.js"), import("./infra/git-commit.js")])
      .then(([{ VERSION }, { resolveCommitHash }]) => {
        const commit = resolveCommitHash({ moduleUrl: import.meta.url });
        console.log(commit ? `OpenClaw ${VERSION} (${commit})` : `OpenClaw ${VERSION}`);
        process.exit(0);
      })
      .catch((error) => {
        // 版本信息解析失败时保留详细堆栈，方便定位构建或发布问题。
        console.error(
          "[openclaw] Failed to resolve version:",
          error instanceof Error ? (error.stack ?? error.message) : error,
        );
        process.exitCode = 1;
      });
    return true;
  }

  process.argv = normalizeWindowsArgv(process.argv);

  if (!ensureCliRespawnReady()) {
    // 先解析容器目标相关参数，确保后续 CLI 看到的是规范化后的参数。
    const parsedContainer = parseCliContainerArgs(process.argv);
    if (!parsedContainer.ok) {
      console.error(`[openclaw] ${parsedContainer.error}`);
      process.exit(2);
    }

    // 解析 profile/dev 参数，并在真正进入 Commander 前移除这些前置标志。
    const parsed = parseCliProfileArgs(parsedContainer.argv);
    if (!parsed.ok) {
      // 这里仅输出基础错误，剩余更完整的帮助与报错交由 Commander 处理。
      console.error(`[openclaw] ${parsed.error}`);
      process.exit(2);
    }

    const containerTargetName = resolveCliContainerTarget(process.argv);
    if (containerTargetName && parsed.profile) {
      // 容器目标与 profile/dev 会同时影响运行环境，禁止混用以避免语义冲突。
      console.error("[openclaw] --container cannot be combined with --profile/--dev");
      process.exit(2);
    }

    if (parsed.profile) {
      // 将 profile 映射到环境变量，并同步更新 argv 供后续命令解析使用。
      applyCliProfileEnv({ profile: parsed.profile });
      // 保持 Commander 与当前文件中的手工 argv 判断逻辑一致。
      process.argv = parsed.argv;
    }

    if (!tryHandleRootVersionFastPath(process.argv)) {
      runMainOrRootHelp(process.argv);
    }
  }
}

/**
 * 处理根命令帮助信息的快速路径。
 * 命中后会异步输出帮助内容，并返回 true 表示调用方无需再继续主流程。
 */
export function tryHandleRootHelpFastPath(
  argv: string[],
  deps: {
    outputRootHelp?: () => void | Promise<void>;
    onError?: (error: unknown) => void;
    env?: NodeJS.ProcessEnv;
  } = {},
): boolean {
  // 容器目标有单独的帮助输出逻辑，避免在这里提前截获。
  if (resolveCliContainerTarget(argv, deps.env)) {
    return false;
  }
  if (!isRootHelpInvocation(argv)) {
    return false;
  }
  const handleError =
    deps.onError ??
    ((error: unknown) => {
      // 帮助信息输出失败时记录完整异常，便于排查动态导入或渲染问题。
      console.error(
        "[openclaw] Failed to display help:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
  if (deps.outputRootHelp) {
    // 调用方若提供了自定义帮助输出，则优先复用，避免重复加载模块。
    Promise.resolve()
      .then(() => deps.outputRootHelp?.())
      .catch(handleError);
    return true;
  }
  import("./cli/root-help-metadata.js")
    .then(async ({ outputPrecomputedRootHelpText }) => {
      // 优先输出预生成帮助文本，失败或缺失时再回退到动态生成逻辑。
      if (outputPrecomputedRootHelpText()) {
        return;
      }
      const { outputRootHelp } = await import("./cli/program/root-help.js");
      await outputRootHelp();
    })
    .catch(handleError);
  return true;
}

/**
 * 启动主 CLI，或在命中根帮助命令时优先输出帮助信息。
 */
function runMainOrRootHelp(argv: string[]): void {
  // 根帮助命令走快速路径，其余情况再加载完整 CLI 主入口。
  if (tryHandleRootHelpFastPath(argv)) {
    return;
  }
  import("./cli/run-main.js")
    .then(({ runCli }) => runCli(argv))
    .catch((error) => {
      // 主 CLI 启动失败时输出详细异常，便于定位入口初始化问题。
      console.error(
        "[openclaw] Failed to start CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
}
