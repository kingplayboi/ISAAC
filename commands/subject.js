/**
 * commands/subject.js
 * --------------------
 * Changes the group's name. Admin-only.
 *
 * Usage: .subject New Group Name Here
 */
module.exports = {
  name: 'subject',
  description: "Changes the group's name (admin only).",
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const newSubject = args.join(' ').trim();
    if (!newSubject) {
      await sock.sendMessage(jid, { text: '❌ Provide a new group name. Usage: .subject New Name' }, { quoted: msg });
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
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to change the group name.' }, { quoted: msg });
      return;
    }

    try {
      await sock.groupUpdateSubject(jid, newSubject);
      await sock.sendMessage(jid, { text: `✅ Group name changed to: *${newSubject}*` }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to change group name: ${error.message}` }, { quoted: msg });
    }
  },
};
