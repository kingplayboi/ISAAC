/**
 * commands/getpfp.js
 * ---------------------
 * Get a user's profile picture. Usage: .getpfp @user (or reply to their message)
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

module.exports = {
  name: 'getpfp',
  description: "Get a user's profile picture. Usage: .getpfp @user (or reply to their message)",
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const target = ctx?.mentionedJid?.[0] || ctx?.participant || (msg.key.participant || msg.key.remoteJid);

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
