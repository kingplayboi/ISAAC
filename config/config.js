/**
 * config/config.js
 * -----------------
 * Central configuration file for the bot.
 *
 * Keeping all configurable values here means you never have to dig through
 * the codebase to change a setting like the command prefix or bot name.
 * Feel free to load some of these from environment variables (process.env)
 * if you want different settings per environment (dev/prod).
 */

module.exports = {
  // The character (or string) that must precede every command.
  // Example: with prefix "!", users type "!ping" to trigger the ping command.
  prefix: '.',

  // Display name for the bot, used in messages like the !menu command.
  botName: 'Baileys Starter Bot',

  // Name of the folder (relative to project root) where Baileys stores
  // multi-device authentication credentials so you don't have to scan
  // the QR code every time you restart the bot.
  authFolder: 'auth_info_baileys',

  // Logging level passed to the pino logger used internally by Baileys.
  // Options: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  logLevel: 'silent',

  // Whether the bot should print incoming messages to the console.
  // Useful for debugging; turn off in production if you want less noise.
  debugMessages: true,
};
