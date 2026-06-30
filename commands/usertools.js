/**
 * commands/usertools.js
 * -----------------------
 * User utility commands: block, fullpp, gjid, jid, left, pp, unblock
 */

const https = require('https');

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = [

  // ── BLOCK ───────────────────────────────────────────────────────────────────
  {
    name: 'block',
    description: 'Block a user. Usage: .block @user (or reply to their message)',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant;

      if (!target) {
        return sock.sendMessage(jid, { text: '❌ Tag or reply to the user you want to block.' }, { quoted: msg });
      }

      try {
        await sock.updateBlockStatus(target, 'block');
        await sock.sendMessage(jid, { text: `🚫 Blocked @${target.split('@')[0]}.`, mentions: [target] }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not block user: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── UNBLOCK ─────────────────────────────────────────────────────────────────
  {
    name: 'unblock',
    description: 'Unblock a user. Usage: .unblock 254712345678',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const number = args[0]?.replace(/[^0-9]/g, '');

      if (!number) {
        return sock.sendMessage(jid, { text: '❌ Usage: .unblock 254712345678' }, { quoted: msg });
      }

      try {
        const targetJid = `${number}@s.whatsapp.net`;
        await sock.updateBlockStatus(targetJid, 'unblock');
        await sock.sendMessage(jid, { text: `✅ Unblocked +${number}.` }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not unblock user: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── PP — get a user's profile picture ─────────────────────────────────────────
  {
    name: 'pp',
    description: "Get a user's profile picture. Usage: .pp @user (or reply to their message)",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant || (msg.key.participant || msg.key.remoteJid);

      try {
        const ppUrl = await sock.profilePictureUrl(target, 'image');
        const buffer = await downloadBuffer(ppUrl);
        await sock.sendMessage(jid, { image: buffer, caption: `🖼 Profile picture of @${target.split('@')[0]}`, mentions: [target] }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ No profile picture available for this user.' }, { quoted: msg });
      }
    }
  },

  // ── FULLPP — get full resolution profile picture ────────────────────────────
  {
    name: 'fullpp',
    description: "Get a user's full resolution profile picture. Usage: .fullpp @user",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant || (msg.key.participant || msg.key.remoteJid);

      try {
        const ppUrl = await sock.profilePictureUrl(target, 'image');
        const buffer = await downloadBuffer(ppUrl);
        await sock.sendMessage(jid, {
          document: buffer,
          mimetype: 'image/jpeg',
          fileName: 'profile.jpg',
          caption: `🖼 Full resolution profile picture of @${target.split('@')[0]}`,
          mentions: [target]
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ No profile picture available for this user.' }, { quoted: msg });
      }
    }
  },

  // ── JID — get the JID of a user ────────────────────────────────────────────────
  {
    name: 'jid',
    description: 'Get your own or a tagged user\'s JID. Usage: .jid or .jid @user',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant || (msg.key.participant || msg.key.remoteJid);

      await sock.sendMessage(jid, { text: `🆔 *JID:*\n${target}` }, { quoted: msg });
    }
  },

  // ── GJID — get the group's JID ───────────────────────────────────────────────
  {
    name: 'gjid',
    description: "Get the current group's JID.",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }
      await sock.sendMessage(jid, { text: `🆔 *Group JID:*\n${jid}` }, { quoted: msg });
    }
  },

  // ── LEFT — make bot leave a group ──────────────────────────────────────────────
  {
    name: 'left',
    description: 'Make the bot leave the current group.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: '👋 Goodbye! Bot is leaving this group.' });
      await sock.groupLeave(jid);
    }
  },

];
