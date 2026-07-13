/**
 * commands/getpfp.js
 * ---------------------
 * Get a user's profile picture. Usage: .getpfp <number> or .getpfp @user
 * (or reply to their message). Aliased as .pp
 */
const https = require('https');

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Resolve an @lid JID to a real phone-number JID via group metadata.
// profilePictureUrl (and other WhatsApp lookups) don't accept @lid values.
async function resolveToPhoneJid(sock, jid, groupJid) {
  if (!jid || !jid.endsWith('@lid')) return jid;
  if (!groupJid || !groupJid.endsWith('@g.us')) return jid;

  try {
    const metadata = await sock.groupMetadata(groupJid);
    const match = metadata.participants.find((p) => p.lid === jid || p.id === jid);
    if (match?.phoneNumber) return match.phoneNumber;
    if (match?.id && !match.id.endsWith('@lid')) return match.id;
  } catch (e) {
    // fall through — return original, downstream call will surface the error
  }
  return jid;
}

module.exports = {
  name: 'getpfp',
  aliases: ['pp'],
  description: "Get a user's profile picture. Usage: .getpfp <number> or @user (or reply to their message)",
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    const numberArg = args[0]?.replace(/[^0-9]/g, '');

    let target =
      (numberArg ? `${numberArg}@s.whatsapp.net` : null) ||
      ctx?.participantPn ||
      ctx?.participantAlt ||
      ctx?.mentionedJid?.[0] ||
      ctx?.participant ||
      msg.key.participantPn ||
      msg.key.participantAlt ||
      msg.key.participant ||
      msg.key.remoteJidAlt ||
      msg.key.remoteJid;

    target = await resolveToPhoneJid(sock, target, jid);

    try {
      const ppUrl = await sock.profilePictureUrl(target, 'image');
      const buffer = await downloadBuffer(ppUrl);
      await sock.sendMessage(
        jid,
        { image: buffer, caption: `🖼 Profile picture of @${target.split('@')[0]}`, mentions: [target] },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ No profile picture available for this user.' }, { quoted: msg });
    }
  },
};
