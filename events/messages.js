/**
 * events/messages.js
 * ------------------
 * Handles the 'messages.upsert' event from Baileys, which fires whenever
 * a new message arrives (or an existing one is updated, e.g. edited).
 *
 * Responsibilities:
 *   1. Extract the plain text body from the various message shapes WhatsApp
 *      can send (conversation, extendedTextMessage, captions, etc.).
 *   2. Check whether the message starts with our configured command prefix.
 *   3. Look up and execute the matching command, with error handling so a
 *      single bad command never crashes the whole bot.
 */

const { proto, downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Pulls the readable text out of a Baileys message object.
 * WhatsApp messages come in several shapes depending on how they were
 * sent (plain text, reply, caption on an image, etc.), so we check each
 * possible location.
 *
 * @param {object} message - the `message` field of a Baileys message
 * @returns {string} the extracted text, or an empty string if none found
 */
function extractMessageText(message) {
  if (!message) return '';

  return (
    message.conversation || // plain text message
    message.extendedTextMessage?.text || // text message with a quote/reply/link preview
    message.imageMessage?.caption || // caption on an image
    message.videoMessage?.caption || // caption on a video
    ''
  );
}

/**
 * Registers the message listener on the given socket.
 *
 * @param {object} sock - the Baileys socket instance
 * @param {Map<string, object>} commands - all commands loaded at startup
 */
function registerMessageHandler(sock, commands) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // We only care about genuinely new messages, not history syncs or
    // other notification types Baileys may also send through this event.
    if (type !== 'notify') return;

    for (const msg of messages) {
  console.log('MESSAGE RECEIVED:', msg.key);
      try {
        // 1. Skip completely if there's no actual message body structure
        if (!msg.message) continue;

          // Auto-view WhatsApp statuses (defaults to ON)
            if (msg.key.remoteJid === 'status@broadcast') {
              const settingsStore = require('../utils/settingsStore');
              if (settingsStore.get('autoview', true)) {
                try {
                  await sock.readMessages([msg.key]);
                } catch (e) {
                  logger.error(`[autoview] Failed to mark status viewed: ${e.message}`);
                }
              }
              continue;
            }

            // Antidelete: detect revoked (deleted) messages and resend cached content
            if (msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
              const settingsStore = require('../utils/settingsStore');
              if (settingsStore.get('antidelete', false)) {
                const messageCache = require('../utils/messageCache');
                const originalKey = msg.message.protocolMessage.key;
                const cached = messageCache.get(msg.key.remoteJid, originalKey?.id);

                if (cached) {
                  try {
                    const senderTag = cached.senderJid ? `@${cached.senderJid.split('@')[0]}` : 'someone';
                    const header = `🗑️ *Antidelete* — ${senderTag} deleted a message:`;

                    if (cached.type === 'text') {
                      await sock.sendMessage(msg.key.remoteJid, {
                        text: `${header}\n\n${cached.text}`,
                        mentions: cached.senderJid ? [cached.senderJid] : [],
                      });
                    } else if (cached.type === 'image' || cached.type === 'video') {
                      const buffer = await downloadMediaMessage({ message: cached.rawMessage }, 'buffer', {});
                      const payload = cached.type === 'image' ? { image: buffer } : { video: buffer };
                      await sock.sendMessage(msg.key.remoteJid, {
                        ...payload,
                        caption: `${header}${cached.text ? '\n\n' + cached.text : ''}`,
                        mentions: cached.senderJid ? [cached.senderJid] : [],
                      });
                    }
                  } catch (e) {
                    logger.error(`[antidelete] Failed to resend deleted message: ${e.message}`);
                  }
                }
              }
              continue;
            }

            // Cache this message's content in case it gets deleted later
            try {
              const messageCache = require('../utils/messageCache');
              const senderJid = msg.key.participant || msg.key.remoteJid;
              const m = msg.message;

              if (m.imageMessage) {
                messageCache.set(msg.key.remoteJid, msg.key.id, {
                  type: 'image',
                  text: m.imageMessage.caption || '',
                  rawMessage: { imageMessage: m.imageMessage },
                  senderJid,
                });
              } else if (m.videoMessage) {
                messageCache.set(msg.key.remoteJid, msg.key.id, {
                  type: 'video',
                  text: m.videoMessage.caption || '',
                  rawMessage: { videoMessage: m.videoMessage },
                  senderJid,
                });
              } else {
                const plainText = m.conversation || m.extendedTextMessage?.text || '';
                if (plainText) {
                  messageCache.set(msg.key.remoteJid, msg.key.id, { type: 'text', text: plainText, senderJid });
                }
              }
            } catch (e) {
              logger.error(`[antidelete cache] ${e.message}`);
            }

          if (config.AUTO_TYPING) {
              await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
          }
        if (config.AUTO_RECORDING) {
            await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
        }

        const text = extractMessageText(msg.message).trim();
if (!text) continue;

          // Antilink: detect + delete links + kick sender when enabled for this group
          if (msg.key.remoteJid.endsWith('@g.us')) {
            const fs = require('fs');
            const path = require('path');
            const settingsPath = path.join(__dirname, '../config/groupSettings.json');

            let antilinkOn = false;
            if (fs.existsSync(settingsPath)) {
              const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
              antilinkOn = settings[msg.key.remoteJid]?.antilink === true;
            }

            const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/)\S+/i;

            if (antilinkOn && linkRegex.test(text)) {
              const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
              const metadata = await sock.groupMetadata(msg.key.remoteJid);
              const senderJid = msg.key.participant || msg.key.remoteJid;

              // Never delete/kick admins for posting a link
              if (!isSenderAdmin(metadata, senderJid)) {
                if (isBotAdmin(sock, metadata)) {
                  try {
                    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                  } catch (e) {
                    logger.error(`[antilink] Failed to delete message: ${e.message}`);
                  }

                  try {
                    await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                    await sock.sendMessage(
                      msg.key.remoteJid,
                      { text: `🔗🚫 @${senderJid.split('@')[0]} kicked for sending a link.`, mentions: [senderJid] }
                    );
                  } catch (e) {
                    logger.error(`[antilink] Failed to kick sender: ${e.message}`);
                    await sock.sendMessage(
                      msg.key.remoteJid,
                      { text: `🔗 Link deleted from @${senderJid.split('@')[0]}, but I couldn't remove them.`, mentions: [senderJid] }
                    );
                  }
                }
                continue;
              }
            }
          }

console.log('TEXT RECEIVED =', JSON.stringify(text));
console.log('PREFIX =', JSON.stringify(config.prefix));
console.log('STARTS WITH PREFIX =', text.startsWith(config.prefix));
        if (!text) continue;
        if (text.startsWith(config.prefix)) {
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: '⚡',
                    key: msg.key
                }
            });
        }

        // 2. Ignore messages sent by the bot account *unless* they start with your prefix command
        if (msg.key.fromMe && !text.startsWith(config.prefix)) continue;
        if (config.debugMessages) {
          logger.info(`[message] ${msg.key.remoteJid}: ${text}`);
        }

