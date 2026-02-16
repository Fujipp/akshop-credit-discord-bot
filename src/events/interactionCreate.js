const { Events, MessageFlags } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`, 'CMD');
      return;
    }

    try {
      logger.command(
        interaction.commandName,
        interaction.user.id,
        interaction.guildId
      );

      await command.execute(interaction);

    } catch (error) {
      logger.error(`Command failed: ${interaction.commandName}`, 'CMD', error);

      const payload = {
        content: '❌ There was an error executing this command!',
        flags: MessageFlags.Ephemeral
      };

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch {
        // Unable to respond to interaction
      }
    }
  }
};
