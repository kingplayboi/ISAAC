/**
 * commands/similarimage.js
 * ---------------------------
 * Find visually similar images by uploading the replied image and
 * generating a Google reverse-image-search link for it.
 * Usage: reply to an image with .similarimage
 *
 * NOTE: there's no free, keyless "find similar images" API that returns
 * actual matches directly into chat — this uploads the image (via
 * catbox.moe, same as url.js) and hands back a working reverse-search
 * link instead, which you open to see the real results.
 * Requires: npm install form-data axios
 */
const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  name: 'similarimage',
  description: 'Find similar images (via reverse image search). Usage: reply to an image with .similarimage',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .similarimage' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '🔍 Uploading and preparing search...' }, { quoted: msg });

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', media, `search_${Date.now()}.jpg`);

      const res = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders() });
      const imageUrl = res.data?.trim();

      if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('Upload failed');

      const searchUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`;

      await sock.sendMessage(
        jid,
        { text: `🔎 *Reverse image search ready:*\n${searchUrl}\n\nOpen that link to see visually similar images.` },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not prepare image search: ' + e.message }, { quoted: msg });
    }
  },
};
