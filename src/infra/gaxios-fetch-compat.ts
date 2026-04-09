import { createRequire } from "node:module";
import type { ConnectionOptions } from "node:tls";
import { pathToFileURL } from "node:url";
import type { Dispatcher } from "undici";
import { asNullableObjectRecord } from "../shared/record-coerce.js";

type ProxyRule = RegExp | URL | string;
type TlsCert = ConnectionOptions["cert"];
type TlsKey = ConnectionOptions["key"];
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * gaxios 在运行时可能透传的扩展 fetch 配置。
 * 这里显式补齐代理、证书和自定义 fetch 等字段，便于兼容转换。
 */
type GaxiosFetchRequestInit = RequestInit & {
  agent?: unknown;
  cert?: TlsCert;
  dispatcher?: Dispatcher;
  fetchImplementation?: FetchLike;
  key?: TlsKey;
  noProxy?: ProxyRule[];
  proxy?: string | URL;
};

/**
 * 兼容旧式代理 agent 的最小结构。
 * 只关心代理地址以及代理连接阶段可能使用的 TLS 证书。
 */
type ProxyAgentLike = {
  connectOpts?: { cert?: TlsCert; key?: TlsKey };
  proxy: URL;
};

/**
 * 兼容普通 TLS agent 的最小结构。
 * 用于从 agent.options 中提取客户端证书与私钥。
 */
type TlsAgentLike = {
  options?: { cert?: TlsCert; key?: TlsKey };
};

/**
 * gaxios 原型上默认适配器的最小结构约束。
 * 安装兼容补丁时只依赖这个方法是否存在。
 */
type GaxiosPrototype = {
  _defaultAdapter: (this: unknown, config: GaxiosFetchRequestInit) => Promise<unknown>;
};

type GaxiosConstructor = {
  prototype: GaxiosPrototype;
};

const TEST_GAXIOS_CONSTRUCTOR_OVERRIDE = "__OPENCLAW_TEST_GAXIOS_CONSTRUCTOR__";

/**
 * 记录兼容补丁的安装状态，避免重复打补丁或并发安装。
 */
let installState: "not-installed" | "installing" | "shimmed" | "installed" = "not-installed";

type UndiciRuntimeDeps = {
  UndiciAgent: typeof import("undici").Agent;
  ProxyAgent: typeof import("undici").ProxyAgent;
};

/**
 * 判断对象是否已经具备 undici Dispatcher 形状。
 */
function hasDispatcher(value: unknown): value is Dispatcher {
  const record = asNullableObjectRecord(value);
  return record !== null && typeof record.dispatch === "function";
}

/**
 * 判断对象是否符合“包含代理地址”的代理 agent 结构。
 */
function hasProxyAgentShape(value: unknown): value is ProxyAgentLike {
  const record = asNullableObjectRecord(value);
  return record !== null && record.proxy instanceof URL;
}

/**
 * 判断对象是否符合“包含 TLS options”的普通 agent 结构。
 */
function hasTlsAgentShape(value: unknown): value is TlsAgentLike {
  const record = asNullableObjectRecord(value);
  return record !== null && asNullableObjectRecord(record.options) !== null;
}

/**
 * 解析请求最终应使用的 TLS 客户端证书配置。
 * 优先使用 init 中显式传入的 cert/key，其次尝试从 agent 中提取。
 */
function resolveTlsOptions(
  init: GaxiosFetchRequestInit,
  url: URL,
): { cert?: TlsCert; key?: TlsKey } {
  const explicit = {
    cert: init.cert,
    key: init.key,
  };
  if (explicit.cert !== undefined || explicit.key !== undefined) {
    return explicit;
  }

  const agent = typeof init.agent === "function" ? init.agent(url) : init.agent;
  if (hasProxyAgentShape(agent)) {
    return {
      cert: agent.connectOpts?.cert,
      key: agent.connectOpts?.key,
    };
  }
  if (hasTlsAgentShape(agent)) {
    return {
      cert: agent.options?.cert,
      key: agent.options?.key,
    };
  }
  return {};
}

/**
 * 判断目标 URL 是否允许走代理。
 * 同时支持显式 noProxy 规则和环境变量中的 NO_PROXY/no_proxy。
 */
