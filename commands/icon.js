/**
 * commands/icon.js
 * -----------------
 * Changes the group's icon/photo. Admin-only.
 * Reply to an image message with .icon
 *
 * Usage: reply to an image with .icon
 */
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'icon',
  description: "Changes the group's photo from a replied image (admin only).",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const normalizeJid = (jid) => jid?.split('@')[0].split(':')[0];
    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id;

    const isSenderAdmin = metadata.participants.some(
      (p) => normalizeJid(p.id) === normalizeJid(senderJid) && !!p.admin
    );
    const isBotAdmin = metadata.participants.some(
      (p) => normalizeJid(p.id) === normalizeJid(botJid) && !!p.admin
    );

    if (!isSenderAdmin) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to change the group photo.' }, { quoted: msg });
      return;
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

    if (!imageMsg) {
      await sock.sendMessage(jid, { text: '❌ Reply to an image with .icon' }, { quoted: msg });
      return;
    }

    try {
      const buffer = await downloadMediaMessage(
        { message: { imageMessage: imageMsg } },
        'buffer',
        {}
      );
      await sock.updateProfilePicture(jid, buffer);
      await sock.sendMessage(jid, { text: '✅ Group photo updated.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to update photo: ${error.message}` }, { quoted: msg });
    }
  },
};
