/**
 * commands/whatsapp.js
 * ---------------------
 * WhatsApp commands: poll, react, del, setstatus, status, online, caption, doc
 *
 * Usage:
 *   .poll Question | Option1 | Option2
 *   .react 😂          (reply to a message)
 *   .del               (reply to a message)
 *   .setstatus <text>
 *   .status
 *   .online
 *   .caption <text>    (reply to media)
 *   .doc               (reply to media)
 *   .clear             (clears this entire chat, bot's own view)
 *   .save1             (reply to a status)
 */

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = [

  // ── POLL ──────────────────────────────────────────────────────────────────
  {
    name: 'poll',
    description: 'Create a poll. Usage: .poll Question | Option1 | Option2',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const input = args.join(' ');
      const parts = input.split('|').map(p => p.trim());

      if (parts.length < 3) {
        return sock.sendMessage(jid, {
          text: '❌ Usage: .poll Question | Option1 | Option2 | ...'
        }, { quoted: msg });
      }

      const question = parts[0];
      const options = parts.slice(1);

      await sock.sendMessage(jid, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1
        }
      });
    }
  },

  // ── REACT ─────────────────────────────────────────────────────────────────
  {
    name: 'react',
    description: 'React to a message with an emoji. Reply to a message with .react 😂',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;

      if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(jid, {
          text: '❌ Reply to a message with .react <emoji>'
        }, { quoted: msg });
      }

      const emoji = args[0];
      if (!emoji) {
        return sock.sendMessage(jid, { text: '❌ Provide an emoji. Example: .react 😂' }, { quoted: msg });
      }

      const ctx = msg.message.extendedTextMessage.contextInfo;
      const quotedParticipant = ctx.participantPn || ctx.participantAlt || ctx.participant;

      const key = {
        remoteJid: jid,
        id: ctx.stanzaId,
        fromMe: quotedParticipant === (sock.user?.id?.split(':')[0] + '@s.whatsapp.net'),
        participant: ctx.participant
      };

      await sock.sendMessage(jid, {
        react: { text: emoji, key }
      });
    }
  },

  // ── DEL ───────────────────────────────────────────────────────────────────
  {
    name: 'del',
    description: 'Delete a message. Reply to a message with .del',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const quoted = msg.message?.extendedTextMessage?.contextInfo;

      if (!quoted) {
        return sock.sendMessage(jid, {
          text: '❌ Reply to the message you want to delete.'
        }, { quoted: msg });
      }

      const quotedParticipant = quoted.participantPn || quoted.participantAlt || quoted.participant;

      const msgKey = {
        remoteJid: jid,
        id: quoted.stanzaId,
        fromMe: quotedParticipant === (sock.user?.id?.split(':')[0] + '@s.whatsapp.net'),
        participant: quoted.participant
      };

      await sock.sendMessage(jid, { delete: msgKey });
    }
  },

  // ── SETSTATUS ─────────────────────────────────────────────────────────────
  {
    name: 'setstatus',
    description: 'Set the bot WhatsApp status/bio. Usage: .setstatus <text>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const text = args.join(' ');

      if (!text) {
        return sock.sendMessage(jid, {
          text: '❌ Usage: .setstatus <your status text>'
        }, { quoted: msg });
      }

      await sock.updateProfileStatus(text);
      await sock.sendMessage(jid, { text: `✅ Status updated to:\n${text}` }, { quoted: msg });
    }
  },

  // ── STATUS ────────────────────────────────────────────────────────────────
  {
    name: 'status',
    description: 'Get the current bot WhatsApp status/bio.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      try {
        const status = await sock.fetchStatus(sock.user.id);
        await sock.sendMessage(jid, {
          text: `📝 *Bot Status:*\n${status?.status || 'No status set.'}`
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, { text: '❌ Could not fetch status.' }, { quoted: msg });
      }
    }
  },

  // ── ONLINE ────────────────────────────────────────────────────────────────
  {
    name: 'online',
    description: 'Set bot presence to online/available.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendPresenceUpdate('available', jid);
      await sock.sendMessage(jid, { text: '✅ Bot presence set to online.' }, { quoted: msg });
    }
  },

  // ── CAPTION ───────────────────────────────────────────────────────────────
  {
    name: 'caption',
    description: 'Add/change caption on a media message. Reply to media with .caption <text>',
    async execute(sock, msg, args) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;

      if (!quoted) {
        return sock.sendMessage(jid, {
          text: '❌ Reply to an image or video with .caption <text>'
        }, { quoted: msg });
      }

      const caption = args.join(' ');
      if (!caption) {
        return sock.sendMessage(jid, { text: '❌ Provide a caption text.' }, { quoted: msg });
      }

      const type = quoted.imageMessage ? 'image' : quoted.videoMessage ? 'video' : null;
      if (!type) {
        return sock.sendMessage(jid, { text: '❌ Only images and videos are supported.' }, { quoted: msg });
      }

      const media = await downloadMediaMessage(
        { message: quoted, key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant } },
        'buffer',
        {}
      );

      await sock.sendMessage(jid, {
        [type]: media,
        caption
      }, { quoted: msg });
    }
  },

  // ── DOC ───────────────────────────────────────────────────────────────────
  {
    name: 'doc',
    description: 'Send a media file as a document. Reply to media with .doc',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = ctx?.quotedMessage;

      if (!quoted) {
        return sock.sendMessage(jid, {
          text: '❌ Reply to a media message with .doc'
        }, { quoted: msg });
      }

      const type = Object.keys(quoted)[0];
      const media = await downloadMediaMessage(
        { message: quoted, key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant } },
        'buffer',
        {}
      );

      const mimetype = quoted[type]?.mimetype || 'application/octet-stream';
      const fileName = quoted[type]?.fileName || `file.${mimetype.split('/')[1] || 'bin'}`;

      await sock.sendMessage(jid, {
        document: media,
        mimetype,
        fileName
      }, { quoted: msg });
    }
  },

  // ── ANTIEDIT ──────────────────────────────────────────────────────────────
  {
    name: 'antiedit',
    description: 'Toggle antiedit — reveals original message when someone edits it.',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, {
        text: `ℹ️ Antiedit is handled automatically by the bot's event listener.\nEdited messages in this chat will be revealed.`
      }, { quoted: msg });
    }
  },

  // ── CINFO ─────────────────────────────────────────────────────────────────
  {
    name: 'cinfo',
    description: 'Get info about a contact. Usage: .cinfo @user',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = ctx?.mentionedJid?.[0] || ctx?.participantPn || ctx?.participantAlt || ctx?.participant;

      if (!mentioned) {
        return sock.sendMessage(jid, {
          text: '❌ Tag or reply to a user. Example: .cinfo @user'
        }, { quoted: msg });
      }

      try {
        const info = await sock.onWhatsApp(mentioned);
        const status = await sock.fetchStatus(mentioned);
        const pp = await sock.profilePictureUrl(mentioned, 'image').catch(() => null);

        const text = `
╭──〔 👤 CONTACT INFO 〕──╮
📱 *Number:* +${mentioned.split('@')[0]}
✅ *On WhatsApp:* ${info?.[0]?.exists ? 'Yes' : 'No'}
📝 *Status:* ${status?.status || 'None'}
🖼 *Profile Pic:* ${pp ? pp : 'Not available'}
╰──────────────────╯`.trim();

        await sock.sendMessage(jid, { text }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, { text: '❌ Could not fetch contact info.' }, { quoted: msg });
      }
    }
  },

  // ── CLEAR ─────────────────────────────────────────────────────────────────
  {
    name: 'clear',
    description: 'Clears this entire chat, leaving it empty. Usage: .clear',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;

      try {
        await sock.chatModify(
          {
            delete: true,
            lastMessages: [
              {
                key: { remoteJid: jid, fromMe: msg.key.fromMe, id: msg.key.id },
                messageTimestamp: msg.messageTimestamp,
              },
            ],
          },
          jid
        );
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Failed to clear chat: ' + e.message }, { quoted: msg });
      }
    }
  },

  // ── SAVE1 ─────────────────────────────────────────────────────────────────
  {
    name: 'save1',
    description: 'Screenshot/save a status. Reply to a status with .save1',
    async execute(sock, msg) {
      const jid = msg.key.remoteJid;
      await sock.sendMessage(jid, {
        text: '⚠️ Status saving requires the bot to be watching statuses.\nMake sure autoread status is enabled.'
      }, { quoted: msg });
    }
  },

];
