/**
 * commands/groupmembers.js
 * --------------------------
 * Group membership commands: invite, join, welcome, goodbye, unmute, amute, aunmute
 *
 * NOTE: 'add' intentionally lives only in commands/add.js — it used to
 * also be defined here, which silently overwrote the more capable
 * standalone version (reply support, already-a-member check) in the
 * command registry, since this file loaded after add.js.
 *
 * amute/aunmute schedule a GROUP-WIDE mute/unmute after a countdown
 * (e.g. .amute 50s, .aunmute 2m) — not a per-member mute. Scheduled with
 * setTimeout, so a bot restart before the timer fires cancels it
 * silently, same limitation as the existing .reminder command.
 */
const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');

function parseDuration(input) {
  const match = /^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs)?$/i.exec((input || '').trim());
  if (!match) return null;

  const value = parseInt(match[1], 10);
  if (!value || value <= 0) return null;

  const unitRaw = (match[2] || 's').toLowerCase();
  let ms, unitLabel;

  if (unitRaw.startsWith('h')) {
    ms = value * 3600000;
    unitLabel = value === 1 ? 'hour' : 'hours';
  } else if (unitRaw.startsWith('m')) {
    ms = value * 60000;
    unitLabel = value === 1 ? 'minute' : 'minutes';
  } else {
    ms = value * 1000;
    unitLabel = value === 1 ? 'second' : 'seconds';
  }

  return { ms, label: `${value} ${unitLabel}` };
}

async function checkAdminPerms(sock, msg) {
  const jid = msg.key.remoteJid;
  const metadata = await sock.groupMetadata(jid);
  const senderJid = msg.key.participant || msg.key.remoteJid;

  if (!isSenderAdmin(metadata, senderJid)) {
    await sock.sendMessage(jid, { text: '❌ Only group admins can use this command.' }, { quoted: msg });
    return false;
  }
  if (!isBotAdmin(sock, metadata)) {
    await sock.sendMessage(jid, { text: '❌ I need to be a group admin to change group settings.' }, { quoted: msg });
    return false;
  }
  return true;
}

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
  description: 'Make the bot join a group via invite link. Usage: .join <link> or reply .join',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    let link = args[0];

    // If no link was provided, try getting it from the replied message
    if (!link) {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (quoted) {
        link =
          quoted.conversation ||
          quoted.extendedTextMessage?.text ||
          quoted.imageMessage?.caption ||
          quoted.videoMessage?.caption ||
          '';
      }
    }

    // Extract the WhatsApp invite link
    const match = link?.match(/https?:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);

    if (!match) {
      return sock.sendMessage(
        jid,
        {
          text: '❌ Usage:\n.join <WhatsApp group invite link>\n\nor reply to a message containing a WhatsApp group link with *.join*'
        },
        { quoted: msg }
      );
    }

    try {
      await sock.groupAcceptInvite(match[1]);

      await sock.sendMessage(
        jid,
        { text: '✅ Bot joined the group successfully!' },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(
        jid,
        { text: '❌ Could not join group: ' + e.message },
        { quoted: msg }
      );
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

  // ── AMUTE — schedule the group to mute after a delay ────────────────────────
  {
    name: 'amute',
    description: 'Schedule the group to be muted after a delay. Usage: .amute 50s | .amute 2m | .amute 1h',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const duration = parseDuration(args[0]);
      if (!duration) {
        return sock.sendMessage(
          jid,
          { text: '❌ Usage: .amute <duration>\nExamples: .amute 50s | .amute 2m | .amute 1h' },
          { quoted: msg }
        );
      }

      if (!(await checkAdminPerms(sock, msg))) return;

      await sock.sendMessage(jid, { text: `⏳ Group will be muted in ${duration.label}.` }, { quoted: msg });

      setTimeout(async () => {
        try {
          await sock.groupSettingUpdate(jid, 'announcement');
          await sock.sendMessage(jid, { text: '🔇 Group has been muted — only admins can send messages now.' });
        } catch (e) {
          await sock.sendMessage(jid, { text: '❌ Scheduled mute failed: ' + e.message });
        }
      }, duration.ms);
    }
  },

  // ── AUNMUTE — schedule the group to unmute after a delay ─────────────────────
  {
    name: 'aunmute',
    description: 'Schedule the group to be unmuted after a delay. Usage: .aunmute 50s | .aunmute 2m | .aunmute 1h',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const duration = parseDuration(args[0]);
      if (!duration) {
        return sock.sendMessage(
          jid,
          { text: '❌ Usage: .aunmute <duration>\nExamples: .aunmute 50s | .aunmute 2m | .aunmute 1h' },
          { quoted: msg }
        );
      }

      if (!(await checkAdminPerms(sock, msg))) return;

      await sock.sendMessage(jid, { text: `⏳ Group will be unmuted in ${duration.label}.` }, { quoted: msg });

      setTimeout(async () => {
        try {
          await sock.groupSettingUpdate(jid, 'not_announcement');
          await sock.sendMessage(jid, { text: '🔊 Group has been unmuted — everyone can send messages now.' });
        } catch (e) {
          await sock.sendMessage(jid, { text: '❌ Scheduled unmute failed: ' + e.message });
        }
      }, duration.ms);
    }
  },

];
