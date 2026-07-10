/**
 *commands/remini.js
 * ---------------------
 * AI photo enhance/upscale. Usage: reply to an image with .remini
 *
 * NOTE: there's no free public "Remini" API — this uses the same free
 * Pollinations enhance approach as the existing .upscale command,
 * just under this name and with a slightly different prompt style.
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
  name: 'remini',
  description: 'Enhance/upscale a photo. Usage: reply to an image with .remini',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .remini' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '✨ Enhancing photo...' }, { quoted: msg });

    try {
      const media = await downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const base64 = media.toString('base64');
      const url = `https://image.pollinations.ai/prompt/enhance+sharpen+restore+detail+4k?width=1024&height=1024&nologo=true&image=${encodeURIComponent('data:image/jpeg;base64,' + base64)}`;

      const buffer = await downloadImage(url);
      await sock.sendMessage(jid, { image: buffer, caption: '✅ *Enhanced*' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Enhance failed: ' + e.message }, { quoted: msg });
    }
  },
};
