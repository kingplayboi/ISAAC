/**
 * commands/getfile.js
 * ---------------------
 * Sends any file from the bot's project directory. EXTREMELY SENSITIVE —
 * can expose .env, session files, config secrets. Developer only.
 * Usage: .getfile <relative/path/to/file>
 */
const fs = require('fs');
const path = require('path');
const { isDev } = require('../utils/isDev');

const PROJECT_ROOT = path.join(__dirname, '..');

module.exports = {
  name: 'getfile',
  description: 'Get any file from the project directory (developer only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isDev(msg)) {
      return sock.sendMessage(jid, { text: '❌ This command is restricted.' }, { quoted: msg });
    }

    const rel = args.join(' ');
    if (!rel) {
      return sock.sendMessage(jid, { text: '❌ Usage: .getfile <relative/path>' }, { quoted: msg });
    }

    const filePath = path.join(PROJECT_ROOT, rel);
    if (!filePath.startsWith(PROJECT_ROOT)) {
      return sock.sendMessage(jid, { text: '❌ Invalid path.' }, { quoted: msg });
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return sock.sendMessage(jid, { text: '❌ File not found.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, {
      document: fs.readFileSync(filePath),
      fileName: path.basename(filePath),
    }, { quoted: msg });
  },
};