// Before checking the command prefix, handle cases that work
          // on PLAIN messages (no "!" needed): Lydia auto-chat, the active
          // number-guessing game, and fixed greeting auto-replies.
          if (!text.startsWith(config.prefix)) {
            const lydiaStore = require('../utils/lydiaStore');
            const senderJid = msg.key.participant || msg.key.remoteJid;
            if (lydiaStore.isEnabled(msg.key.remoteJid, senderJid)) {
              const { getLydiaReply } = require('../utils/lydiaChat');
              const reply = await getLydiaReply(text);
              if (reply) {
                await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
              }
              continue;
            }

            const { activeGames } = require('../commands/game');          const game = activeGames.get(msg.key.remoteJid);
          if (game && game.type === 'number' && /^\d+$/.test(text)) {
            const guess = parseInt(text, 10);
            game.attempts += 1;
            if (guess === game.target) {
              activeGames.delete(msg.key.remoteJid);
              await sock.sendMessage(
                msg.key.remoteJid,
                { text: `🎉 Correct! The number was ${game.target}. You got it in ${game.attempts} attempt(s).` },
                { quoted: msg }
              );
            } else if (guess < game.target) {
              await sock.sendMessage(msg.key.remoteJid, { text: '📈 Higher!' }, { quoted: msg });
            } else {
              await sock.sendMessage(msg.key.remoteJid, { text: '📉 Lower!' }, { quoted: msg });
            }
            continue;
          }

          const { getAutoReply } = require('../utils/autoreply');
          const autoReplyText = getAutoReply(text);
          if (autoReplyText) {
            await sock.sendMessage(msg.key.remoteJid, { text: autoReplyText }, { quoted: msg });
          }
          continue;
        }

        // Split "!ping hello world" into command="ping", args=["hello","world"]
        const withoutPrefix = text.slice(config.prefix.length).trim();
        const [commandName, ...args] = withoutPrefix.split(/\s+/);
console.log('COMMAND =', JSON.stringify(commandName));
console.log('ARGS =', args);

        const command = commands.get(commandName.toLowerCase());

        if (!command) {
          // Unknown command — fail silently (or you could reply with a
          // "command not found" message here if you prefer).
          continue;
        }

        // Execute the matched command. We pass the full `commands` map too,
        // since some commands (like !help) need to see every other command.
        await command.execute(sock, msg, args, commands);
      } catch (error) {
        // Catching errors per-message means one broken command doesn't
        // take down the bot's connection or block other incoming messages.
        logger.error(`[messageHandler] Error processing message: ${error.message}`);
      }
    }
  });
}

module.exports = { registerMessageHandler };
