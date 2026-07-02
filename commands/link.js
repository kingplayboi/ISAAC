/**
 * commands/link.js
 * ----------------
 * Sends the group's invite link. Admin-only.
 *
 * Usage: .link
 */
module.exports = {
  name: 'link',
  description: "Sends the group's invite link (admin only).",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isSenderAdmin } = require('../utils/isAdmin');

    if (!isSenderAdmin(metadata, senderJid)) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }

    try {
      const code = await sock.groupInviteCode(jid);
      await sock.sendMessage(
        jid,
        { text: `🔗 Group invite link:\nhttps://chat.whatsapp.com/${code}` },
        { quoted: msg }
      );
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to get invite link: ${error.message}` }, { quoted: msg });
    }
  },
};
