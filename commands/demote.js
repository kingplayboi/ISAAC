/**
 * commands/demote.js
 * ------------------
 * Demotes a mentioned/replied-to admin back to a regular member.
 * Admin-only.
 *
 * Usage: !demote @user
 *    or: reply to the target's message with !demote
 */
module.exports = {
  name: 'demote',
  description: 'Demotes a mentioned admin back to a regular member (admin only).',
  async execute(sock, msg, args) {
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
        { text: '❌ Mention the person to demote, or reply to one of their messages with !demote.' },
        { quoted: msg }
      );
      return;
    }

const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const { isBotAdmin: checkBotAdmin, isSenderAdmin: checkSenderAdmin } = require('../utils/isAdmin');

    const isSenderAdmin = checkSenderAdmin(metadata, senderJid);
    const isBotAdmin = checkBotAdmin(sock, metadata);

    if (!isBotAdmin) {
      console.log('[DEBUG isAdmin] sock.user:', JSON.stringify(sock.user));
      console.log('[DEBUG isAdmin] participants:', JSON.stringify(metadata.participants, null, 2));
    }

    if (!isSenderAdmin) {      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin) {
      await sock.sendMessage(
        jid,
        { text: '❌ I need to be a group admin to demote members.' },
        { quoted: msg }
      );
      return;
    }

    await sock.groupParticipantsUpdate(jid, [targetJid], 'demote');
    await sock.sendMessage(
      jid,
      { text: `⬇️ Demoted @${targetJid.split('@')[0]} to member.`, mentions: [targetJid] },
      { quoted: msg }
    );
  },
};
