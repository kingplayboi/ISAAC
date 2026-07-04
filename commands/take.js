/**
 * commands/take.js
 * -------------------
 * Change sticker pack metadata, or add audio metadata (title/artist).
 * Usage:
 *   .take <packname>|<author>        -> reply to a sticker
 *   .take <title>|<artist>           -> reply to audio
 *
 * Requires: npm install node-id3 wa-sticker-formatter
 */

const NodeID3 = require('node-id3');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

module.exports = {
  name: 'take',
  description: 'Update sticker pack or audio metadata. Usage: .take <name>|<author> (reply to sticker/audio)',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;
    const input = args.join(' ');
    const [first, second] = input.split('|').map(s => s?.trim());

    if (!quoted) {
      return sock.sendMessage(jid, { text: '❌ Reply to a sticker or audio file with .take <name>|<author>' }, { quoted: msg });
    }

    if (!first) {
      return sock.sendMessage(jid, { text: '❌ Usage: .take <name/title>|<author/artist>' }, { quoted: msg });
    }

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
      });

      if (quoted.stickerMessage) {
        const sticker = new Sticker(media, {
          pack: first,
          author: second || '',
          type: StickerTypes.FULL,
          quality: 70
        });
        const buffer = await sticker.toBuffer();
        return sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
      }

      if (quoted.audioMessage) {
        const tags = { title: first, artist: second || '' };
        const tagged = NodeID3.write(tags, media);
        return sock.sendMessage(jid, {
          audio: tagged,
          mimetype: 'audio/mpeg',
          fileName: `${first}.mp3`
        }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '❌ Reply to a sticker or an audio file.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not update metadata: ' + e.message }, { quoted: msg });
    }
  }
};
