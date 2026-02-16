/**
 * Centralized Logger Utility
 * Provides color-coded, timestamped logging with different levels
 */

const chalk = require('chalk');

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Current log level (can be set via environment variable)
let currentLevel = LogLevel.INFO;
if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL.toUpperCase();
    if (LogLevel[level] !== undefined) {
        currentLevel = LogLevel[level];
    }
}

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function formatMessage(level, category, message, meta = null) {
    const timestamp = chalk.gray(`[${getTimestamp()}]`);
    const categoryTag = category ? chalk.cyan(`[${category}]`) : '';
    const metaStr = meta ? ` ${chalk.gray(JSON.stringify(meta))}` : '';

    return `${timestamp} ${level} ${categoryTag} ${message}${metaStr}`;
}

const logger = {
    level: currentLevel,

    setLevel(level) {
        if (typeof level === 'string') {
            this.level = LogLevel[level.toUpperCase()] ?? LogLevel.INFO;
        } else {
            this.level = level;
        }
    },

    debug(message, category = null, meta = null) {
        if (this.level <= LogLevel.DEBUG) {
            console.log(formatMessage(chalk.magenta('DEBUG'), category, message, meta));
        }
    },

    info(message, category = null, meta = null) {
        if (this.level <= LogLevel.INFO) {
            console.log(formatMessage(chalk.blue('INFO '), category, message, meta));
        }
    },

    success(message, category = null, meta = null) {
        if (this.level <= LogLevel.INFO) {
            console.log(formatMessage(chalk.green('✓ OK '), category, message, meta));
        }
    },

    warn(message, category = null, meta = null) {
        if (this.level <= LogLevel.WARN) {
            console.warn(formatMessage(chalk.yellow('WARN '), category, message, meta));
        }
    },

    error(message, category = null, error = null) {
        if (this.level <= LogLevel.ERROR) {
            const errorMeta = error ? {
                message: error.message,
                stack: error.stack?.split('\n').slice(0, 3).join(' | ')
            } : null;
            console.error(formatMessage(chalk.red('ERROR'), category, message, errorMeta));
        }
    },

    // Specialized loggers for common bot operations
    command(commandName, userId, guildId) {
        this.info(`Executing command: ${chalk.yellow(commandName)}`, 'CMD', { userId, guildId });
    },

    event(eventName, details = null) {
        this.debug(`Event triggered: ${chalk.cyan(eventName)}`, 'EVENT', details);
    },

    rateLimit(action, channelId, waitTime = null) {
        const msg = waitTime
            ? `Rate limited: ${action} on channel ${channelId}, wait ${Math.ceil(waitTime / 1000)}s`
            : `Rate limited: ${action} on channel ${channelId}`;
        this.warn(msg, 'RATE');
    }
};

module.exports = { logger, LogLevel };
