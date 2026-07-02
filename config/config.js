/**
 * config/config.js
 * -----------------
 * Central configuration file for the bot.
 * Values are pulled from environment variables (set via Heroku config vars
 * or your local .env file), falling back to sensible defaults.
 */

module.exports = {
  // The character (or string) that must precede every command.
  prefix: process.env.BOT_PREFIX || '.',
  ownerNumber: process.env.OWNER_NUMBER || '254754574642', // digits only, with country code, no +

  // Display name for the bot, used in messages like the !menu command.
  botName: process.env.BOT_NAME || 'ISAAC-MD',

  // Name of the folder (relative to project root) where Baileys stores
  // multi-device authentication credentials.
  authFolder: 'auth_info_baileys',

  // Your WhatsApp session string, generated via the pairing site.
  sessionId: process.env.SESSION_ID || '',

  // Logging level passed to the pino logger used internally by Baileys.
  logLevel: process.env.LOG_LEVEL || 'silent',

  AUTO_TYPING: process.env.AUTO_TYPING === 'true',
  AUTO_RECORDING: process.env.AUTO_RECORDING === 'true',

  // Whether the bot should print incoming messages to the console.
  debugMessages: process.env.DEBUG_MESSAGES === 'true',
};
