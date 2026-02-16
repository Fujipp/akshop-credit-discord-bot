const chalkPackage = require('chalk');
const figlet = require('figlet');

// Handle ESM/CommonJS compatibility for chalk
const chalk = typeof chalkPackage.default === 'function' ? chalkPackage.default : chalkPackage;

function displayStartupMessage() {
  console.clear();
  figlet.text('SnowWhite', {
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }, (err, data) => {
    if (!err) {
      console.log(chalk.cyan(data));
    }
    console.log(chalk.bold.bgBlue(' DEV BY FUJIPP '));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.yellow('🚀 Starting Discord Bot...'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');
  });
}

module.exports = { displayStartupMessage };
