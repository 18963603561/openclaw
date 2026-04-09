import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CommanderError } from "commander";
import type { OpenClawConfig } from "../config/config.js";
import { resolveStateDir } from "../config/paths.js";
import { normalizeEnv } from "../infra/env.js";
import { formatUncaughtError } from "../infra/errors.js";
import { isMainModule } from "../infra/is-main.js";
import { ensureOpenClawCliOnPath } from "../infra/path-env.js";
import { assertSupportedRuntime } from "../infra/runtime-guard.js";
import { enableConsoleCapture } from "../logging.js";
import { hasMemoryRuntime } from "../plugins/memory-state.js";
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalLowercaseString,
  normalizeOptionalString,
} from "../shared/string-coerce.js";
import { resolveCliArgvInvocation } from "./argv-invocation.js";
import {
  shouldRegisterPrimaryCommandOnly,
  shouldSkipPluginCommandRegistration,
} from "./command-registration-policy.js";
import { shouldEnsureCliPathForCommandPath } from "./command-startup-policy.js";
import { maybeRunCliInContainer, parseCliContainerArgs } from "./container-target.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";
import { tryRouteCli } from "./route.js";
import { normalizeWindowsArgv } from "./windows-argv.js";

/**
 * 关闭 CLI 运行期间可能创建的内存管理器。
 * 用途：在短生命周期命令结束时尽力释放插件侧的内存搜索资源，避免残留句柄影响进程退出。
 */
async function closeCliMemoryManagers(): Promise<void> {
  if (!hasMemoryRuntime()) {
    return;
  }
  try {
    const { closeActiveMemorySearchManagers } = await import("../plugins/memory-runtime.js");
    await closeActiveMemorySearchManagers();
  } catch {
    // 这里采用尽力而为的清理策略，避免清理失败反过来影响 CLI 主流程退出。
  }
}

/**
 * 将兼容参数 `--update` 改写为 Commander 可识别的子命令 `update`。
 * 用途：兼容历史调用方式，同时复用统一的命令解析流程。
 */
export function rewriteUpdateFlagArgv(argv: string[]): string[] {
  const index = argv.indexOf("--update");
  if (index === -1) {
    return argv;
  }

  const next = [...argv];
  next.splice(index, 1, "update");
  return next;
}

/**
 * 判断当前命令是否需要确保 `openclaw` 已写入 PATH。
 * 仅在真正执行命令时处理，帮助信息与版本信息场景会直接跳过。
 */
export function shouldEnsureCliPath(argv: string[]): boolean {
  const invocation = resolveCliArgvInvocation(argv);
  if (invocation.hasHelpOrVersion) {
    return false;
  }
  return shouldEnsureCliPathForCommandPath(invocation.commandPath);
}

/**
 * 判断是否命中根命令帮助的快速路径。
 * 命中后可直接输出预生成帮助信息，减少完整命令树初始化开销。
 */
export function shouldUseRootHelpFastPath(argv: string[]): boolean {
  return resolveCliArgvInvocation(argv).isRootHelpInvocation;
}

/**
 * 根据插件配置生成“命令不可用”的提示信息。
 * 返回 `null` 表示当前命令缺失不是由显式配置禁用导致。
 */
export function resolveMissingPluginCommandMessage(
  pluginId: string,
  config?: OpenClawConfig,
): string | null {
  const normalizedPluginId = normalizeLowercaseStringOrEmpty(pluginId);
  if (!normalizedPluginId) {
    return null;
  }
  const allow =
    Array.isArray(config?.plugins?.allow) && config.plugins.allow.length > 0
      ? config.plugins.allow
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => normalizeOptionalLowercaseString(entry))
          .filter(Boolean)
      : [];
  if (allow.length > 0 && !allow.includes(normalizedPluginId)) {
    return (
      `The \`openclaw ${normalizedPluginId}\` command is unavailable because ` +
      `\`plugins.allow\` excludes "${normalizedPluginId}". Add "${normalizedPluginId}" to ` +
      `\`plugins.allow\` if you want that bundled plugin CLI surface.`
    );
  }
  if (config?.plugins?.entries?.[normalizedPluginId]?.enabled === false) {
    return (
      `The \`openclaw ${normalizedPluginId}\` command is unavailable because ` +
      `\`plugins.entries.${normalizedPluginId}.enabled=false\`. Re-enable that entry if you want ` +
      "the bundled plugin CLI surface."
    );
  }
  return null;
}

/**
 * 判断是否需要加载 CLI 侧 `.env` 文件。
 * 优先检查当前工作目录，其次检查状态目录，兼容不同运行入口。
 */
function shouldLoadCliDotEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  if (existsSync(path.join(process.cwd(), ".env"))) {
    return true;
  }
  return existsSync(path.join(resolveStateDir(env), ".env"));
}

/**
 * CLI 主入口。
 * 负责参数预处理、运行环境准备、命令注册、路由分发以及统一异常收口。
 */
