/**
 * commands/smeme.js
 * --------------------
 * Add top/bottom meme text to a replied image and send it as a sticker.
 * Usage: reply to an image with .smeme top text|bottom text
 * Either side can be left blank: .smeme |bottom only   or   .smeme top only|
 *
 * Requires: npm install jimp wa-sticker-formatter
 */
const Jimp = require('jimp');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

async function drawCaption(image, text, font, y) {
  if (!text) return;
  const width = image.bitmap.width;
  const textWidth = Jimp.measureText(font, text.toUpperCase());
  const x = Math.max((width - textWidth) / 2, 4);
  image.print(font, x, y, text.toUpperCase());
}

module.exports = {
  name: 'smeme',
  description: 'Make a meme sticker. Usage: reply to an image with .smeme top text|bottom text',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .smeme top text|bottom text' }, { quoted: msg });
    }

    const input = args.join(' ');
    const [topText, bottomText] = input.split('|').map((s) => s?.trim());

    if (!topText && !bottomText) {
      return sock.sendMessage(jid, { text: '❌ Usage: .smeme top text|bottom text' }, { quoted: msg });
    }

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      const image = await Jimp.read(media);
      image.resize(512, Jimp.AUTO);

      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

      if (topText) await drawCaption(image, topText, font, 8);
      if (bottomText) await drawCaption(image, bottomText, font, image.bitmap.height - 48);

      const buffer = await image.getBufferAsync(Jimp.MIME_PNG);

      const sticker = new Sticker(buffer, {
        pack: 'ISAAC-MD',
        author: 'ISAAC-MD',
        type: StickerTypes.FULL,
        quality: 70,
      });

      await sock.sendMessage(jid, { sticker: await sticker.toBuffer() }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not create meme sticker: ' + e.message }, { quoted: msg });
    }
  },
};
