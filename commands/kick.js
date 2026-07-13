/**
 * commands/kick.js
 * ----------------
 * Kick one or more members from a group.
 *
 * Supports:
 * • .kick (reply to any message)
 * • .kick @user
 * • .kick @user1 @user2 @user3
 * • Reply + mentions together
 */

module.exports = {
  name: 'kick',
  description: 'Kick one or more group members (admin only).',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return await sock.sendMessage(
        jid,
        { text: '❌ This command only works in groups.' },
        { quoted: msg }
      );
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;

    const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

    if (!isSenderAdmin(metadata, senderJid)) {
      return await sock.sendMessage(
        jid,
        { text: '❌ Only group admins can use this command.' },
        { quoted: msg }
      );
    }

    if (!isBotAdmin(sock, metadata)) {
      return await sock.sendMessage(
        jid,
        { text: '❌ I need to be a group admin to remove members.' },
        { quoted: msg }
      );
    }

    // Works with replies to ANY message type
    const msgType = Object.keys(msg.message || {})[0];
    const contextInfo = msg.message?.[msgType]?.contextInfo || {};

    let targets = [];

    // Reply target
    if (contextInfo.participant) {
      targets.push(contextInfo.participant);
    }

    // Mentioned users
    if (Array.isArray(contextInfo.mentionedJid)) {
      targets.push(...contextInfo.mentionedJid);
    }

    // Remove duplicates
    targets = [...new Set(targets)];

    if (!targets.length) {
      return await sock.sendMessage(
        jid,
        {
          text:
            '❌ Reply to a user or mention one or more users.\n\nExamples:\n.kick\n.kick @user\n.kick @user1 @user2 @user3'
        },
        { quoted: msg }
      );
    }

    const removed = [];
      const skipped = [];

      const { getBotIdentifiers } = require('../utils/isAdmin');
      const botIds = getBotIdentifiers(sock);

      for (const target of targets) {
        // Don't kick yourself
        if (target === senderJid) {
          skipped.push(`@${target.split('@')[0]} (you)`);
          continue;
        }

        // Never kick the bot itself
        if (botIds.has(target)) {
          skipped.push(`@${target.split('@')[0]} (that's me!)`);
          continue;
        }

        // Check if user is in the group
        const participant = metadata.participants.find(
          p =>
            p.id === target ||
            p.jid === target ||
            p.lid === target
        );

        if (!participant) {
          skipped.push(`@${target.split('@')[0]} (not in group)`);
          continue;
        }

        try {
          // Send a goodbye message first, then remove a moment later
          await sock.sendMessage(jid, {
            text: `👋 @${target.split('@')[0]} has been kicked. Goodbye!`,
            mentions: [target],
          });

          await new Promise(r => setTimeout(r, 1000));

          const result = await sock.groupParticipantsUpdate(
            jid,
            [target],
            'remove'
          );

          const success =
            Array.isArray(result) &&
            result[0] &&
            (result[0].status === "200" || result[0].status === 200);

          if (success) {
            removed.push(target);
          } else {
            skipped.push(`@${target.split('@')[0]} (cannot remove)`);
          }
        } catch (err) {
          skipped.push(`@${target.split('@')[0]} (${err.message})`);
        }
      }

    let text = '';

    if (removed.length) {
      text += `✅ Removed ${removed.length} member(s).\n`;
    }

    if (skipped.length) {
      if (text) text += '\n';
      text += `⚠️ Skipped ${skipped.length} member(s):\n`;
      text += skipped.join('\n');
    }

    await sock.sendMessage(
      jid,
      {
        text,
        mentions: [...removed, ...targets]
      },
      { quoted: msg }
    );
  },
};
