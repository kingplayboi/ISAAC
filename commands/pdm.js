/**
 * commands/pdm.js
 * -----------------
 * Enable or disable automatic notifications for promote/demote events.
 * Usage: .pdm on/off
 *
 * NOTE: Wire this setting into your group-participants-update event handler
 * (check settings[jid].pdm before sending a promote/demote notification)
 * for this toggle to actually take effect.
 */

const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../config/groupSettings.json');

module.exports = {
  name: 'pdm',
  description: 'Toggle promote/demote notifications. Usage: .pdm on/off',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
    }

    const mode = args[0]?.toLowerCase();
    if (mode !== 'on' && mode !== 'off') {
      return sock.sendMessage(jid, { text: '❌ Usage: .pdm on  or  .pdm off' }, { quoted: msg });
    }

    let settings = {};
    if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!settings[jid]) settings[jid] = {};
    settings[jid].pdm = mode === 'on';
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    await sock.sendMessage(jid, { text: `📢 Promote/demote notifications turned ${mode}.` }, { quoted: msg });
  }
};
