/**
 * commands/groupsecurity.js
 * ---------------------------
 * Group security/anti-spam commands: antifake, antigm, antigstatus, antilink,
 * antispam, antiword, common, gpp, gstatus
 *
 * Toggle settings are stored per-group in config/groupSettings.json.
 * Actual enforcement (detecting links, banned words, etc.) should be wired
 * into events/messages.js separately — these commands just manage the toggles.
 */

const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, '../config/groupSettings.json');

function loadSettings() {
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  }
  return {};
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function toggleSetting(jid, key, mode) {
  const settings = loadSettings();
  if (!settings[jid]) settings[jid] = {};
  settings[jid][key] = mode === 'on';
  saveSettings(settings);
}

function makeToggleCommand(name, settingKey, label, emoji) {
  return {
    name,
    description: `Toggle ${label}. Usage: .${name} on/off`,
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const mode = args[0]?.toLowerCase();
      if (mode !== 'on' && mode !== 'off') {
        return sock.sendMessage(jid, { text: `❌ Usage: .${name} on  or  .${name} off` }, { quoted: msg });
      }

      toggleSetting(jid, settingKey, mode);
      await sock.sendMessage(jid, { text: `${emoji} ${label} turned ${mode}.` }, { quoted: msg });
    }
  };
}

module.exports = [

  // ── ANTIFAKE — blocks numbers not matching certain country codes ────────────
  makeToggleCommand('antifake', 'antifake', 'Anti-fake number protection', '🛡️'),

  // ── ANTIGM — anti group mentions spam ────────────────────────────────────────
  makeToggleCommand('antigm', 'antigm', 'Anti-group-mention spam protection', '🛡️'),

  // ── ANTIGSTATUS — block @everyone-style group status spam ───────────────────
  makeToggleCommand('antigstatus', 'antigstatus', 'Anti-group-status spam protection', '🛡️'),

  // ── ANTILINK — auto-remove messages containing links ─────────────────────────
  makeToggleCommand('antilink', 'antilink', 'Anti-link protection', '🔗'),

  // ── ANTISPAM — rate-limit repeated messages ───────────────────────────────────
  makeToggleCommand('antispam', 'antispam', 'Anti-spam protection', '🚫'),

  // ── ANTIWORD — block banned words ─────────────────────────────────────────────
  makeToggleCommand('antiword', 'antiword', 'Banned word filter', '🤬'),

  // ── COMMON — shows current group settings summary ───────────────────────────
  {
    name: 'common',
    description: 'Show current group protection settings.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const settings = loadSettings()[jid] || {};
      const flag = (v) => v ? '✅ ON' : '❌ OFF';

      const text = `
╭──〔 🛡️ GROUP SETTINGS 〕──╮
🔗 Antilink: ${flag(settings.antilink)}
🚫 Antispam: ${flag(settings.antispam)}
🤬 Antiword: ${flag(settings.antiword)}
🛡️ Antifake: ${flag(settings.antifake)}
🛡️ Antigm: ${flag(settings.antigm)}
🛡️ Antigstatus: ${flag(settings.antigstatus)}
👋 Welcome: ${flag(settings.welcome)}
👋 Goodbye: ${flag(settings.goodbye)}
╰──────────────────╯`.trim();

      await sock.sendMessage(jid, { text }, { quoted: msg });
    }
  },

  // ── GPP — Get group profile picture ──────────────────────────────────────────
  {
    name: 'gpp',
    description: "Get the group's profile picture.",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      try {
        const ppUrl = await sock.profilePictureUrl(jid, 'image');
        const https = require('https');
        const buffer = await new Promise((resolve, reject) => {
          https.get(ppUrl, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          }).on('error', reject);
        });

        await sock.sendMessage(jid, { image: buffer, caption: '🖼 Group Profile Picture' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ This group has no profile picture set.' }, { quoted: msg });
      }
    }
  },

  // ── GSTATUS — post a replied photo/video directly into the group chat ────────
  {
    name: 'gstatus',
    description: "Post a replied photo/video into this group's chat (not the bot's WhatsApp status). Usage: reply to media with .gstatus",
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      if (!jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, { text: '❌ This command only works in groups.' }, { quoted: msg });
      }

      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;

      if (!quoted?.imageMessage && !quoted?.videoMessage) {
        return sock.sendMessage(jid, { text: '❌ Reply to a photo or video with .gstatus' }, { quoted: msg });
      }

      try {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const media = await downloadMediaMessage(
          { message: quoted, key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant } },
          'buffer',
          {}
        );

        const type = quoted.imageMessage ? 'image' : 'video';
        const caption = quoted[`${type}Message`]?.caption || '';

        // Send straight into the group chat as a normal message —
        // this is the "group status", distinct from the bot's personal WhatsApp status.
        await sock.sendMessage(jid, { [type]: media, caption }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Failed to post: ' + e.message }, { quoted: msg });
      }
    }
  },

];
