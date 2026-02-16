const { Events } = require('discord.js');
const configManager = require('../utils/configManager');
const { channelRenameRateLimiter } = require('../utils/rateLimiter');
const { logger } = require('../utils/logger');

const CREDIT_PATH = 'features.creditReply';
const CHANNEL_NAME_PREFIX = '꒰💯꒱┆review 〻';

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Early returns for efficiency
    if (message.author.bot) return;

    const credit = configManager.get(CREDIT_PATH);
    if (!credit?.enabled) return;
    if (!credit.channelId || message.channelId !== credit.channelId) return;

    // 1) Increment message count
    const nextCount = Number(credit.messageCount || 0) + 1;
    configManager.set(`${CREDIT_PATH}.messageCount`, nextCount);

    // 2) React with configured emojis (parallel)
    const reactions = Array.isArray(credit.reactions) && credit.reactions.length ? credit.reactions : [];
    if (reactions.length > 0) {
      await Promise.allSettled(
        reactions.map(emoji => message.react(emoji))
      );
    }

    // 3) Assign default role if set
    const roleId = credit.defaultRoleId;
    if (roleId && message.member && !message.member.roles.cache.has(roleId)) {
      try {
        const role = await message.guild.roles.fetch(roleId);
        if (role) {
          await message.member.roles.add(role);
        }
      } catch (error) {
        logger.error(`Failed to assign role ${roleId}`, 'ROLE', error);
      }
    }

    // 4) Rename channel to match counter (rate limited: 2 per 10 min)
    const targetName = `${CHANNEL_NAME_PREFIX}${nextCount}`;
    if (message.channel.name !== targetName) {
      const result = await channelRenameRateLimiter.executeIfAllowed(
        message.channelId,
        () => message.channel.setName(targetName),
        2,
        600000 // 10 minutes
      );

      if (!result.executed && result.reason === 'rate_limited') {
        const waitTime = channelRenameRateLimiter.getTimeUntilReset(message.channelId, 2, 600000);
        logger.rateLimit('channel_rename', message.channelId, waitTime);
      }
    }

    // 5) Reply with configured message
    const replyMessage = (credit.replyMessage || '').trim();
    if (!replyMessage) return;

    // 5.1) Remove the previous bot reply if configured
    if (credit.deleteOldReply && credit.lastBotMessageId) {
      try {
        const oldMessage = await message.channel.messages.fetch(credit.lastBotMessageId);
        if (oldMessage?.author?.id === message.client.user.id) {
          await oldMessage.delete();
        }
      } catch {
        // Message might be already deleted
      }
    }

    try {
      const botReply = await message.reply({ content: replyMessage });
      if (botReply) {
        configManager.set(`${CREDIT_PATH}.lastBotMessageId`, botReply.id);
      }
    } catch (error) {
      logger.error('Failed to send reply', 'MSG', error);
    }
  }
};
