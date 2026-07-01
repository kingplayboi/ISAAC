/**
 * commands/lydia.js
 * -------------------
 * Toggles the Lydia auto-chat persona on or off.
 *
 * Usage:
 *   .lydia on              → enables Lydia for the whole chat
 *   .lydia off             → disables Lydia for the whole chat
 *   (reply to someone) .lydia on   → enables Lydia only for that person
 *   (reply to someone) .lydia off  → disables Lydia only for that person
 */

const lydiaStore = require('../utils/lydiaStore');

function getRepliedParticipant(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  return ctx?.participant || null;
}

module.exports = {
  name: 'lydia',
  description: 'Toggles the Lydia auto-chat persona. Usage: .lydia on | off (reply to a message to target one person).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();

    if (mode !== 'on' && mode !== 'off') {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .lydia on | off\nReply to someone\'s message with .lydia on to enable it just for them.' },
        { quoted: msg }
      );
    }

    const targetJid = getRepliedParticipant(msg);

    if (mode === 'on') {
      lydiaStore.enable(jid, targetJid);
      const scope = targetJid ? 'for that person' : 'for this chat';
      await sock.sendMessage(jid, { text: `💬 Lydia is now *ON* ${scope}.` }, { quoted: msg });
    } else {
      lydiaStore.disable(jid, targetJid);
      const scope = targetJid ? 'for that person' : 'for this chat';
      await sock.sendMessage(jid, { text: `🔇 Lydia is now *OFF* ${scope}.` }, { quoted: msg });
    }
  },
};