export async function runCli(argv: string[] = process.argv) {
  // 在 Windows 平台先标准化参数，避免不同 Shell 下的转义差异影响后续解析。
  const originalArgv = normalizeWindowsArgv(argv);
  const parsedContainer = parseCliContainerArgs(originalArgv);
  if (!parsedContainer.ok) {
    throw new Error(parsedContainer.error);
  }
  const parsedProfile = parseCliProfileArgs(parsedContainer.argv);
  if (!parsedProfile.ok) {
    throw new Error(parsedProfile.error);
  }
  if (parsedProfile.profile) {
    // 先应用 profile 环境变量，再继续后续命令解析，确保配置读取一致。
    applyCliProfileEnv({ profile: parsedProfile.profile });
  }
  const containerTargetName =
    parsedContainer.container ?? normalizeOptionalString(process.env.OPENCLAW_CONTAINER) ?? null;
  if (containerTargetName && parsedProfile.profile) {
    // 容器目标与 profile 会同时影响运行上下文，禁止混用以避免语义冲突。
    throw new Error("--container cannot be combined with --profile/--dev");
  }

  const containerTarget = maybeRunCliInContainer(originalArgv);
  if (containerTarget.handled) {
    // 如果命令已经在容器分支中处理完成，则直接透传退出码并结束当前进程逻辑。
    if (containerTarget.exitCode !== 0) {
      process.exitCode = containerTarget.exitCode;
    }
    return;
  }
  let normalizedArgv = parsedProfile.argv;

  if (shouldLoadCliDotEnv()) {
    // 存在本地环境文件时静默加载，避免污染正常命令输出。
    const { loadCliDotEnv } = await import("./dotenv.js");
    loadCliDotEnv({ quiet: true });
  }
  normalizeEnv();
  if (shouldEnsureCliPath(normalizedArgv)) {
    // 仅在需要执行 CLI 命令时确保 PATH 已包含 openclaw，减少无意义副作用。
    ensureOpenClawCliOnPath();
  }

  // 在执行任何实际业务前校验最低运行时版本，避免后续出现难定位的不兼容问题。
  assertSupportedRuntime();

  try {
    if (shouldUseRootHelpFastPath(normalizedArgv)) {
      const { outputPrecomputedRootHelpText } = await import("./root-help-metadata.js");
      if (!outputPrecomputedRootHelpText()) {
        const { outputRootHelp } = await import("./program/root-help.js");
        await outputRootHelp();
      }
      return;
    }

    if (await tryRouteCli(normalizedArgv)) {
      return;
    }

    // 将控制台输出同时纳入结构化日志，既保留终端表现，也提升可观测性。
    enableConsoleCapture();

    const [{ buildProgram }, { installUnhandledRejectionHandler }, { restoreTerminalState }] =
      await Promise.all([
        import("./program.js"),
        import("../infra/unhandled-rejections.js"),
        import("../terminal/restore.js"),
      ]);
    const program = buildProgram();

    // 注册全局异步异常处理，避免未处理 Promise 拒绝导致静默失败。
    installUnhandledRejectionHandler();

    process.on("uncaughtException", (error) => {
      // 捕获未处理异常时输出上下文并恢复终端状态，避免终端残留异常模式。
      console.error("[openclaw] Uncaught exception:", formatUncaughtError(error));
      restoreTerminalState("uncaught exception", { resumeStdinIfPaused: false });
      process.exit(1);
    });

    const parseArgv = rewriteUpdateFlagArgv(normalizedArgv);
    const invocation = resolveCliArgvInvocation(parseArgv);
    // 先按主命令进行最小化注册，保证懒加载模式下帮助与命令解析仍然正确。
    const { primary } = invocation;
    if (primary && shouldRegisterPrimaryCommandOnly(parseArgv)) {
      const { getProgramContext } = await import("./program/program-context.js");
      const ctx = getProgramContext(program);
      if (ctx) {
        const { registerCoreCliByName } = await import("./program/command-registry.js");
        await registerCoreCliByName(program, ctx, primary, parseArgv);
      }
      const { registerSubCliByName } = await import("./program/register.subclis.js");
      await registerSubCliByName(program, primary);
    }

    const hasBuiltinPrimary =
      primary !== null && program.commands.some((command) => command.name() === primary);
    const shouldSkipPluginRegistration = shouldSkipPluginCommandRegistration({
      argv: parseArgv,
      primary,
      hasBuiltinPrimary,
    });
    if (!shouldSkipPluginRegistration) {
      // 在正式解析前补充插件命令注册，确保插件命令能进入同一套 Commander 流程。
      const { registerPluginCliCommandsFromValidatedConfig } = await import("../plugins/cli.js");
      const config = await registerPluginCliCommandsFromValidatedConfig(
        program,
        undefined,
        undefined,
        {
          mode: "lazy",
          primary,
        },
      );
      if (config) {
        if (primary && !program.commands.some((command) => command.name() === primary)) {
          // 当目标命令不存在时，进一步判断是否是因为插件配置显式禁用，给出更准确提示。
          const missingPluginCommandMessage = resolveMissingPluginCommandMessage(primary, config);
          if (missingPluginCommandMessage) {
            throw new Error(missingPluginCommandMessage);
          }
        }
      }
    }

    try {
      await program.parseAsync(parseArgv);
    } catch (error) {
      if (!(error instanceof CommanderError)) {
        throw error;
      }
      // Commander 自带的退出属于预期控制流，这里仅透传退出码，不再重复包装异常。
      process.exitCode = error.exitCode;
    }
  } finally {
    // 无论命令成功还是失败，都尝试关闭内存相关资源，避免句柄泄漏。
    await closeCliMemoryManagers();
  }
}

/**
 * 判断当前文件是否作为 CLI 主模块直接执行。
 * 用途：支持被导入复用时避免重复触发主入口逻辑。
 */
export function isCliMainModule(): boolean {
  return isMainModule({ currentFile: fileURLToPath(import.meta.url) });
}
