/**
 * commands/removebg.js
 * -----------------------
 * Remove the background from a replied image using the remove.bg API.
 * Usage: reply to an image with .removebg
 *
 * Requires a free remove.bg API key: https://www.remove.bg/api
 * (free tier: 50 images/month). Set REMOVEBG_API_KEY in your .env
 */
const axios = require('axios');

module.exports = {
  name: 'removebg',
  description: 'Remove the background from an image. Usage: reply to an image with .removebg',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!process.env.REMOVEBG_API_KEY) {
      return sock.sendMessage(
        jid,
        { text: '❌ Background removal is not configured. Get a free key at remove.bg/api and set REMOVEBG_API_KEY in .env' },
        { quoted: msg }
      );
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .removebg' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '✂️ Removing background...' }, { quoted: msg });

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const FormData = require('form-data');
      const form = new FormData();
      form.append('image_file', media, 'image.jpg');
      form.append('size', 'auto');

      const res = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
        headers: { ...form.getHeaders(), 'X-Api-Key': process.env.REMOVEBG_API_KEY },
        responseType: 'arraybuffer',
        validateStatus: () => true,
      });

      if (res.status !== 200) {
        const errText = Buffer.from(res.data).toString('utf8');
        throw new Error(`remove.bg error (${res.status}): ${errText.slice(0, 200)}`);
      }

      await sock.sendMessage(jid, { image: Buffer.from(res.data), caption: '✅ Background removed' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not remove background: ' + e.message }, { quoted: msg });
    }
  },
};
