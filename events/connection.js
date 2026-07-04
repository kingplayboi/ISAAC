/**
 * events/connection.js
 * --------------------
 * Handles the 'connection.update' event from Baileys.
 *
 * This event fires whenever the bot's connection state to WhatsApp changes,
 * for example:
 *   - 'connecting'  -> the socket is attempting to connect
 *   - 'open'        -> successfully connected and ready to send/receive
 *   - 'close'       -> disconnected (we decide here whether to reconnect)
 *
 * It's also responsible for printing the QR code to the terminal so the
 * user can link their WhatsApp account on first run.
 */

const qrcode = require('qrcode-terminal');
const { DisconnectReason } = require('@whiskeysockets/baileys');
const logger = require('../utils/logger');
const { autoJoinGroupOnce } = require('../utils/autoJoin');

/**
 * Registers the connection update listener on the given socket.
 *
 * @param {object} sock - the Baileys socket instance
 * @param {Function} startBot - reference to the bot startup function,
 *                              used to reconnect automatically when needed
 */
function registerConnectionHandler(sock, startBot, wasAlreadyRegistered) {
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Scan the QR code below with WhatsApp to log in:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      logger.info('Connecting to WhatsApp...');
    }

    if (connection === 'open') {
  logger.info('✅ Connected to WhatsApp successfully!');

  await autoJoinGroupOnce(sock);

  if (wasAlreadyRegistered) {
    const selfJid = sock.user.id;

    sock.sendMessage(selfJid, {
      text: '🤖 *ISAAC-MD has started running*',
    }).catch((err) => logger.error('Failed to send startup message:', err));
  }
}

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut) {
        logger.error(
          '❌ Connection closed: logged out. Delete the auth folder and restart to re-link.'
        );
      } else {
        logger.warn('⚠️ Connection closed unexpectedly. Reconnecting...');
        startBot();
      }
    }
  });
}

module.exports = { registerConnectionHandler };
