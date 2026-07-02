/**
 * commands/warn.js
 * ----------------
 * Issues a warning to a mentioned/replied-to member. After 3 warnings,
 * the bot automatically removes them from the group (requires the bot
 * to be an admin). Admin-only command.
 *
 * Usage: .warn @user [reason]
 *    or: reply to the target's message with .warn [reason]
 */
const { addWarning, getWarnings } = require('../utils/warnings');

module.exports = {
  name: 'warn',
  description: 'Warns a member; auto-removes them after 3 warnings (admin only).',
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
        { text: '❌ Mention the person to warn, or reply to one of their messages with .warn.' },
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

    const reason = args.filter((a) => !a.startsWith('@')).join(' ') || 'No reason given';

    const count = addWarning(jid, targetJid);
    const remaining = 3 - count;

    if (count >= 3) {
      if (isBotAdmin(sock, metadata)) {
        await sock.groupParticipantsUpdate(jid, [targetJid], 'remove');
        await sock.sendMessage(
          jid,
          {
            text: `🚫 @${targetJid.split('@')[0]} reached 3 warnings and has been removed.`,
            mentions: [targetJid],
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          jid,
          {
            text: `⚠️ @${targetJid.split('@')[0]} has reached 3 warnings, but I need admin rights to remove them.`,
            mentions: [targetJid],
          },
          { quoted: msg }
        );
      }
      return;
    }

    await sock.sendMessage(
      jid,
      {
        text:
          `⚠️ @${targetJid.split('@')[0]} has been warned (${count}/3).\n` +
          `Reason: ${reason}\n` +
          `${remaining} warning(s) until removal.`,
        mentions: [targetJid],
      },
      { quoted: msg }
    );
  },
};
