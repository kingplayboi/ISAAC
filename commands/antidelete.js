/**
 * commands/antidelete.js
 * -------------------------
 * Toggles antidelete: when on, if someone deletes a message, the bot
 * resends its content so it can still be seen.
 *
 * Usage: .antidelete on | off
 */

const settingsStore = require('../utils/settingsStore');

module.exports = {
  name: 'antidelete',
  description: 'Toggles resending deleted messages. Usage: .antidelete on | off',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();

    if (mode !== 'on' && mode !== 'off') {
      const current = settingsStore.get('antidelete', false);
      return sock.sendMessage(
        jid,
        { text: `🗑️ Antidelete is currently *${current ? 'ON' : 'OFF'}*.\nUsage: .antidelete on | off` },
        { quoted: msg }
      );
    }

    settingsStore.set('antidelete', mode === 'on');
    await sock.sendMessage(jid, { text: `🗑️ Antidelete is now *${mode.toUpperCase()}*.` }, { quoted: msg });
  },
};
