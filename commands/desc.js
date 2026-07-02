/**
 * commands/desc.js
 * -----------------
 * Changes the group's description. Admin-only.
 *
 * Usage: .desc New description text here
 */
module.exports = {
  name: 'desc',
  description: "Changes the group's description (admin only).",
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const newDesc = args.join(' ').trim();
    if (!newDesc) {
      await sock.sendMessage(jid, { text: '❌ Provide a new description. Usage: .desc New description' }, { quoted: msg });
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
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to change the description.' }, { quoted: msg });
      return;
    }

    try {
      await sock.groupUpdateDescription(jid, newDesc);
      await sock.sendMessage(jid, { text: '✅ Group description updated.' }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to change description: ${error.message}` }, { quoted: msg });
    }
  },
};
