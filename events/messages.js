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
      try {
        // 1. Skip completely if there's no actual message body structure
        if (!msg.message) continue;
        if (config.AUTO_TYPING) {
            await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
        }
        if (config.AUTO_RECORDING) {
            await sock.sendPresenceUpdate('recording', msg.key.remoteJid);
        }

        const text = extractMessageText(msg.message).trim();
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

        // Only react to messages that start with our configured prefix.
        if (!text.startsWith(config.prefix)) continue;

        // Split "!ping hello world" into command="ping", args=["hello","world"]
        const withoutPrefix = text.slice(config.prefix.length).trim();
        const [commandName, ...args] = withoutPrefix.split(/\s+/);

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
