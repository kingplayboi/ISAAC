/**
 * commands/cat.js
 * -----------------
 * Prints the text content of a file directly in chat. Developer only.
 * Usage: .cat <relative/path/to/file>
 */
const fs = require('fs');
const path = require('path');
const { isDev } = require('../utils/isDev');

const PROJECT_ROOT = path.join(__dirname, '..');

module.exports = {
  name: 'cat',
  description: 'Print a file\'s text content (developer only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isDev(msg)) {
      return sock.sendMessage(jid, { text: '❌ This command is restricted.' }, { quoted: msg });
    }

    const rel = args.join(' ');
    if (!rel) {
      return sock.sendMessage(jid, { text: '❌ Usage: .cat <relative/path>' }, { quoted: msg });
    }

    const filePath = path.join(PROJECT_ROOT, rel);
    if (!filePath.startsWith(PROJECT_ROOT)) {
      return sock.sendMessage(jid, { text: '❌ Invalid path.' }, { quoted: msg });
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return sock.sendMessage(jid, { text: '❌ File not found.' }, { quoted: msg });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    await sock.sendMessage(jid, { text: content.slice(0, 4000) }, { quoted: msg });
  },
};
