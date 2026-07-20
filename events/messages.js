const { proto, downloadMediaMessage } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const logger = require('../utils/logger');
const settingsStore = require('../utils/settingsStore');
const groupSettingsStore = require('../utils/groupSettingsStore');

function extractMessageText(message) {
  if (!message) return '';

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ''
  );
}

function registerMessageHandler(sock, commands) {
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
  console.log('MESSAGE RECEIVED:', msg.key);
      try {
        if (!msg.message) continue;
if (!msg.message) continue;
            if (msg.key.remoteJid.endsWith('@g.us')) {
              const groupSettingsStore = require('../utils/groupSettingsStore');
              const antigmMode = groupSettingsStore.get(msg.key.remoteJid, 'antigm', 'off');

              if (antigmMode !== 'off' && msg.message?.groupStatusMentionMessage) {
                const { isOwner } = require('../utils/isOwner');
                const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
                const senderJid = msg.key.participant || msg.key.remoteJid;

                if (!isOwner(msg)) {
                  const metadata = await sock.groupMetadata(msg.key.remoteJid);
                  if (!isSenderAdmin(metadata, senderJid) && isBotAdmin(sock, metadata)) {
                    try {
                      await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });

                      if (antigmMode === 'kick') {
                        await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                        await sock.sendMessage(msg.key.remoteJid, {
                          text: `status mention detected!!! @${senderJid.split('@')[0]} kicked 🚫`,
                          mentions: [senderJid],
                        });
                      } else if (antigmMode === 'warn') {
                        const { addWarning, resetWarnings } = require('../utils/warnings');
                        const count = addWarning(msg.key.remoteJid, senderJid);

                        if (count >= 3) {
                          resetWarnings(msg.key.remoteJid, senderJid);
                          await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                          await sock.sendMessage(msg.key.remoteJid, {
                            text: `status mention detected!!! @${senderJid.split('@')[0]} kicked 🚫`,
                            mentions: [senderJid],
                          });
                        } else {
                          await sock.sendMessage(msg.key.remoteJid, {
                            text: `⚠️WARNING⚠️\n*User :* @${senderJid.split('@')[0]}\n*Warn :* ${count}\n*Remaining :* ${3 - count}`,
                            mentions: [senderJid],
                          });
                        }
                      }
                    } catch (e) {
                      logger.error(`[antigm] Failed to delete/act: ${e.message}`);
                    }
                    continue;
                  }
                }
              }
            }


        const prefix = settingsStore.get('prefix', config.prefix);
        const workType = settingsStore.get('mode', config.WORK_TYPE);

        if (msg.key.remoteJid !== 'status@broadcast' && !msg.key.fromMe) {
          if (settingsStore.get('autoread', false)) {
            try {
              await sock.readMessages([msg.key]);
            } catch (e) {
              logger.error(`[autoread] Failed to mark message read: ${e.message}`);
            }
          }
        }

          if (msg.key.remoteJid === 'status@broadcast') {
                if (settingsStore.get('autoview', true)) {
                  try {
                    await sock.readMessages([msg.key]);
                  } catch (e) {
                    logger.error(`[autoview] Failed to mark status viewed: ${e.message}`);
                  }
                }

                if (settingsStore.get('autolike', false) && msg.key.participant) {
                  try {
                    const AUTOLIKE_EMOJIS = ['💀', '😈', '😡', '😂', '☺️', '🙂‍↔️', '☠️', '💯', '❤️', '👀', '🤌', '🫵', '🤙'];
                    const randomEmoji = AUTOLIKE_EMOJIS[Math.floor(Math.random() * AUTOLIKE_EMOJIS.length)];

                    await sock.sendMessage(
                      'status@broadcast',
                      { react: { text: randomEmoji, key: msg.key } },
                      { statusJidList: [msg.key.participant] }
                    );
                  } catch (e) {
                    logger.error(`[autolike] Failed to react to status: ${e.message}`);
                  }
                }
                continue;
              }

          if (msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
            if (settingsStore.get('antidelete', false)) {
              const { jidNormalizedUser } = require('@whiskeysockets/baileys');
              const messageCache = require('../utils/messageCache');
              const originalKey = msg.message.protocolMessage.key;
              const cached = messageCache.get(msg.key.remoteJid, originalKey?.id);

              const dest = settingsStore.get('antideleteDest', 'p');
              const targetJid = dest === 'g'
                ? msg.key.remoteJid
                : (sock.user?.id ? jidNormalizedUser(sock.user.id) : msg.key.remoteJid);

              if (cached) {
                try {
                  const senderTag = cached.senderJid ? `@${cached.senderJid.split('@')[0]}` : 'someone';
                  const header = `🗑️ *Antidelete* — ${senderTag} deleted a message:`;
                  const locationLine = dest === 'p' ? `\n📍 *Chat:* ${msg.key.remoteJid}` : '';

                  if (cached.type === 'text') {
                    await sock.sendMessage(targetJid, {
                      text: `${header}${locationLine}\n\n${cached.text}`,
                      mentions: cached.senderJid ? [cached.senderJid] : [],
                    });
                  } else if (cached.type === 'image' || cached.type === 'video') {
                    const buffer = await downloadMediaMessage({ message: cached.rawMessage }, 'buffer', {});
                    const payload = cached.type === 'image' ? { image: buffer } : { video: buffer };
                    await sock.sendMessage(targetJid, {
                      ...payload,
                      caption: `${header}${locationLine}${cached.text ? '\n\n' + cached.text : ''}`,
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

          if (msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.MESSAGE_EDIT) {
            if (settingsStore.get('antidelete', false)) {
              const { jidNormalizedUser } = require('@whiskeysockets/baileys');
              const messageCache = require('../utils/messageCache');
              const originalKey = msg.message.protocolMessage.key;
              const cached = messageCache.get(msg.key.remoteJid, originalKey?.id);

              const newText = extractMessageText(msg.message.protocolMessage.editedMessage);

              const dest = settingsStore.get('antideleteDest', 'p');
              const targetJid = dest === 'g'
                ? msg.key.remoteJid
                : (sock.user?.id ? jidNormalizedUser(sock.user.id) : msg.key.remoteJid);

              if (cached && newText) {
                try {
                  const senderTag = cached.senderJid ? `@${cached.senderJid.split('@')[0]}` : 'someone';
                  const locationLine = dest === 'p' ? `\n📍 *Chat:* ${msg.key.remoteJid}` : '';

                  await sock.sendMessage(targetJid, {
                    text: `✏️ *Antidelete (edit)* — ${senderTag} edited a message:${locationLine}\n\n*Before:*\n${cached.text}\n\n*After:*\n${newText}`,
                    mentions: cached.senderJid ? [cached.senderJid] : [],
                  });
                } catch (e) {
                  logger.error(`[antidelete edit] Failed to send edit notice: ${e.message}`);
                }
              }
            }
            continue;
          }

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

          if (settingsStore.get('autotyping', false)) {
              await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
          }
          if (settingsStore.get('autorecording', false)) {
              await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
          }

        const text = extractMessageText(msg.message).trim();
if (!text) continue;

          if (msg.key.remoteJid.endsWith('@g.us')) {
              let antilinkMode = groupSettingsStore.get(msg.key.remoteJid, 'antilink', 'off');
              if (settingsStore.get('antilinkall', false) && antilinkMode === 'off') {
                antilinkMode = 'on';
              }

            const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/)\S+/i;

            if (antilinkMode !== 'off' && linkRegex.test(text)) {
              const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
              const metadata = await sock.groupMetadata(msg.key.remoteJid);
              const senderJid = msg.key.participant || msg.key.remoteJid;

              if (!isSenderAdmin(metadata, senderJid)) {
                if (isBotAdmin(sock, metadata)) {
                  try {
                    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                  } catch (e) {
                    logger.error(`[antilink] Failed to delete message: ${e.message}`);
                  }

                  if (antilinkMode === 'kick') {
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
                  } else if (antilinkMode === 'warn') {
                    const { addWarning, resetWarnings } = require('../utils/warnings');
                    const count = addWarning(msg.key.remoteJid, senderJid);
                    if (count >= 3) {
                      resetWarnings(msg.key.remoteJid, senderJid);
                      try {
                        await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                        await sock.sendMessage(msg.key.remoteJid, {
                          text: `🔗🚫 @${senderJid.split('@')[0]} kicked after 3 warnings for sending links.`,
                          mentions: [senderJid],
                        });
                      } catch (e) {
                        logger.error(`[antilink] Failed to kick after warnings: ${e.message}`);
                      }
                    } else {
                      await sock.sendMessage(msg.key.remoteJid, {
                        text: `⚠️ Link deleted.\n*User:* @${senderJid.split('@')[0]}\n*Warn:* ${count}\n*Remaining:* ${3 - count}`,
                        mentions: [senderJid],
                      });
                    }
                  }
                }
                continue;
              }
            }
          }
            if (msg.key.remoteJid.endsWith('@g.us')) {
              if (settingsStore.get('antibot', false)) {
                const botPrefixPattern = /^[.\/!#]/;
                if (botPrefixPattern.test(text) && !msg.key.fromMe) {
                  const { isOwner } = require('../utils/isOwner');
                  const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
                  const senderJid = msg.key.participant || msg.key.remoteJid;

                  if (!isOwner(msg)) {
                    const metadata = await sock.groupMetadata(msg.key.remoteJid);
                    if (!isSenderAdmin(metadata, senderJid) && isBotAdmin(sock, metadata)) {
                      try {
                        await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                        await sock.sendMessage(msg.key.remoteJid, {
                          text: `🤖 Bot detected @${senderJid.split('@')[0]}, kicked.`,
                          mentions: [senderJid],
                        });
                      } catch (e) {
                        logger.error(`[antibot] Failed to kick: ${e.message}`);
                      }
                      continue;
                    }
                  }
                }
              }
            }

console.log('TEXT RECEIVED =', JSON.stringify(text));
console.log('PREFIX =', JSON.stringify(prefix));
console.log('STARTS WITH PREFIX =', text.startsWith(prefix));
        if (!text) continue;
        if (text.startsWith(prefix)) {
            await sock.sendMessage(msg.key.remoteJid, {
                react: {
                    text: '🕷️',
                    key: msg.key
                }
            });
        }
            if (msg.key.remoteJid.endsWith('@g.us')) {
              if (settingsStore.get('antitag', false)) {
                const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const TAG_THRESHOLD = 5;

                if (mentionedJid.length > TAG_THRESHOLD) {
                  const { isOwner } = require('../utils/isOwner');
                  const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
                  const senderJid = msg.key.participant || msg.key.remoteJid;

                  if (!isOwner(msg)) {
                    const metadata = await sock.groupMetadata(msg.key.remoteJid);
                    if (!isSenderAdmin(metadata, senderJid) && isBotAdmin(sock, metadata)) {
                      try {
                        await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                        await sock.sendMessage(msg.key.remoteJid, {
                          text: `🏷️ Mass-tag message deleted from @${senderJid.split('@')[0]}.`,
                          mentions: [senderJid],
                        });
                      } catch (e) {
                        logger.error(`[antitag] Failed to delete: ${e.message}`);
                      }
                      continue;
                    }
                  }
                }
              }
            }
            if (msg.key.remoteJid.endsWith('@g.us')) {
              if (settingsStore.get('badword', false)) {
                const fs = require('fs');
                const path = require('path');
                const listPath = path.join(__dirname, '../config/badwords.json');
                const badwords = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, 'utf8')) : [];

                const lowerText = text.toLowerCase();
                const matched = badwords.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));

                if (matched) {
                  const { isOwner } = require('../utils/isOwner');
                  const { isBotAdmin, isSenderAdmin } = require('../utils/isAdmin');
                  const senderJid = msg.key.participant || msg.key.remoteJid;

                  if (!isOwner(msg)) {
                    const metadata = await sock.groupMetadata(msg.key.remoteJid);
                    if (!isSenderAdmin(metadata, senderJid) && isBotAdmin(sock, metadata)) {
                      try {
                        await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                        await sock.groupParticipantsUpdate(msg.key.remoteJid, [senderJid], 'remove');
                        await sock.sendMessage(msg.key.remoteJid, {
                          text: `🚫 @${senderJid.split('@')[0]} kicked for using a banned word.`,
                          mentions: [senderJid],
                        });
                      } catch (e) {
                        logger.error(`[badword] Failed to delete/kick: ${e.message}`);
                      }
                      continue;
                    }
                  }
                }
              }
            }
        if (msg.key.fromMe && !text.startsWith(prefix)) continue;
        if (config.debugMessages) {
          logger.info(`[message] ${msg.key.remoteJid}: ${text}`);
        }

          if (!text.startsWith(prefix)) {
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
              if (!msg.key.remoteJid.endsWith('@g.us')) {
                if (settingsStore.get('gptdm', false)) {
                  try {
                    const https = require('https');
                    const { KEITH_BASE } = require('../config/apis');
                    const encoded = encodeURIComponent(text);

                    const reply = await new Promise((resolve, reject) => {
                      https.get(`${KEITH_BASE}/ai/gpt?q=${encoded}`, (res) => {
                        let raw = '';
                        res.on('data', (c) => (raw += c));
                        res.on('end', () => {
                          try {
                            const json = JSON.parse(raw);
                            if (!json.status) return reject(new Error(json.error || 'API request failed'));
                            resolve(
                              json.result
                                .replace(/Keith AI/gi, 'ISAAC AI')
                                .replace(/Keithkeizzah/gi, 'ISAAC')
                            );
                          } catch (e) {
                            reject(e);
                          }
                        });
                      }).on('error', reject);
                    });

                    if (reply) {
                      await sock.sendMessage(msg.key.remoteJid, { text: reply }, { quoted: msg });
                    }
                  } catch (e) {
                    logger.error(`[gptdm] Failed to get Gemini reply: ${e.message}`);
                  }
                  continue;
                }
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

        const withoutPrefix = text.slice(prefix.length).trim();
        const [commandName, ...args] = withoutPrefix.split(/\s+/);
console.log('COMMAND =', JSON.stringify(commandName));
console.log('ARGS =', args);

        const command = commands.get(commandName.toLowerCase());

        if (!command) {
          continue;
        }

if (workType === 'private' && !msg.key.fromMe) {
  const { isSudo } = require('../utils/isSudo');
  if (!isSudo(msg)) {
    continue;
  }
}

        await command.execute(sock, msg, args, commands);
      } catch (error) {
        logger.error(`[messageHandler] Error processing message: ${error.message}`);
      }
    }
  });
}

module.exports = { registerMessageHandler };
