/**
 * commands/prefix.js
 * ---------------------
 * Change the bot's command prefix at runtime. Persists across restarts
 * via config/runtimeSettings.js, unlike a plain in-memory change.
 * Usage: .prefix <new prefix>
 * Owner-only.
 */

const config = require('../config/config');
const runtimeSettings = require('../config/runtimeSettings');

module.exports = {
  name: 'prefix',
  description: 'Change the bot command prefix. Usage: .prefix <new prefix>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can change the prefix.' }, { quoted: msg });
    }

    const newPrefix = args[0];

    if (!newPrefix) {
      return sock.sendMessage(jid, {
        text: `⚡ *Current prefix:* \`${config.prefix}\`\n\nUsage: ${config.prefix}prefix <new prefix>\nExample: ${config.prefix}prefix !`
      }, { quoted: msg });
    }

    if (newPrefix.length > 3) {
      return sock.sendMessage(jid, { text: '❌ Keep the prefix short — 1 to 3 characters works best.' }, { quoted: msg });
    }

    const oldPrefix = config.prefix;
    config.prefix = newPrefix;
    runtimeSettings.set('prefix', newPrefix);

    await sock.sendMessage(jid, {
      text: `✅ Prefix changed from \`${oldPrefix}\` to \`${newPrefix}\`.\n\nFrom now on, use commands like: ${newPrefix}menu`
    }, { quoted: msg });
  }
};
