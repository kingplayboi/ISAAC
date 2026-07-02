/**
 * commands/add.js
 * -----------------
 * Adds a participant to the group by phone number. Admin-only.
 *
 * Usage: .add 254712345678
 */
module.exports = {
  name: 'add',
  description: 'Adds a participant to the group by number (admin only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const number = (args[0] || '').replace(/[^0-9]/g, '');
    if (!number) {
      await sock.sendMessage(jid, { text: '❌ Provide a number. Usage: .add 254712345678' }, { quoted: msg });
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
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to add members.' }, { quoted: msg });
      return;
    }

    try {
      const targetJid = `${number}@s.whatsapp.net`;
      await sock.groupParticipantsUpdate(jid, [targetJid], 'add');
      await sock.sendMessage(jid, { text: `✅ Added @${number} to the group.`, mentions: [targetJid] }, { quoted: msg });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Failed to add member: ${error.message}` }, { quoted: msg });
    }
  },
};
