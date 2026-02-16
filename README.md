# Review Bot

Discord bot for managing review channel with auto-reply, reactions, and message counter.

## Features
- Auto-reply to messages in review channel with custom message and emojis
- Automatic message counter with channel name updates
- `/checkcredit` command to sync counter with actual message count
- `/recredit` command to refresh reactions and reply without changing counter
- Permission-based access control

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your bot credentials
3. Deploy commands: `npm run deploy`
4. Start the bot: `npm start`

## Configuration
Edit `data/config.json` to customize:
- Channel ID for review channel
- Reply message and emojis
- Reaction emojis
- Authorized roles and users
