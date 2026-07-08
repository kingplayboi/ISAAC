/**
 * commands/checksudo.js
 * ------------------------
 * Lists all users currently granted sudo access. Owner only.
 * Usage: .checksudo
 */
const { isOwner } = require('../utils/isOwner');
const { listSudo } = require('../utils/isSudo');

module.exports = {
  name: 'checksudo',
  description: 'Lists all sudo users (owner only).',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    }

    const list = listSudo();

    await sock.sendMessage(jid, {
      text: list.length
        ? `👑 *Sudo users:*\n${list.map(n => `+${n}`).join('\n')}`
        : 'ℹ️ No sudo users currently.',
    }, { quoted: msg });
  },
};
