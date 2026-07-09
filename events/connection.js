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
const fs = require('fs');
const path = require('path');
const { DisconnectReason, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config/config');
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

  try {
    await autoJoinGroupOnce(sock);

    const selfJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : null;

    if (!selfJid) {
      logger.warn('[connection] sock.user not available yet — skipping startup/session-backup message this time.');
    } else {
      // Always send the startup message, whether this is a fresh pairing
      // or a reconnect using an existing session.
      await sock.sendMessage(selfJid, {
        text: '🤖 *ISAAC-MD has started running*',
      }).catch((err) => logger.error('Failed to send startup message:', err));

      if (!wasAlreadyRegistered) {
        // First-ever pairing on this device (fresh QR scan or pairing code) —
        // additionally back up the session as a portable SESSION_ID and DM
        // it to the owner's own WhatsApp. That way, if this server's
        // storage is ever wiped or you move hosts, you can reconnect by
        // pasting this value into the SESSION_ID environment variable
        // instead of re-pairing.
        const credsPath = path.join(__dirname, '..', config.authFolder, 'creds.json');

        if (fs.existsSync(credsPath)) {
          const credsBuffer = fs.readFileSync(credsPath);
          const sessionId = `ISAAC-MD:~${credsBuffer.toString('base64')}`;

          await sock.sendMessage(selfJid, {
            text: `✅ *ISAAC-MD linked successfully!*\n\n🔐 *Session Backup*\nSave this somewhere safe. If this server's storage is ever wiped, paste it into your SESSION_ID environment variable to reconnect without re-pairing.\n\n⚠️ Treat this like a password — anyone with it can fully control this WhatsApp account. Never share it publicly.\n\n${sessionId}`,
          });

          logger.info('✅ Session backup sent to your own WhatsApp number.');
        } else {
          logger.warn('[sessionBackup] creds.json not found yet — skipping session backup message.');
        }
      }
    }
  } catch (error) {
    logger.error(`[connection open] Failed during post-connect steps: ${error.message}`);
  }
}

    if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    switch (statusCode) {
      case DisconnectReason.badSession:
        logger.error('❌ Bad session file. Delete the auth folder and restart to re-link.');
        break;

      case DisconnectReason.loggedOut:
        logger.error('❌ Device logged out. Delete the auth folder / SESSION_ID and re-scan to re-link.');
        break;

      case DisconnectReason.connectionReplaced:
        logger.error('❌ Connection replaced — another session was opened elsewhere. Not auto-reconnecting.');
        break;

      case DisconnectReason.connectionClosed:
        logger.warn('⚠️ Connection closed. Reconnecting...');
        startBot();
        break;

      case DisconnectReason.connectionLost:
        logger.warn('⚠️ Connection lost from server. Reconnecting...');
        startBot();
        break;

      case DisconnectReason.restartRequired:
        logger.warn('🔄 Restart required by WhatsApp. Reconnecting...');
        startBot();
        break;

      case DisconnectReason.timedOut:
        logger.warn('⚠️ Connection timed out. Reconnecting...');
        startBot();
        break;

      default:
        logger.warn(`⚠️ Connection closed (reason: ${statusCode || 'unknown'}). Reconnecting...`);
        startBot();
    }
  }
  });
}

module.exports = { registerConnectionHandler };
