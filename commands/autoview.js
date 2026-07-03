/**
 * commands/autoview.js
 * -----------------------
 * Toggles whether the bot automatically marks WhatsApp statuses as
 * viewed. Defaults to ON if never explicitly set.
 *
 * Usage: .autoview        → shows current state
 *        .autoview on|off → changes it
 */

const settingsStore = require('../utils/settingsStore');

module.exports = {
  name: 'autoview',
  description: 'Toggles auto-viewing of statuses (default: on). Usage: .autoview on | off',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mode = (args[0] || '').toLowerCase();

    if (mode !== 'on' && mode !== 'off') {
      const current = settingsStore.get('autoview', true); // defaults to true
      return sock.sendMessage(
        jid,
        { text: `👀 Auto-view statuses is currently *${current ? 'ON' : 'OFF'}*.\nUsage: .autoview on | off` },
        { quoted: msg }
      );
    }

    settingsStore.set('autoview', mode === 'on');
    await sock.sendMessage(jid, { text: `👀 Auto-view statuses is now *${mode.toUpperCase()}*.` }, { quoted: msg });
  },
};
