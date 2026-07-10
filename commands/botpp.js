/**
 * commands/botpp.js
 * --------------------
 * Update the bot's own WhatsApp profile picture. Owner-only.
 * Usage: reply to an image with .botpp
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'botpp',
  description: "Update the bot's profile picture (owner only). Usage: reply to an image with .botpp",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!msg.key.fromMe) {
      return sock.sendMessage(jid, { text: '❌ Only the owner can change the bot\'s profile picture.' }, { quoted: msg });
    }

    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted?.imageMessage) {
      return sock.sendMessage(jid, { text: '❌ Reply to an image with .botpp' }, { quoted: msg });
    }

    try {
      const media = await downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant },
      });

      await sock.updateProfilePicture(sock.user.id, media);
      await sock.sendMessage(jid, { text: '✅ Bot profile picture updated.' }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not update profile picture: ' + e.message }, { quoted: msg });
    }
  },
};
