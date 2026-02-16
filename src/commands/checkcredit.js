const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const configManager = require('../utils/configManager');
const { isAuthorized } = require('../utils/permissions');
const { channelRenameRateLimiter } = require('../utils/rateLimiter');
const { logger } = require('../utils/logger');

const CREDIT_PATH = 'features.creditReply';
const CHANNEL_NAME_PREFIX = '꒰💯꒱┆review 〻';

function formatChannelName(count) {
  return `${CHANNEL_NAME_PREFIX}${count}`;
}

async function countUserMessages(channel, progressCallback = null) {
  let total = 0;
  let before;
  let batchCount = 0;

  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    total += messages.filter((m) => !m.author?.bot).size;
    batchCount++;

    // Report progress every 5 batches (500 messages)
    if (progressCallback && batchCount % 5 === 0) {
      await progressCallback(total);
    }

    if (messages.size < 100) break;

    before = messages.last().id;
  }

  return total;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkcredit')
    .setDescription('Count all user messages in the review channel and sync the counter'),

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
      content: '⏳ กำลังตรวจนับข้อความในห้องรีวิว...',
      flags: MessageFlags.Ephemeral
    });

    // Count messages with progress updates
    const totalMessages = await countUserMessages(channel, async (count) => {
      await interaction.editReply({
        content: `⏳ กำลังตรวจนับ... (${count} ข้อความ)`
      }).catch(() => { });
    });

    configManager.set(`${CREDIT_PATH}.messageCount`, totalMessages);

    // Rename channel (rate limited)
    const targetName = formatChannelName(totalMessages);
    let channelRenamed = false;

    if (channel.name !== targetName) {
      const result = await channelRenameRateLimiter.executeIfAllowed(
        channel.id,
        () => channel.setName(targetName),
        2,
        600000
      );
      channelRenamed = result.executed;

      if (!result.executed && result.reason === 'rate_limited') {
        logger.rateLimit('channel_rename', channel.id);
      }
    } else {
      channelRenamed = true; // Already correct name
    }

    const response = [
      `✅ Synced review counter to \`${totalMessages}\` based on user messages.`
    ];

    if (channelRenamed) {
      response.push(`🔄 Channel name: ${targetName}`);
    } else {
      response.push(`⚠️ Channel rename rate limited. Name will update on next message.`);
    }

    return interaction.editReply({ content: response.join('\n') });
  }
};
