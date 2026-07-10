/**
 * commands/remini2.js
 * ----------------------
 * AI photo enhance/upscale, alternate style. Usage: reply to an image with .remini2
 *
 * Same free Pollinations service as .remini, using a different
 * enhancement prompt (more aggressive denoise/clarity) so the two give
 * you a choice of result rather than being identical.
 */
const https = require('https');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  name: 'remini2',
  description: 'Enhance/upscale a photo (alternate style). Usage: reply to an image with .remini2',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .remini2' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '✨ Enhancing photo (alternate style)...' }, { quoted: msg });

    try {
      const media = await downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const base64 = media.toString('base64');
      const url = `https://image.pollinations.ai/prompt/denoise+clarity+HDR+ultra+detail+professional+photo?width=1024&height=1024&nologo=true&image=${encodeURIComponent('data:image/jpeg;base64,' + base64)}`;

      const buffer = await downloadImage(url);
      await sock.sendMessage(jid, { image: buffer, caption: '✅ *Enhanced (v2)*' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Enhance failed: ' + e.message }, { quoted: msg });
    }
  },
};
