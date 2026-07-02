/**
 * commands/compile-js.js
 * ------------------------
 * Runs a short JavaScript snippet in a sandboxed VM context and returns
 * whatever it console.logs, with a timeout to prevent infinite loops.
 *
 * Usage:
 *   .compile-js console.log(1 + 1)
 *   .compile-js for (let i=0;i<5;i++) console.log(i)
 */

const vm = require('vm');

const TIMEOUT_MS = 3000;

module.exports = {
  name: 'compile-js',
  description: 'Runs a JavaScript snippet and returns its console output. Usage: .compile-js <code>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const code = args.join(' ');

    if (!code) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .compile-js <code>\nExample: .compile-js console.log(1 + 1)' },
        { quoted: msg }
      );
    }

    const logs = [];
    const sandbox = {
      console: {
        log: (...vals) => logs.push(vals.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' ')),
        error: (...vals) => logs.push('ERR: ' + vals.map(String).join(' ')),
      },
    };

    try {
      const context = vm.createContext(sandbox);
      const script = new vm.Script(code);
      script.runInContext(context, { timeout: TIMEOUT_MS });

      const output = logs.length ? logs.join('\n') : '(no console output)';
      await sock.sendMessage(
        jid,
        { text: `🟨 *JavaScript Output*\n\`\`\`${output}\`\`\`` },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(
        jid,
        { text: `❌ *Error*\n\`\`\`${e.message}\`\`\`` },
        { quoted: msg }
      );
    }
  },
};