function urlMayUseProxy(url: URL, noProxy: ProxyRule[] = []): boolean {
  const rules = [...noProxy];
  const envRules = (process.env.NO_PROXY ?? process.env.no_proxy)?.split(",") ?? [];
  for (const rule of envRules) {
    const trimmed = rule.trim();
    if (trimmed.length > 0) {
      rules.push(trimmed);
    }
  }

  for (const rule of rules) {
    if (rule instanceof RegExp) {
      if (rule.test(url.toString())) {
        return false;
      }
      continue;
    }
    if (rule instanceof URL) {
      if (rule.origin === url.origin) {
        return false;
      }
      continue;
    }
    if (rule.startsWith("*.") || rule.startsWith(".")) {
      const cleanedRule = rule.replace(/^\*\./, ".");
      if (url.hostname.endsWith(cleanedRule)) {
        return false;
      }
      continue;
    }
    if (rule === url.origin || rule === url.hostname || rule === url.href) {
      return false;
    }
  }

  return true;
}

/**
 * 解析请求应使用的代理地址。
 * 优先读取 init.proxy，其次回退到环境变量中的 HTTP(S)_PROXY。
 */
function resolveProxyUri(init: GaxiosFetchRequestInit, url: URL): string | undefined {
  if (init.proxy) {
    const proxyUri = String(init.proxy);
    return urlMayUseProxy(url, init.noProxy) ? proxyUri : undefined;
  }

  const envProxy =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;
  if (!envProxy) {
    return undefined;
  }

  return urlMayUseProxy(url, init.noProxy) ? envProxy : undefined;
}

/**
 * 按需加载 undici 运行时依赖，避免模块顶层提前绑定。
 */
function loadUndiciRuntimeDeps(): UndiciRuntimeDeps {
  const require = createRequire(import.meta.url);
  const undici = require("undici") as typeof import("undici");
  return {
    ProxyAgent: undici.ProxyAgent,
    UndiciAgent: undici.Agent,
  };
}

/**
 * 将 gaxios 风格的代理/TLS 配置转换为 undici Dispatcher。
 * 这样底层 fetch 就能正确处理代理、客户端证书等能力。
 */
function buildDispatcher(init: GaxiosFetchRequestInit, url: URL): Dispatcher | undefined {
  if (init.dispatcher) {
    return init.dispatcher;
  }

  const agent = typeof init.agent === "function" ? init.agent(url) : init.agent;
  if (hasDispatcher(agent)) {
    return agent;
  }

  const { cert, key } = resolveTlsOptions(init, url);
  const proxyUri =
    resolveProxyUri(init, url) ?? (hasProxyAgentShape(agent) ? String(agent.proxy) : undefined);
  if (proxyUri) {
    const { ProxyAgent } = loadUndiciRuntimeDeps();
    return new ProxyAgent({
      requestTls: cert !== undefined || key !== undefined ? { cert, key } : undefined,
      uri: proxyUri,
    });
  }

  if (cert !== undefined || key !== undefined) {
    const { UndiciAgent } = loadUndiciRuntimeDeps();
    return new UndiciAgent({
      connect: { cert, key },
    });
  }

  return undefined;
}

/**
 * 判断异常是否属于模块未找到错误。
 */
function isModuleNotFoundError(err: unknown): err is NodeJS.ErrnoException {
  const record = asNullableObjectRecord(err);
  return (
    record !== null &&
    (record.code === "ERR_MODULE_NOT_FOUND" || record.code === "MODULE_NOT_FOUND")
  );
}

/**
 * 判断值是否具备可打补丁的 gaxios 构造器结构。
 */
function hasGaxiosConstructorShape(value: unknown): value is GaxiosConstructor {
  return (
    typeof value === "function" &&
    "prototype" in value &&
    asNullableObjectRecord(value.prototype) !== null &&
    typeof value.prototype._defaultAdapter === "function"
  );
}

/**
 * 测试场景允许通过全局变量覆盖 gaxios 构造器，便于隔离运行时依赖。
 */
function getTestGaxiosConstructorOverride(): GaxiosConstructor | null | undefined {
  const testGlobal = globalThis as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(testGlobal, TEST_GAXIOS_CONSTRUCTOR_OVERRIDE)) {
    return undefined;
  }
  const override = testGlobal[TEST_GAXIOS_CONSTRUCTOR_OVERRIDE];
  if (override === null) {
    return null;
  }
  if (hasGaxiosConstructorShape(override)) {
    return override;
  }
  throw new Error("invalid gaxios test constructor override");
}

/**
 * 判断异常是否表示直接导入 gaxios 失败。
 * 这种情况下兼容层可以静默降级，而不是直接中断启动。
 */
function isDirectGaxiosImportMiss(err: unknown): boolean {
  if (!isModuleNotFoundError(err)) {
    return false;
  }
  return (
    typeof err.message === "string" &&
    (err.message.includes("Cannot find package 'gaxios'") ||
      err.message.includes("Cannot find module 'gaxios'"))
  );
}

