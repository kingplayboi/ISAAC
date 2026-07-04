/**
 * commands/url.js
 * ------------------
 * Upload replied media and get a direct shareable link.
 * Usage: .url  (reply to an image, video, audio, or document)
 *
 * Uses catbox.moe's free anonymous upload API.
 * Requires: npm install form-data axios
 */

const axios = require('axios');
const FormData = require('form-data');

module.exports = {
  name: 'url',
  description: 'Get a direct link for replied media. Usage: .url (reply to media)',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image, video, audio, or document with .url' }, { quoted: msg });
    }

    const type = quoted.imageMessage ? 'image' : quoted.videoMessage ? 'video' : quoted.documentMessage ? 'document' : quoted.audioMessage ? 'audio' : null;
    if (!type) {
      return sock.sendMessage(jid, { text: '❌ Unsupported media type.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '⏳ Uploading...' }, { quoted: msg });

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
      });

      const ext = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'bin';

      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', media, `upload_${Date.now()}.${ext}`);

      const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders()
      });

      const link = res.data?.trim();
      if (!link || !link.startsWith('http')) throw new Error('Upload failed');

      await sock.sendMessage(jid, { text: `🔗 *Direct link:*\n${link}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Upload failed: ' + e.message }, { quoted: msg });
    }
  }
};
