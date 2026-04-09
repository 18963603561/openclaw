import { isTruthyEnvValue } from "../infra/env.js";
import { defaultRuntime } from "../runtime.js";
import { resolveCliArgvInvocation } from "./argv-invocation.js";
import { hasFlag } from "./argv.js";
import {
  applyCliExecutionStartupPresentation,
  ensureCliExecutionBootstrap,
  resolveCliExecutionStartupContext,
} from "./command-execution-startup.js";
import { findRoutedCommand } from "./program/routes.js";

/**
 * 在命中路由命令后，提前完成执行所需的启动准备。
 * 包括展示层初始化、启动策略解析以及运行时与插件的预加载。
 */
async function prepareRoutedCommand(params: {
  argv: string[];
  commandPath: string[];
  loadPlugins?: boolean | ((argv: string[]) => boolean);
}) {
  // 根据当前参数、输出模式和环境变量解析路由执行时的启动策略。
  const { startupPolicy } = resolveCliExecutionStartupContext({
    argv: params.argv,
    jsonOutputMode: hasFlag(params.argv, "--json"),
    env: process.env,
    routeMode: true,
  });
  const { VERSION } = await import("../version.js");
  // 在真正执行命令前统一处理横幅、输出抑制等启动阶段展示逻辑。
  await applyCliExecutionStartupPresentation({
    argv: params.argv,
    routeLogsToStderrOnSuppress: false,
    startupPolicy,
    showBanner: process.stdout.isTTY && !startupPolicy.suppressDoctorStdout,
    version: VERSION,
  });
  const shouldLoadPlugins =
    typeof params.loadPlugins === "function" ? params.loadPlugins(params.argv) : params.loadPlugins;
  // 根据路由定义和启动策略完成 CLI 执行引导，确保运行时上下文已就绪。
  await ensureCliExecutionBootstrap({
    runtime: defaultRuntime,
    commandPath: params.commandPath,
    startupPolicy,
    loadPlugins: shouldLoadPlugins ?? startupPolicy.loadPlugins,
  });
}

/**
 * 尝试走“路由优先”执行路径。
 * 返回 `true` 表示已经命中并开始执行路由命令，返回 `false` 表示应继续走常规 Commander 解析流程。
 */
export async function tryRouteCli(argv: string[]): Promise<boolean> {
  // 允许通过环境变量显式关闭路由优先逻辑，便于调试或兼容特殊场景。
  if (isTruthyEnvValue(process.env.OPENCLAW_DISABLE_ROUTE_FIRST)) {
    return false;
  }
  const invocation = resolveCliArgvInvocation(argv);
  if (invocation.hasHelpOrVersion) {
    // 帮助与版本信息不进入路由分发，保持轻量且行为稳定。
    return false;
  }
  if (!invocation.commandPath[0]) {
    // 没有实际命令路径时无需路由，交给后续默认入口处理。
    return false;
  }
  const route = findRoutedCommand(invocation.commandPath);
  if (!route) {
    // 未匹配到路由命令时回退到常规命令注册与解析流程。
    return false;
  }
  // 命中路由后，先准备运行环境，再将控制权交给对应路由实现。
  await prepareRoutedCommand({
    argv,
    commandPath: invocation.commandPath,
    loadPlugins: route.loadPlugins,
  });
  return route.run(argv);
}
