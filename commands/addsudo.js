/**
 * commands/addsudo.js
 * ---------------------
 * Grants a user sudo access to elevated (but not developer-level) commands.
 * Owner only.
 * Usage: .addsudo <number> (or reply to their message)
 */
const { isOwner } = require('../utils/isOwner');
const { addSudo } = require('../utils/isSudo');

module.exports = {
  name: 'addsudo',
  description: 'Grants a user sudo access (owner only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    }

    const repliedPn = msg.message?.extendedTextMessage?.contextInfo?.participantPn;
    const target = repliedPn || args[0];

    if (!target || !/^\d{7,15}$/.test(target.replace(/[^0-9]/g, ''))) {
      return sock.sendMessage(jid, {
        text: '❌ Reply to the user\'s message, or provide their number directly.\n\nUsage: *.addsudo 254718701810*',
      }, { quoted: msg });
    }

    const number = target.replace(/[^0-9]/g, '');
    addSudo(number);

    await sock.sendMessage(jid, { text: `✅ +${number} has been granted sudo access.` }, { quoted: msg });
  },
};
