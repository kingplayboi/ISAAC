/**
 * commands/revoke.js
 * -------------------
 * Revokes and regenerates the group's invite link. Admin-only.
 * Anyone with the old link will no longer be able to join.
 *
 * Usage: .revoke
 */
module.exports = {
  name: 'revoke',
  description: "Revokes and regenerates the group's invite link (admin only).",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

    if (!isSenderAdmin(metadata, senderJid)) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin(sock, metadata)) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to revoke the invite link.' }, { quoted: msg });
      return;
    }

    try {
      const code = await sock.groupRevokeInvite(jid);
      await sock.sendMessage(
        jid,
        { text: `♻️ New invite link:\nhttps://chat.whatsapp.com/${code}` },
        { quoted: msg }
      );
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to revoke invite link: ${error.message}` }, { quoted: msg });
    }
  },
};
