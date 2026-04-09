import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { formatHelpExamples } from "../help-format.js";
import type { ProgramContext } from "./context.js";
import { createMessageCliHelpers } from "./message/helpers.js";
import { registerMessageBroadcastCommand } from "./message/register.broadcast.js";
import { registerMessageDiscordAdminCommands } from "./message/register.discord-admin.js";
import {
  registerMessageEmojiCommands,
  registerMessageStickerCommands,
} from "./message/register.emoji-sticker.js";
import {
  registerMessagePermissionsCommand,
  registerMessageSearchCommand,
} from "./message/register.permissions-search.js";
import { registerMessagePinCommands } from "./message/register.pins.js";
import { registerMessagePollCommand } from "./message/register.poll.js";
import { registerMessageReactionsCommands } from "./message/register.reactions.js";
import { registerMessageReadEditDeleteCommands } from "./message/register.read-edit-delete.js";
import { registerMessageSendCommand } from "./message/register.send.js";
import { registerMessageThreadCommands } from "./message/register.thread.js";

/**
 * 注册 message 主命令及其全部消息相关子命令。
 *
 * 用途：
 * 为 CLI 挂载统一的 `message` 命令入口，并把发送、广播、投票、反应、置顶、
 * 搜索、线程、表情、贴纸、Discord 管理等子能力集中注册到同一命令树下。
 *
 * 输入：
 * - program：Commander 根命令对象，用于继续挂载一级命令。
 * - ctx：程序上下文，提供消息命令可用的渠道配置等共享信息。
 *
 * 输出：
 * - 无返回值。该方法通过副作用把 `message` 命令及其子命令注册到 `program`。
 *
 * 边界与注意事项：
 * - 当用户只输入 `openclaw message` 时，不执行业务逻辑，而是直接显示帮助信息。
 * - 所有子命令复用同一份 helpers，确保参数解析与渠道能力判断保持一致。
 *
 * 示例：
 * - `openclaw message send --target +15555550123 --message "Hi"`
 * - `openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza`
 * - `openclaw message react --channel discord --target 123 --message-id 456 --emoji "👍"`
 */
export function registerMessageCommands(program: Command, ctx: ProgramContext) {
  // 在根程序上创建 message 一级命令，作为所有消息能力的统一入口。
  const message = program
    // 注册主命令名称，后续所有子命令都会挂在该命令之下。
    .command("message")
    // 设置主命令说明，帮助用户快速理解该命令负责“消息发送与管理”。
    .description("Send, read, and manage messages and channel actions")
    // 追加命令帮助尾部内容，集中展示常见示例和文档入口。
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Examples:")}
${formatHelpExamples([
  ['openclaw message send --target +15555550123 --message "Hi"', "Send a text message."],
  [
    'openclaw message send --target +15555550123 --message "Hi" --media photo.jpg',
    "Send a message with media.",
  ],
  [
    'openclaw message poll --channel discord --target channel:123 --poll-question "Snack?" --poll-option Pizza --poll-option Sushi',
    "Create a Discord poll.",
  ],
  [
    'openclaw message react --channel discord --target 123 --message-id 456 --emoji "✅"',
    "React to a message.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/message", "docs.openclaw.ai/cli/message")}`,
    )
    // 当用户只执行 `openclaw message` 时，主动展示帮助，避免落入空执行状态。
    .action(() => {
      // 使用 Commander 的帮助输出能力，并按错误退出码结束当前调用。
      message.help({ error: true });
    });

  // 创建消息命令共享辅助对象，统一承载渠道选项、参数拼装与公共能力。
  const helpers = createMessageCliHelpers(message, ctx.messageChannelOptions);
  // 注册消息发送命令，例如 `openclaw message send --target +15555550123 --message "Hi"`。
  registerMessageSendCommand(message, helpers);
  // 注册批量广播命令，用于一次向多个目标分发相同消息。
  registerMessageBroadcastCommand(message, helpers);
  // 注册投票命令，例如在 Discord 频道内创建投票。
  registerMessagePollCommand(message, helpers);
  // 注册消息反应相关命令，例如为指定消息添加或移除 emoji 反应。
  registerMessageReactionsCommands(message, helpers);
  // 注册消息读取、编辑、删除命令，覆盖消息生命周期中的常见操作。
  registerMessageReadEditDeleteCommands(message, helpers);
  // 注册消息置顶相关命令，用于管理频道内的重要消息。
  registerMessagePinCommands(message, helpers);
  // 注册消息权限查询或调整命令，用于检查当前目标的发送权限。
  registerMessagePermissionsCommand(message, helpers);
  // 注册消息搜索命令，支持按条件检索历史消息。
  registerMessageSearchCommand(message, helpers);
  // 注册消息线程相关命令，用于创建、查看和管理线程会话。
  registerMessageThreadCommands(message, helpers);
  // 注册自定义表情相关命令，便于管理频道内可用 emoji 资源。
  registerMessageEmojiCommands(message, helpers);
  // 注册贴纸相关命令，补充除文本与表情之外的消息素材能力。
  registerMessageStickerCommands(message, helpers);
  // 注册 Discord 管理类消息命令，处理仅 Discord 渠道支持的补充能力。
  registerMessageDiscordAdminCommands(message, helpers);
}
