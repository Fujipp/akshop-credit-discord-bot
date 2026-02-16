const { Events, ActivityType } = require('discord.js');
const configManager = require('../utils/configManager');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}`, 'BOT');
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`, 'BOT');

    // Validate configuration on startup
    const credit = configManager.get('features.creditReply');
    if (credit?.enabled) {
      if (!credit.channelId) {
        logger.warn('Credit reply enabled but no channel configured', 'CONFIG');
      } else {
        const channel = await client.channels.fetch(credit.channelId).catch(() => null);
        if (!channel) {
          logger.warn(`Configured review channel ${credit.channelId} not found`, 'CONFIG');
        } else {
          logger.success(`Review channel verified: #${channel.name}`, 'CONFIG');
        }
      }
    }

    // Set bot status with proper ActivityType enum (v14)
    try {
      await client.user.setActivity('Review Counter', { type: ActivityType.Watching });
    } catch (error) {
      logger.error('Failed to set activity', 'BOT', error);
    }
  }
};
