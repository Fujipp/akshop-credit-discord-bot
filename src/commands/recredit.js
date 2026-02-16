const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');
const { channelRenameRateLimiter } = require('../utils/rateLimiter');
const { logger } = require('../utils/logger');

const CREDIT_PATH = 'features.creditReply';
const CHANNEL_NAME_PREFIX = '꒰💯꒱┆review 〻';

async function getLatestUserMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.find((m) => !m.author?.bot) || null;
}

async function applyLatestActions(channel, latestMessage, creditConfig, client) {
  if (!latestMessage) return { reacted: false, replied: false };

  // Apply reactions in parallel
  const reactions = Array.isArray(creditConfig.reactions) ? creditConfig.reactions : [];
  let reacted = false;

  if (reactions.length > 0) {
    const results = await Promise.allSettled(
      reactions.map(emoji => latestMessage.react(emoji))
    );
    reacted = results.some(r => r.status === 'fulfilled');
  }

  const replyMessage = (creditConfig.replyMessage || '').trim();
  let reply = null;

  if (replyMessage) {
    // Delete old reply if configured
    if (creditConfig.deleteOldReply && creditConfig.lastBotMessageId) {
      try {
        const oldMessage = await channel.messages.fetch(creditConfig.lastBotMessageId);
        if (oldMessage?.author?.id === client.user.id) {
          await oldMessage.delete();
        }
      } catch {
        // Message might be already deleted
      }
    }

    try {
      reply = await latestMessage.reply({ content: replyMessage });
      if (reply) {
        configManager.set(`${CREDIT_PATH}.lastBotMessageId`, reply.id);
      }
    } catch (error) {
      logger.error('Failed to send reply', 'CMD', error);
    }
  }

  return { reacted: reacted && reactions.length > 0, replied: Boolean(reply) };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recredit')
    .setDescription('Refresh review reply/reactions without changing the counter'),

  async execute(interaction) {
    if (!isAuthorized(interaction.member)) {
      return interaction.reply({ content: '❌ You are not allowed to use this command.', flags: MessageFlags.Ephemeral });
    }

    const credit = configManager.get(CREDIT_PATH) || {};
    if (!credit.channelId) {
      return interaction.reply({ content: '❌ Review channel not configured.', flags: MessageFlags.Ephemeral });
    }

    const channel = await interaction.client.channels.fetch(credit.channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Configured review channel is invalid.', flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({
      content: '⏳ กำลังรีเฟรชรีแอคชันและรีพายล่าสุด...',
      flags: MessageFlags.Ephemeral
    });

    const latestUserMessage = await getLatestUserMessage(channel);
    const currentCount = Number(credit.messageCount || 0);
    const targetName = `${CHANNEL_NAME_PREFIX}${currentCount}`;

    // Rate limited channel rename
    let channelRenamed = false;
    if (channel.name !== targetName) {
      const result = await channelRenameRateLimiter.executeIfAllowed(
        channel.id,
        () => channel.setName(targetName),
        2,
        600000
      );
      channelRenamed = result.executed;
    } else {
      channelRenamed = true;
    }

    const actionResult = await applyLatestActions(channel, latestUserMessage, credit, interaction.client);

    const lines = [
      `📊 Current messageCount: \`${currentCount}\``,
      channelRenamed ? `✅ Channel name: ${targetName}` : '⚠️ Channel rename rate limited',
      actionResult.reacted ? '✅ Reactions applied.' : 'ℹ️ No reactions applied.',
      actionResult.replied ? '✅ Reply sent.' : 'ℹ️ No reply sent.'
    ];

    if (!latestUserMessage) {
      lines.push('ℹ️ No user messages found to react or reply to.');
    }

    await interaction.editReply({ content: lines.join('\n') });
  }
};
