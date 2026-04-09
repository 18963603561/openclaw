import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import {
  CHANNEL_MESSAGE_ACTION_NAMES,
  type ChannelMessageActionName,
} from "../channels/plugins/types.js";
import { resolveCommandConfigWithSecrets } from "../cli/command-config-resolution.js";
import { getScopedChannelsCommandSecretTargets } from "../cli/command-secret-targets.js";
import { resolveMessageSecretScope } from "../cli/message-secret-scope.js";
import { createOutboundSendDeps, type CliDeps } from "../cli/outbound-send-deps.js";
import { withProgress } from "../cli/progress.js";
import { loadConfig } from "../config/config.js";
import type { OutboundSendDeps } from "../infra/outbound/deliver.js";
import { runMessageAction } from "../infra/outbound/message-action-runner.js";
import { type RuntimeEnv, writeRuntimeJson } from "../runtime.js";
import {
  normalizeLowercaseStringOrEmpty,
  normalizeOptionalString,
} from "../shared/string-coerce.js";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel.js";
import { buildMessageCliJson, formatMessageCliText } from "./message-format.js";

/**
 * 处理 CLI 层的 message 命令入口。
 *
 * 用途：
 * - 读取并补全命令配置与密钥
 * - 解析并校验消息动作类型
 * - 组装发送依赖与网关上下文
 * - 调用动作调度层执行 send、poll、broadcast 等动作
 * - 按 `--json` 或文本模式输出结果
 *
 * 输入：
 * - opts：CLI 解析后的命令参数，例如 `channel`、`target`、`message`、`json`
 * - deps：CLI 运行依赖，例如日志、网络、文件系统能力
 * - runtime：运行时输出对象，用于打印日志或 JSON
 *
 * 输出：
 * - 无显式返回值，通过运行时输出最终结果
 *
 * 示例：
 * - `openclaw message --channel telegram --target +15555550123 --message "你好"`
 * - `openclaw message --action poll --channel discord --target channel:123 --poll-question "午饭吃什么" --poll-option 米饭 --poll-option 面条`
 * - `openclaw message --action broadcast --targets +15550001,+15550002 --message "统一通知"`
 */
export async function messageCommand(
  opts: Record<string, unknown>,
  deps: CliDeps,
  runtime: RuntimeEnv,
) {
  // 读取原始配置，作为后续密钥解析与命令执行的基础配置。
  const loadedRaw = loadConfig();
  // 根据渠道、目标与账号推导密钥作用域，避免误读其他渠道或其他账号的敏感配置。
  const scope = resolveMessageSecretScope({
    channel: opts.channel,
    target: opts.target,
    targets: opts.targets,
    accountId: opts.accountId,
  });
  // 按消息命令的作用域收窄可访问的密钥目标集合。
  const scopedTargets = getScopedChannelsCommandSecretTargets({
    config: loadedRaw,
    channel: scope.channel,
    accountId: scope.accountId,
  });
  // 解析命令执行所需的有效配置，并在需要时自动启用命令依赖的密钥能力。
  const { effectiveConfig: cfg } = await resolveCommandConfigWithSecrets({
    config: loadedRaw,
    commandName: "message",
    targetIds: scopedTargets.targetIds,
    ...(scopedTargets.allowedPaths ? { allowedPaths: scopedTargets.allowedPaths } : {}),
    runtime,
    autoEnable: true,
  });
  // 读取原始动作名；未指定时默认走 send。
  const rawAction = normalizeOptionalString(opts.action) ?? "";
  const actionInput = rawAction || "send";
  // 统一转成小写，便于与标准动作枚举做大小写无关匹配。
  const normalizedActionInput = normalizeLowercaseStringOrEmpty(actionInput);
  // 在支持的消息动作列表中查找用户输入对应的标准动作名。
  const actionMatch = (CHANNEL_MESSAGE_ACTION_NAMES as readonly string[]).find(
    (name) => normalizeLowercaseStringOrEmpty(name) === normalizedActionInput,
  );
  if (!actionMatch) {
    throw new Error(`Unknown message action: ${actionInput}`);
  }
  const action = actionMatch as ChannelMessageActionName;

  // 将 CLI 侧依赖转换为发送基础设施可识别的依赖对象。
  const outboundDeps: OutboundSendDeps = createOutboundSendDeps(deps);

  // 把真正的动作执行封装成可复用函数，便于后续按需套上进度条。
  const run = async () =>
    // 调用动作调度层，根据 action 分发到 send、poll、broadcast 或插件动作。
    await runMessageAction({
      cfg,
      action,
      params: opts,
      deps: outboundDeps,
      // 解析默认 agent，用于会话归属、媒体权限与路由策略。
      agentId: resolveDefaultAgentId(cfg),
      gateway: {
        clientName: GATEWAY_CLIENT_NAMES.CLI,
        mode: GATEWAY_CLIENT_MODES.CLI,
      },
    });

  const json = opts.json === true;
  const dryRun = opts.dryRun === true;
  const needsSpinner = !json && !dryRun && (action === "send" || action === "poll");

  const result = needsSpinner
    // 对耗时且面向终端用户的发送/投票动作显示进度提示，提升交互体验。
    ? await withProgress(
        {
          label: action === "poll" ? "Sending poll..." : "Sending...",
          indeterminate: true,
          enabled: true,
        },
        run,
      )
    // 不需要进度条时直接执行动作，避免额外的终端输出干扰。
    : await run();

  if (json) {
    // JSON 模式下构建结构化输出，便于脚本或其他程序消费。
    writeRuntimeJson(runtime, buildMessageCliJson(result));
    return;
  }

  // 文本模式下逐行格式化输出，保持 CLI 结果易读。
  for (const line of formatMessageCliText(result)) {
    // 通过运行时日志接口输出到终端或宿主环境。
    runtime.log(line);
  }
}
