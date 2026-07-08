/**
 * commands/delsudo.js
 * ---------------------
 * Revokes a user's sudo access. Owner only.
 * Usage: .delsudo @user (or reply to their message)
 */
const { isOwner } = require('../utils/isOwner');
const { removeSudo } = require('../utils/isSudo');

module.exports = {
  name: 'delsudo',
  description: 'Revokes a user\'s sudo access (owner only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const repliedTo = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const repliedPn = msg.message?.extendedTextMessage?.contextInfo?.participantPn;
    const target = repliedPn || mentioned || repliedTo || args[0];

    if (!target) {
      return sock.sendMessage(jid, {
        text: '❌ Mention a user, reply to their message, or provide a number.\n\nUsage: *.delsudo @user*',
      }, { quoted: msg });
    }

    const number = target.replace(/[^0-9]/g, '');
    removeSudo(number);

    await sock.sendMessage(jid, { text: `✅ +${number} has been removed from sudo.` }, { quoted: msg });
  },
};
