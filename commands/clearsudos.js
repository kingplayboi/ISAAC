/**
 * commands/clearsudos.js
 * -------------------------
 * Removes all sudo users at once. Owner only.
 * Usage: .clearsudos
 */
const { isOwner } = require('../utils/isOwner');
const { clearSudo } = require('../utils/isSudo');

module.exports = {
  name: 'clearsudos',
  description: 'Removes all sudo users (owner only).',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    }

    clearSudo();

    await sock.sendMessage(jid, { text: '✅ All sudo users have been cleared.' }, { quoted: msg });
  },
};
