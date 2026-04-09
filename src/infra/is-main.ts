import fs from "node:fs";
import path from "node:path";

/**
 * 主模块判断所需的输入参数。
 * 支持调用方显式传入运行参数、环境变量和包装器映射，便于在不同启动场景复用。
 */
type IsMainModuleOptions = {
  /** 当前模块文件的绝对路径或可解析路径。 */
  currentFile: string;
  /** 当前进程的命令行参数，默认使用 process.argv。 */
  argv?: string[];
  /** 当前进程环境变量，默认使用 process.env。 */
  env?: NodeJS.ProcessEnv;
  /** 路径解析基准目录，默认使用当前工作目录。 */
  cwd?: string;
  /** 包装器入口与真实入口文件名的映射关系。 */
  wrapperEntryPairs?: Array<{
    /** 外层包装器文件名。 */
    wrapperBasename: string;
    /** 实际入口文件名。 */
    entryBasename: string;
  }>;
};

/**
 * 将候选路径规范化为稳定可比较的真实路径。
 * 当真实路径解析失败时，回退到 resolve 后的结果，避免因文件不存在而中断判断逻辑。
 */
function normalizePathCandidate(candidate: string | undefined, cwd: string): string | undefined {
  if (!candidate) {
    return undefined;
  }

  // 先基于当前工作目录解析出绝对路径，兼容相对路径输入。
  const resolved = path.resolve(cwd, candidate);
  try {
    // 优先使用真实路径，消除符号链接和大小写差异带来的误判。
    return fs.realpathSync.native(resolved);
  } catch {
    // 当路径暂时不存在或无法解析真实路径时，保留已解析的绝对路径继续比较。
    return resolved;
  }
}

/**
 * 判断当前模块是否作为主入口文件运行。
 * 兼容普通 Node 启动、PM2 包装启动以及自定义包装器导入真实入口的场景。
 */
export function isMainModule({
  currentFile,
  argv = process.argv,
  env = process.env,
  cwd = process.cwd(),
  wrapperEntryPairs = [],
}: IsMainModuleOptions): boolean {
  // 对当前模块路径与 argv[1] 做统一规范化，避免直接字符串比较不稳定。
  const normalizedCurrent = normalizePathCandidate(currentFile, cwd);
  const normalizedArgv1 = normalizePathCandidate(argv[1], cwd);

  // 常规 Node 启动场景下，当前文件与 argv[1] 指向同一路径即可认定为主模块。
  if (normalizedCurrent && normalizedArgv1 && normalizedCurrent === normalizedArgv1) {
    return true;
  }

  // PM2 会通过内部包装器启动脚本，此时 argv[1] 指向包装器路径。
  // 真实业务脚本路径会暴露在 pm_exec_path 中，需要额外纳入判断。
  const normalizedPmExecPath = normalizePathCandidate(env.pm_exec_path, cwd);
  if (normalizedCurrent && normalizedPmExecPath && normalizedCurrent === normalizedPmExecPath) {
    return true;
  }

  // 对于“包装器导入真实入口”的场景，允许通过文件名映射识别当前模块仍然是主入口。
  if (normalizedCurrent && normalizedArgv1 && wrapperEntryPairs.length > 0) {
    const currentBase = path.basename(normalizedCurrent);
    const argvBase = path.basename(normalizedArgv1);
    const matched = wrapperEntryPairs.some(
      ({ wrapperBasename, entryBasename }) =>
        currentBase === entryBasename && argvBase === wrapperBasename,
    );
    // 只要命中任意一组包装器与入口映射，就视为主模块运行。
    if (matched) {
      return true;
    }
  }

  return false;
}
