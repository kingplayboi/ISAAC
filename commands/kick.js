/**
 * commands/kick.js
 * ----------------
 * Removes a mentioned/replied-to member from the group. Admin-only.
 *
 * Usage: .kick @user
 *    or: reply to the target's message with .kick
 */
module.exports = {
  name: 'kick',
  description: 'Removes a member from the group (admin only).',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!quoted) {
      await sock.sendMessage(jid, { text: "❌ Reply to a user's message to kick them." }, { quoted: msg });
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

    const senderIsAdmin = isSenderAdmin(metadata, senderJid);
    const botIsAdmin = isBotAdmin(sock, metadata);

    if (!senderIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!botIsAdmin) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to kick members.' }, { quoted: msg });
      return;
    }

    if (quoted === senderJid) {
      await sock.sendMessage(jid, { text: '❌ You cannot kick yourself.' }, { quoted: msg });
      return;
    }

    const targetParticipant = metadata.participants.find(
      (p) => p.id === quoted || p.jid === quoted || p.lid === quoted
    );

    if (!targetParticipant) {
      await sock.sendMessage(jid, { text: '❌ User not found in this group.' }, { quoted: msg });
      return;
    }

    if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
      await sock.sendMessage(jid, { text: '❌ I cannot remove another admin.' }, { quoted: msg });
      return;
    }

    try {
      await sock.groupParticipantsUpdate(jid, [quoted], 'remove');
      await sock.sendMessage(jid, { text: '✅ User removed successfully.' }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, { text: `❌ Failed to remove user: ${err.message}` }, { quoted: msg });
    }
  },
};
