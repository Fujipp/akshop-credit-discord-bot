const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { displayStartupMessage } = require('./utils/startupMessage');
const configManager = require('./utils/configManager');
const { logger } = require('./utils/logger');

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Commands collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`, 'LOADER');
    }
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.name && event.execute) {
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      logger.debug(`Loaded event: ${event.name}`, 'LOADER');
    }
  }
}

// Display startup message
displayStartupMessage();

// Lightweight HTTP server for Azure App Service health checks
const port = process.env.PORT || process.env.WEBSITES_PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    uptime: process.uptime(),
    ready: client.isReady()
  }));
});

server.listen(port, () => {
  logger.info(`Health endpoint listening on port ${port}`, 'HTTP');
});

// Graceful shutdown handler
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`, 'SHUTDOWN');

  // Flush any pending config saves
  configManager.flush();
  logger.debug('Config flushed', 'SHUTDOWN');

  // Close HTTP server
  server.close(() => {
    logger.debug('HTTP server closed', 'SHUTDOWN');
  });

  // Destroy Discord client
  client.destroy();
  logger.info('Discord client disconnected', 'SHUTDOWN');

  // Give a moment for cleanup, then exit
  setTimeout(() => {
    process.exit(0);
  }, 500);
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Global error handlers
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', 'PROCESS', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', 'PROCESS', error);
  // Give time to log, then exit
  setTimeout(() => process.exit(1), 1000);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

