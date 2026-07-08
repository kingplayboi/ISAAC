/**
 * commands/getcmd.js
 * --------------------
 * Sends the source code of one of the bot's own command files.
 * Restricted to the hardcoded developer number only.
 * Usage: .getcmd <commandName>
 */
const fs = require('fs');
const path = require('path');
const { isDev } = require('../utils/isDev');

module.exports = {
  name: 'getcmd',
  description: 'Get a command file\'s source code (developer only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isDev(msg)) {
      return sock.sendMessage(jid, { text: '❌ This command is restricted.' }, { quoted: msg });
    }

    const name = args[0];
    if (!name) {
      return sock.sendMessage(jid, { text: '❌ Usage: .getcmd <commandName>' }, { quoted: msg });
    }

    const filePath = path.join(__dirname, `${name}.js`);
    if (!fs.existsSync(filePath)) {
      return sock.sendMessage(jid, { text: `❌ No command file named "${name}.js".` }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      document: fs.readFileSync(filePath),
      mimetype: 'text/javascript',
      fileName: `${name}.js`,
    }, { quoted: msg });
  },
};
