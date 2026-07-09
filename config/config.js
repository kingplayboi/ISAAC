/**
 * config/config.js
 * -----------------
 * Central configuration file for the bot.
 * Values are pulled from environment variables (set via Heroku config vars
 * or your local .env file), falling back to sensible defaults.
 *
 * `prefix` and `WORK_TYPE` (public/private mode) can also be changed at
 * runtime via the .prefix and .mode commands. Those commands persist their
 * changes to config/botSettings.json via runtimeSettings, and that
 * persisted value takes priority over the .env default below — so a
 * runtime change survives a restart instead of reverting.
 */

const runtimeSettings = require('./runtimeSettings');

module.exports = {
  // The character (or string) that must precede every command. Can be
  // changed at runtime with .prefix — that change is persisted and wins
  // over BOT_PREFIX below on the next restart.
  prefix: runtimeSettings.get('prefix', process.env.BOT_PREFIX || '.'),

  // Whether the bot responds to everyone ("public") or only the owner
  // ("private"). Changed at runtime with .mode, persisted the same way.
  WORK_TYPE: runtimeSettings.get('mode', 'public'),

  ownerNumber: process.env.OWNER_NUMBER || '254754574642', // digits only, with country code, no +

  // Display name for the bot, used in messages like the !menu command.
  botName: process.env.BOT_NAME || 'ISAAC-MD',

  // Name of the folder (relative to project root) where Baileys stores
  // multi-device authentication credentials.
  authFolder: 'auth_info_baileys',

  // Your WhatsApp session string, generated via the pairing site.
  sessionId: process.env.SESSION_ID || '',
timezone: process.env.TIMEZONE || 'Africa/Nairobi',
botSettingsData: process.env.BOT_SETTINGS_DATA || null,

  // Logging level passed to the pino logger used internally by Baileys.
  logLevel: process.env.LOG_LEVEL || 'silent',

  AUTO_TYPING: process.env.AUTO_TYPING === 'true',
  AUTO_RECORDING: process.env.AUTO_RECORDING === 'true',

  // Whether the bot should print incoming messages to the console.
  debugMessages: process.env.DEBUG_MESSAGES === 'true',

  // Shared secret the mobile dashboard app must send in the x-api-key
  // header on every request. Set this to a long random string.
  apiKey: process.env.DASHBOARD_API_KEY || '',

  // Port the dashboard's Express/Socket.io server listens on. On Heroku
  // and most panels, use the platform-provided PORT if set.
  dashboardPort: process.env.PORT || process.env.DASHBOARD_PORT || 3000,
};
