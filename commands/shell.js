/**
 * commands/shell.js
 * -------------------
 * Executes a raw shell command on the server. EXTREMELY DANGEROUS.
 * Restricted to the hardcoded developer number only — see utils/isDev.js.
 * Usage: .shell <command>
 */
const { execSync } = require('child_process');
const { isDev } = require('../utils/isDev');

module.exports = {
  name: 'shell',
  description: 'Executes a raw shell command (developer only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isDev(msg)) {
      return sock.sendMessage(jid, { text: '❌ This command is restricted.' }, { quoted: msg });
    }

    const cmd = args.join(' ');
    if (!cmd) {
      return sock.sendMessage(jid, { text: '❌ Usage: .shell <command>' }, { quoted: msg });
    }

    try {
      const output = execSync(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 }).toString();
      await sock.sendMessage(jid, { text: output.slice(0, 4000) || '✅ Command ran with no output.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `⚠️ ${error.message}`.slice(0, 4000) }, { quoted: msg });
    }
  },
};
