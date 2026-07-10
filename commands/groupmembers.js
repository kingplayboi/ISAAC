/**
 * commands/groupmembers.js
 * --------------------------
 * Group membership commands: add, invite, join, welcome, goodbye, unmute, amute, aunmute
 */

module.exports = [

  // ── INVITE ──────────────────────────────────────────────────────────────────
  {
    name: 'invite',
    description: 'Get the group invite link.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      try {
        const code = await sock.groupInviteCode(jid);
        await sock.sendMessage(jid, {
          text: `🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}`
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not get invite link: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── JOIN ────────────────────────────────────────────────────────────────────
  {
    name: 'join',
    description: 'Make the bot join a group via invite link. Usage: .join <link>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const link = args[0];

      if (!link || !link.includes('chat.whatsapp.com')) {
        return sock.sendMessage(jid, { text: '❌ Usage: .join <WhatsApp group invite link>' }, { quoted: msg });
      }

      try {
        const code = link.split('chat.whatsapp.com/')[1];
        await sock.groupAcceptInvite(code);
        await sock.sendMessage(jid, { text: '✅ Bot joined the group successfully!' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not join group: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── WELCOME (toggle) ────────────────────────────────────────────────────────
  {
    name: 'welcome',
    description: 'Toggle welcome messages for new members. Usage: .welcome on/off',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const mode = args[0]?.toLowerCase();
      if (mode !== 'on' && mode !== 'off') {
        return sock.sendMessage(jid, { text: '❌ Usage: .welcome on  or  .welcome off' }, { quoted: msg });
      }

      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../config/groupSettings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings[jid]) settings[jid] = {};
      settings[jid].welcome = mode === 'on';
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      await sock.sendMessage(jid, { text: `✅ Welcome messages turned ${mode}.` }, { quoted: msg });
    }
  },

  // ── GOODBYE (toggle) ────────────────────────────────────────────────────────
  {
    name: 'goodbye',
    description: 'Toggle goodbye messages for leaving members. Usage: .goodbye on/off',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const mode = args[0]?.toLowerCase();
      if (mode !== 'on' && mode !== 'off') {
        return sock.sendMessage(jid, { text: '❌ Usage: .goodbye on  or  .goodbye off' }, { quoted: msg });
      }

      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../config/groupSettings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings[jid]) settings[jid] = {};
      settings[jid].goodbye = mode === 'on';
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      await sock.sendMessage(jid, { text: `✅ Goodbye messages turned ${mode}.` }, { quoted: msg });
    }
  },

  // ── UNMUTE (alias-friendly distinct from existing mute.js) ────────────────────
  {
    name: 'unmute',
    description: 'Unmute the group, allowing all members to send messages.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      try {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        await sock.sendMessage(jid, { text: '🔓 Group unmuted. Everyone can send messages now.' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Could not unmute group: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── AMUTE (mute a specific member by restricting/removing if they message — soft mute via warn) ─
  {
    name: 'amute',
    description: 'Mute a specific member (admin only - they get warned if they type). Usage: .amute @user',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant;

      if (!target) {
        return sock.sendMessage(jid, { text: '❌ Tag or reply to the user you want to mute.' }, { quoted: msg });
      }

      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../config/groupSettings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!settings[jid]) settings[jid] = {};
      if (!settings[jid].mutedUsers) settings[jid].mutedUsers = [];
      if (!settings[jid].mutedUsers.includes(target)) settings[jid].mutedUsers.push(target);
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

      await sock.sendMessage(jid, { text: `🔇 @${target.split('@')[0]} has been muted.`, mentions: [target] }, { quoted: msg });
    }
  },

  // ── AUNMUTE ─────────────────────────────────────────────────────────────────
  {
    name: 'aunmute',
    description: 'Unmute a specific member. Usage: .aunmute @user',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const target = ctx?.mentionedJid?.[0] || ctx?.participant;

      if (!target) {
        return sock.sendMessage(jid, { text: '❌ Tag or reply to the user you want to unmute.' }, { quoted: msg });
      }

      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(__dirname, '../config/groupSettings.json');
      let settings = {};
      if (fs.existsSync(settingsPath)) settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings[jid]?.mutedUsers) {
        settings[jid].mutedUsers = settings[jid].mutedUsers.filter(u => u !== target);
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      }

      await sock.sendMessage(jid, { text: `🔊 @${target.split('@')[0]} has been unmuted.`, mentions: [target] }, { quoted: msg });
    }
  },

];
