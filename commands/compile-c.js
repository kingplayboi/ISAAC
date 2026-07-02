/**
 * commands/compile-c.js
 * ------------------------
 * Compiles a short C snippet with clang and runs it, returning stdout.
 * Requires: pkg install clang
 *
 * Usage:
 *   .compile-c #include <stdio.h>\nint main(){printf("hi");return 0;}
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 5000;

module.exports = {
  name: 'compile-c',
  description: 'Compiles and runs a C snippet. Usage: .compile-c <code>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const code = args.join(' ');

    if (!code) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .compile-c <code>\nExample: .compile-c #include <stdio.h>\\nint main(){printf("hi");return 0;}' },
        { quoted: msg }
      );
    }

    const id = Date.now();
    const srcFile = path.join(os.tmpdir(), `compile_c_${id}.c`);
    const binFile = path.join(os.tmpdir(), `compile_c_${id}.out`);
    fs.writeFileSync(srcFile, code.replace(/\\n/g, '\n'));

    try {
      await execFileAsync('clang', [srcFile, '-o', binFile], { timeout: TIMEOUT_MS });

      execFile(binFile, { timeout: TIMEOUT_MS }, async (error, stdout, stderr) => {
        const output = (stdout || stderr || '(no output)').trim();
        await sock.sendMessage(jid, { text: `🇨 *C Output*\n\`\`\`${output}\`\`\`` }, { quoted: msg });
        [srcFile, binFile].forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ *Compile Error*\n\`\`\`${e.stderr || e.message}\`\`\`` }, { quoted: msg });
      [srcFile, binFile].forEach((f) => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    }
  },
};
