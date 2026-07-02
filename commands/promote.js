/**
 * commands/promote.js
 * -------------------
 * Promotes a mentioned/replied-to member to group admin. Admin-only.
 *
 * Usage: .promote @user
 *    or: reply to the target's message with .promote
 */
module.exports = {
  name: 'promote',
  description: 'Promotes a mentioned member to group admin (admin only).',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const repliedTo = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const targetJid = mentioned[0] || repliedTo;

    if (!targetJid) {
      await sock.sendMessage(
        jid,
        { text: '❌ Mention the person to promote, or reply to one of their messages with .promote.' },
        { quoted: msg }
      );
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
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to promote members.' }, { quoted: msg });
      return;
    }

    await sock.groupParticipantsUpdate(jid, [targetJid], 'promote');
    await sock.sendMessage(
      jid,
      { text: `⬆️ Promoted @${targetJid.split('@')[0]} to admin.`, mentions: [targetJid] },
      { quoted: msg }
    );
  },
};
