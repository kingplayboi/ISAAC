const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { DisconnectReason, jidNormalizedUser } = require('@whiskeysockets/baileys');
const config = require('../config/config');
const logger = require('../utils/logger');
const { autoJoinGroupOnce } = require('../utils/autoJoin');
const HOSTING_URL = 'https://isaac-bothosting.name.ng';

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
    const { groupCache } = require('../utils/groupCache');
    try {
      const allGroups = await sock.groupFetchAllParticipating();
      for (const [groupJid, metadata] of Object.entries(allGroups)) {
        groupCache.set(groupJid, metadata);
      }
      logger.info(`✅ Warmed group metadata cache for ${Object.keys(allGroups).length} group(s).`);
    } catch (error) {
      logger.error(`[groupCache] Failed to warm cache on connect: ${error.message}`);
    }

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

      await sock.sendMessage(selfJid, {
        text:
          `🚀 *Want to host this bot and others yourself?*\n\n` +
          `Deploy it in minutes on our hosting platform:\n${HOSTING_URL}\n\n` +
          `1. Open the link and sign up\n` +
          `2. Select a bot of your choice\n`+
          `3. Pair your WhatsApp number\n` +
          `4. Enter bot name,session id and create bot`,
      }).catch((err) => logger.error('Failed to send hosting message:', err));

      if (!wasAlreadyRegistered) {
        // First-ever pairing on this device (fresh QR scan or pairing code) —
        // additionally back up the session as a portable SESSION_ID and DM
        // it to the owner's own WhatsApp. That way, if this server's
        // storage is ever wiped or you move hosts, you can reconnect by
        // pasting this value into the SESSION_ID environment variable
        // instead of re-pairing.

        // Also reset the message-cutoff marker used by events/messages.js —
        // a fresh pairing means any old cutoff (from a previous session on
        // this same server) no longer applies. Deleting it here lets
        // messages.js set a brand new cutoff the moment it next loads.
        try {
          fs.unlinkSync(path.join(__dirname, '..', config.authFolder, '.first_boot_cutoff'));
          logger.info('[cutoff] Reset first-boot cutoff for new pairing.');
        } catch {}

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
        process.exit(1);
        break;

      case DisconnectReason.loggedOut:
        logger.error('❌ Device logged out. Delete the auth folder / SESSION_ID and re-scan to re-link.');
        process.exit(1);
        break;

      case DisconnectReason.connectionReplaced:
        logger.error('❌ Connection replaced — another session was opened elsewhere. Not auto-reconnecting.');
        process.exit(1);
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