/**
 * 加载 gaxios 构造器。
 * 测试环境优先使用覆盖值；生产环境则通过 require.resolve 精确定位后动态导入。
 */
async function loadGaxiosConstructor(): Promise<GaxiosConstructor | null> {
  const testOverride = getTestGaxiosConstructorOverride();
  if (testOverride !== undefined) {
    return testOverride;
  }

  try {
    const require = createRequire(import.meta.url);
    const resolvedPath = require.resolve("gaxios");
    const mod = await import(pathToFileURL(resolvedPath).href);
    const candidate = asNullableObjectRecord(mod)?.Gaxios;
    if (!hasGaxiosConstructorShape(candidate)) {
      throw new Error("gaxios: missing Gaxios export");
    }
    return candidate;
  } catch (err) {
    if (isDirectGaxiosImportMiss(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * 为依赖 window.fetch 的旧逻辑补一个最小 window 对象。
 * 仅在 Node 环境且尚未存在 window 时启用。
 */
function installLegacyWindowFetchShim(): void {
  if (
    typeof globalThis.fetch !== "function" ||
    typeof (globalThis as Record<string, unknown>).window !== "undefined"
  ) {
    return;
  }
  (globalThis as Record<string, unknown>).window = { fetch: globalThis.fetch };
}

/**
 * 创建兼容 gaxios 扩展参数的 fetch 实现。
 * 该包装器会把 agent/cert/proxy 等字段转成 undici 可识别的 dispatcher。
 */
export function createGaxiosCompatFetch(
  baseFetch: FetchLike = globalThis.fetch.bind(globalThis),
): FetchLike {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const gaxiosInit = (init ?? {}) as GaxiosFetchRequestInit;
    const requestUrl =
      input instanceof Request
        ? new URL(input.url)
        : new URL(typeof input === "string" ? input : input.toString());
    const dispatcher = buildDispatcher(gaxiosInit, requestUrl);

    // 移除 gaxios 私有扩展字段，避免原生 fetch 接收到未知参数。
    const nextInit: RequestInit = { ...gaxiosInit };
    delete (nextInit as GaxiosFetchRequestInit).agent;
    delete (nextInit as GaxiosFetchRequestInit).cert;
    delete (nextInit as GaxiosFetchRequestInit).fetchImplementation;
    delete (nextInit as GaxiosFetchRequestInit).key;
    delete (nextInit as GaxiosFetchRequestInit).noProxy;
    delete (nextInit as GaxiosFetchRequestInit).proxy;

    if (dispatcher) {
      (nextInit as RequestInit & { dispatcher: Dispatcher }).dispatcher = dispatcher;
    }

    return baseFetch(input, nextInit);
  };
}

/**
 * 安装 gaxios 与原生 fetch 的兼容补丁。
 * 命中后会把 gaxios 默认适配器改写为使用兼容 fetch，从而支持代理和 TLS 配置透传。
 */
export async function installGaxiosFetchCompat(): Promise<void> {
  // 已安装、正在安装，或当前环境根本没有 fetch 时，直接跳过。
  if (installState !== "not-installed" || typeof globalThis.fetch !== "function") {
    return;
  }

  installState = "installing";

  try {
    const Gaxios = await loadGaxiosConstructor();
    if (!Gaxios) {
      // 未安装 gaxios 时退化为只补 window.fetch，兼容依赖旧全局形状的代码。
      installLegacyWindowFetchShim();
      installState = "shimmed";
      return;
    }

    const prototype = Gaxios.prototype;
    const originalDefaultAdapter = prototype._defaultAdapter;
    const compatFetch = createGaxiosCompatFetch();

    prototype._defaultAdapter = function patchedDefaultAdapter(
      this: unknown,
      config: GaxiosFetchRequestInit,
    ): Promise<unknown> {
      // 调用方若已显式提供 fetchImplementation，则尊重原配置，不重复包裹。
      if (config.fetchImplementation) {
        return originalDefaultAdapter.call(this, config);
      }
      return originalDefaultAdapter.call(this, {
        ...config,
        fetchImplementation: compatFetch,
      });
    };

    installState = "installed";
  } catch (err) {
    // 安装失败时回滚状态，保证后续仍可重试安装。
    installState = "not-installed";
    throw err;
  }
}

export const __testing = {
  /**
   * 重置安装状态，便于测试用例在不同场景下重复验证安装流程。
   */
  resetGaxiosFetchCompatForTests(): void {
    installState = "not-installed";
  },
};
