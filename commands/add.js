/**
 * commands/add.js
 * -----------------
 * Adds a participant to the group by phone number, or by replying to
 * their message. Admin-only.
 *
 * Usage: .add 254754574642
 *    or: reply to their message with .add
 *
 * NOTE ON LID vs PHONE-NUMBER JIDs: a reply's contextInfo.participant is
 * often a @lid JID (WhatsApp's newer anonymized ID), but
 * groupParticipantsUpdate's 'add' action needs the classic phone-number
 * JID (@s.whatsapp.net) — passing a @lid there gets rejected outright as
 * "bad-request" by WhatsApp, regardless of membership. contextInfo also
 * carries a phone-number counterpart (participantAlt / participantPn
 * depending on the message shape), which we prefer whenever present.
 *
 * If a direct add fails (commonly because the target's privacy settings
 * block being added by non-contacts), we fall back to DMing them a
 * group invite link instead of just erroring out.
 */
const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

module.exports = {
  name: 'add',
  description: 'Adds a participant to the group by number, or by replying to their message (admin only).',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      await sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      return;
    }

    // Prefer a replied-to message's sender; fall back to a typed number.
    // For the reply case, prefer the phone-number JID (participantAlt /
    // participantPn) over the raw @lid participant field, since the
    // add action needs a phone-number JID.
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const repliedLid = ctx?.participant;
    const repliedPn = ctx?.participantAlt || ctx?.participantPn;
    const number = (args[0] || '').replace(/[^0-9]/g, '');

    let targetJid;
    let targetLid; // kept alongside, so membership check can match either form
    if (repliedPn) {
      targetJid = repliedPn;
      targetLid = repliedLid;
    } else if (repliedLid) {
      // No phone-number counterpart available — fall back to the LID and
      // hope for the best; this is the case most likely to still fail.
      targetJid = repliedLid;
      targetLid = repliedLid;
    } else if (number) {
      targetJid = `${number}@s.whatsapp.net`;
    } else {
      await sock.sendMessage(
        jid,
        { text: '❌ Provide a number or reply to their message.\nUsage: .add 254754574642\nOr: reply to their message with .add' },
        { quoted: msg }
      );
      return;
    }

    const metadata = await sock.groupMetadata(jid);
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!isSenderAdmin(metadata, senderJid)) {
      await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
      return;
    }
    if (!isBotAdmin(sock, metadata)) {
      await sock.sendMessage(jid, { text: '❌ I need to be a group admin to add members.' }, { quoted: msg });
      return;
    }

    // Check membership against BOTH the phone-number JID and the LID
    // form, since group metadata participants may be keyed either way
    // depending on Baileys/WhatsApp's current addressing mode.
    const alreadyMember = metadata.participants.some(
      (p) => p.id === targetJid || (targetLid && p.id === targetLid) || p.phoneNumber === targetJid
    );
    if (alreadyMember) {
      await sock.sendMessage(
        jid,
        { text: `ℹ️ @${targetJid.split('@')[0]} is already a member.`, mentions: [targetJid] },
        { quoted: msg }
      );
      return;
    }

    try {
      const result = await sock.groupParticipantsUpdate(jid, [targetJid], 'add');

      // groupParticipantsUpdate resolves with a per-participant status
      // array rather than always throwing — WhatsApp uses status 409 for
      // "already a member" here, so catch that case even if our
      // pre-check above missed it due to a JID form mismatch.
      const participantResult = result?.[0];
      if (participantResult?.status === '409') {
        await sock.sendMessage(
          jid,
          { text: `ℹ️ @${targetJid.split('@')[0]} is already a member.`, mentions: [targetJid] },
          { quoted: msg }
        );
        return;
      }

      if (participantResult && participantResult.status !== '200') {
        // Couldn't add directly (commonly status 403 — their privacy
        // settings block being added by non-contacts). Fall back to
        // DMing them an invite link instead.
        await sendInviteFallback(sock, jid, targetJid, metadata, msg);
        return;
      }

      await sock.sendMessage(
        jid,
        { text: `✅ Added @${targetJid.split('@')[0]} to the group.`, mentions: [targetJid] },
        { quoted: msg }
      );
    } catch (error) {
      // A bad-request here after a reply-based add most often means the
      // LID we had to fall back to wasn't accepted — not necessarily a
      // real failure to add. Try the invite-link fallback rather than
      // just erroring out, since the end goal (get them into the group)
      // can still be achieved this way.
      try {
        await sendInviteFallback(sock, jid, targetJid, metadata, msg);
      } catch (fallbackError) {
        await sock.sendMessage(jid, { text: `❌ Failed to add member: ${error.message}` }, { quoted: msg });
      }
    }
  },
};

async function sendInviteFallback(sock, groupJid, targetJid, metadata, msg) {
  try {
    const inviteCode = await sock.groupInviteCode(groupJid);
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

    let image;

    try {
      const ppUrl = await sock.profilePictureUrl(groupJid, 'image');
      const https = require('https');

      image = await new Promise((resolve, reject) => {
        https.get(ppUrl, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
    } catch {
      image = null;
    }

    const caption = `╭━━━〔 📨 GROUP INVITATION 〕━━━╮

🏷️ *Group:* ${metadata.subject}

👥 *Members:* ${metadata.participants.length}

🤖 *Sent by:* ISAAC-MD

━━━━━━━━━━━━━━━━━━

You couldn't be added directly because of your WhatsApp privacy settings.

Tap the link below to join the group:

🔗 ${inviteLink}

━━━━━━━━━━━━━━━━━━

Hope to see you there! 🎉`;

    if (image) {
      await sock.sendMessage(targetJid, {
        image,
        caption
      });
    } else {
      await sock.sendMessage(targetJid, {
        text: caption
      });
    }

    await sock.sendMessage(
      groupJid,
      {
        text: `📨 Couldn't add @${targetJid.split('@')[0]} directly, so I've sent them a private invitation.`,
        mentions: [targetJid]
      },
      { quoted: msg }
    );

  } catch (e) {
    await sock.sendMessage(
      groupJid,
      {
        text: `❌ Couldn't add @${targetJid.split('@')[0]} directly, and couldn't send an invite either:\n${e.message}`,
        mentions: [targetJid]
      },
      { quoted: msg }
    );
  }
}
