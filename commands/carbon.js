/**
 * commands/carbon.js
 * --------------------
 * Turns a code snippet into a styled code image, similar to carbon.now.sh,
 * using the free public Carbonara rendering API.
 *
 * Usage:
 *   .carbon const x = 1;
 */

const https = require('https');

function httpsPostJson(hostname, reqPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path: reqPath,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = {
  name: 'carbon',
  description: 'Turns a code snippet into a styled code image. Usage: .carbon <code>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const code = args.join(' ').replace(/\\n/g, '\n');

    if (!code) {
      return sock.sendMessage(
        jid,
        { text: '❌ Usage: .carbon <code>\nExample: .carbon const hello = "world";' },
        { quoted: msg }
      );
    }

    await sock.sendMessage(jid, { react: { text: '🎨', key: msg.key } });

    try {
      const { status, buffer } = await httpsPostJson('carbonara.solopov.dev', '/api/cook', {
        code,
        backgroundColor: '#1E1E1E',
        theme: 'seti',
      });

      if (status !== 200) {
        throw new Error(`API returned status ${status}`);
      }

      await sock.sendMessage(jid, { image: buffer, caption: '🎨 *Carbon Snippet*' }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: '', key: msg.key } });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error generating carbon image: ${e.message}` }, { quoted: msg });
    }
  },
};
