globalThis.crypto = require('node:crypto').webcrypto;
/**
 * index.js
 * --------
 * Entry point of the application.
 *
 * This file is intentionally kept thin — its only job is to:
 *   1. Set up the Baileys socket connection (with auth persistence).
 *   2. Load all commands from the /commands folder.
 *   3. Wire up event handlers from /events.
 *   4. Handle top-level process errors so the bot doesn't die silently.
 *
 * All actual feature logic lives in commands/ and events/, keeping this
 * file easy to read at a glance.
 */

const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const config = require('./config/config');
const logger = require('./utils/logger');
const { loadCommands } = require('./utils/commandLoader');
const { registerConnectionHandler } = require('./events/connection');
const { registerMessageHandler } = require('./events/messages');

// Load every command file once at startup. The resulting Map is passed
// into the message handler so it can dispatch incoming commands by name.
const commandsPath = path.join(__dirname, 'commands');
const commands = loadCommands(commandsPath);

/**
 * Initializes (or re-initializes, on reconnect) the WhatsApp socket
 * connection and wires up all event listeners.
 */
async function startBot() {
  try {
    // useMultiFileAuthState persists login credentials to disk (in the
    // folder defined by config.authFolder) so you don't need to re-scan
    // the QR code every time the bot restarts.
    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, config.authFolder)
    );

    // Always connect using the latest known WhatsApp Web protocol version
    // to reduce the chance of connection issues caused by an outdated version.
    const { version } = await fetchLatestBaileysVersion();

    // Ask for a phone number BEFORE creating the socket, so there's no race
    // between this prompt and Baileys generating a QR code. Only asked
    // once, on first run, before any session exists.
    let phoneNumber = null;
    if (!state.creds.registered) {
      const readline = require('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      phoneNumber = await new Promise((resolve) => {
        rl.question(
          'Enter your WhatsApp number with country code (e.g. 15551234567), or press Enter to use QR instead: ',
          (answer) => {
            rl.close();
            resolve(answer && answer.trim() ? answer.trim() : null);
          }
        );
      });
    }

    const sock = makeWASocket({
      version,
      auth: state,
      logger: logger.child ? logger.child({ module: 'baileys' }) : logger,
      // printQRInTerminal is deprecated in newer Baileys versions; we handle
      // QR rendering ourselves inside events/connection.js instead.
      // defaultQueryTimeoutMs: undefined fixes a known Baileys bug where
      // requestPairingCode() fails with "Connection Closed" (statusCode 428)
      // because the default query timeout is too short for the pairing
      // handshake. See WhiskeySockets/Baileys issue #1382 and #2008.
      defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 250,
      // Pinning a specific browser string is another documented fix for
      // the same 428 error, per WhiskeySockets/Baileys issue #1382.
      browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
    });

    // Persist updated credentials to disk every time Baileys refreshes them.
    sock.ev.on('creds.update', saveCreds);

    // Request the pairing code now that the socket exists, if the person
    // chose to use one instead of scanning the QR.
    if (phoneNumber) {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log('\n========================================');
      console.log(`   YOUR PAIRING CODE: ${code}`);
      console.log('========================================\n');
      logger.info('Enter this code in WhatsApp > Linked Devices > Link with phone number.');
    }

    // Register all event listeners, passing startBot itself into the
    // connection handler so it can trigger a clean reconnect when needed.
    registerConnectionHandler(sock, startBot);
    registerMessageHandler(sock, commands);
  } catch (error) {
    logger.error(`[startBot] Failed to start the bot: ${error.message}`);
  }
}

// --- Global safety nets -----------------------------------------------
// These catch errors that slip past local try/catch blocks (e.g. in
// third-party library internals) so the process logs the problem instead
// of crashing with an unhelpful stack trace or, worse, failing silently.

process.on('uncaughtException', (error) => {
  logger.error(`[uncaughtException] ${error.stack || error.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[unhandledRejection] ${reason}`);
});

// Kick everything off.
startBot();
