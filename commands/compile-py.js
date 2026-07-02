/**
 * commands/compile-py.js
 * ------------------------
 * Runs a short Python snippet and returns its stdout/stderr output.
 * Requires: pkg install python
 *
 * Usage:
 *   .compile-py print(1 + 1)
 *   .compile-py for i in range(5): print(i)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const TIMEOUT_MS = 5000;

module.exports = {
  name: 'compile-py',
  description: 'Runs a Python snippet and returns its output. Usage: .compile-py <code>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const code = args.join(' ');

    if (!code) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .compile-py <code>\nExample: .compile-py print(1 + 1)' },
        { quoted: msg }
      );
    }

    const tmpFile = path.join(os.tmpdir(), `compile_py_${Date.now()}.py`);
    fs.writeFileSync(tmpFile, code);

    execFile('python3', [tmpFile], { timeout: TIMEOUT_MS }, async (error, stdout, stderr) => {
      try {
        if (error && !stdout && !stderr) {
          await sock.sendMessage(jid, { text: `❌ *Error*\n\`\`\`${error.message}\`\`\`` }, { quoted: msg });
        } else {
          const output = (stdout || stderr || '(no output)').trim();
          const label = stderr && !stdout ? '❌ *Python Error*' : '🐍 *Python Output*';
          await sock.sendMessage(jid, { text: `${label}\n\`\`\`${output}\`\`\`` }, { quoted: msg });
        }
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });
  },
};
