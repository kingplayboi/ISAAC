globalThis.crypto = require('node:crypto').webcrypto;
require('dotenv').config();
const path = require('path');
const { groupCache } = require('./utils/groupCache');
const figlet = require('figlet');
const chalk = require('chalk');
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
const { fetchCore } = require('./utils/fetchCore');

// Load every command file once at startup. The resulting Map is passed
const fs = require('fs');

/**
 * If a SESSION_ID is provided (via Heroku config vars or .env) and no
 * local auth session exists yet, decode it back into creds.json so the
 * bot can connect without needing a fresh QR/pairing code scan.
 */
function restoreSettingsFromEnv() {
  const settingsPath = path.join(__dirname, 'config', 'botSettings.json');

  if (config.botSettingsData && !fs.existsSync(settingsPath)) {
    try {
      const raw = Buffer.from(config.botSettingsData, 'base64').toString('utf8');
      fs.writeFileSync(settingsPath, raw);
      logger.info('✅ Restored bot settings from BOT_SETTINGS_DATA.');
    } catch (error) {
      logger.error(`[restoreSettingsFromEnv] Failed to restore settings: ${error.message}`);
    }
  }
}

function restoreSessionFromEnv() {
  const authDir = path.join(__dirname, config.authFolder);
  const credsPath = path.join(authDir, 'creds.json');

  if (config.sessionId && !fs.existsSync(credsPath)) {
    try {
      if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
      const raw = config.sessionId.replace(/^ISAAC-MD:~/, ''); // strip prefix if present
      const buffer = Buffer.from(raw, 'base64');
      fs.writeFileSync(credsPath, buffer);
      logger.info('✅ Restored session from SESSION_ID.');
    } catch (error) {
      logger.error(`[restoreSessionFromEnv] Failed to restore session: ${error.message}`);
    }
  }
}
// into the message handler so it can dispatch incoming commands by name.
const commandsPath = path.join(__dirname, 'commands');
let commands = {};

// Caches group metadata in memory so Baileys can resolve group encryption
// sessions without re-fetching from WhatsApp on every message. Without this,
// group commands can fail with a "No sessions" error.

/**
 * Initializes (or re-initializes, on reconnect) the WhatsApp socket
 * connection and wires up all event listeners.
 */
function printBanner() {
  console.log(
    chalk.green(
      figlet.textSync('ISAAC-MD', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      })
    )
  );
  console.log(chalk.cyan('🤖 ISAAC-MD is starting up...'));
}
async function startBot() {
  try {
    // useMultiFileAuthState persists login credentials to disk (in the
    // folder defined by config.authFolder) so you don't need to re-scan
    // the QR code every time the bot restarts.
restoreSessionFromEnv();
restoreSettingsFromEnv();

    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, config.authFolder)
    );
const wasAlreadyRegistered = state.creds.registered;

    // Always connect using the latest known WhatsApp Web protocol version
    // to reduce the chance of connection issues caused by an outdated version.
    const { version } = await fetchLatestBaileysVersion();

    // Ask for a phone number BEFORE creating the socket, so there's no race
    // between this prompt and Baileys generating a QR code. Only asked
    // once, on first run, before any session exists.
    let phoneNumber = null;
    if (!state.creds.registered && process.stdin.isTTY) {
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
      defaultQueryTimeoutMs: 90000,
        connectTimeoutMs: 90000,
        keepAliveIntervalMs: 15000,
        retryRequestDelayMs: 1000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      // Pinning a specific browser string is another documented fix for
      // the same 428 error, per WhiskeySockets/Baileys issue #1382.
      browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
      // Lets Baileys resolve group encryption sessions from our in-memory
      // cache instead of always hitting the network, which fixes "No
      // sessions" errors when responding to commands sent in groups.
      cachedGroupMetadata: async (jid) => groupCache.get(jid),
    });

    // Persist updated credentials to disk every time Baileys refreshes them.
    sock.ev.on('creds.update', saveCreds);
let pairingCodeRequested = false;

sock.ev.on('connection.update', async ({ connection }) => {
  if (
    connection === 'connecting' &&
    phoneNumber &&
    !pairingCodeRequested
  ) {
    pairingCodeRequested = true;

    try {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const code = await sock.requestPairingCode(phoneNumber);

      console.log('\n========================================');
      console.log(`   YOUR PAIRING CODE: ${code}`);
      console.log('========================================\n');

      logger.info(
        'Enter this code in WhatsApp > Linked Devices > Link with phone number.'
      );
    } catch (error) {
      logger.error(`[pairing] ${error.message}`);
    }
  }
});

    // Keep the group metadata cache warm whenever group info changes, so
    // Baileys always has fresh data available for encryption sessions.
    sock.ev.on('groups.update', async ([event]) => {
      try {
        if (!event?.id) return;
        const metadata = await sock.groupMetadata(event.id);
        groupCache.set(event.id, metadata);
      } catch (error) {
        logger.error(`[groupCache] Failed to update metadata for ${event?.id}: ${error.message}`);
      }
    });

    sock.ev.on('group-participants.update', async (event) => {
      try {
        if (!event?.id) return;
        const metadata = await sock.groupMetadata(event.id);
        groupCache.set(event.id, metadata);


        // Welcome/goodbye: only sends if BOTH the global master switch
        // (.welcomegoodbye) and the per-group toggle (.welcome / .goodbye)
        // are enabled.
        const settingsStore = require('./utils/settingsStore');
        if (settingsStore.get('welcomegoodbye', false)) {
          const fs = require('fs');
          const path = require('path');
          const settingsPath = path.join(__dirname, 'config', 'groupSettings.json');
          const groupSettings = fs.existsSync(settingsPath)
            ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
            : {};
          const perGroup = groupSettings[event.id] || {};

          for (const entry of event.participants) {
              const participant = entry.phoneNumber || entry.id || entry;

              if (event.action === 'add' && perGroup.welcome) {
                await sock.sendMessage(event.id, {
                  text: `👋 Welcome @${participant.split('@')[0]} to *${metadata.subject}*! Glad to have you here.`,
                  mentions: [participant],
                });
              } else if (event.action === 'remove' && perGroup.goodbye) {
                await sock.sendMessage(event.id, {
                  text: `👋 @${participant.split('@')[0]} has left *${metadata.subject}*. Goodbye!`,
                  mentions: [participant],
                });
              }
            }
        }
      } catch (error) {
        logger.error(`[groupCache] Failed to update metadata for ${event?.id}: ${error.message}`);
      }
    });
// Autobio: periodically refresh the bio/about text with the current
    // time (every 1 minute) and a rotating quote (changes every 12 hours).
    // WhatsApp's About field is a static snapshot, not a live clock, so we
    // keep it looking "current" by pushing an update on a safe interval
    // rather than trying to update it continuously (which would risk
    // rate-limiting / account restrictions).
    setInterval(async () => {
      try {
        const settingsStore = require('./utils/settingsStore');
        if (!settingsStore.get('autobio', false)) return;

        const quotes = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'autobioQuotes.json'), 'utf8'));
        const quoteIndex = Math.floor(Date.now() / (12 * 60 * 60 * 1000)) % quotes.length;
        const quote = quotes[quoteIndex];

        const now = new Date();
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: config.timezone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
        const dateStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: config.timezone,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(now);

        const bioText = `ISAAC-MD is alive now\n${dateStr} ${timeStr}\n"${quote}"`;

        await sock.updateProfileStatus(bioText);
      } catch (error) {
        logger.error(`[autobio] Failed to update bio: ${error.message}`);
      }
    }, 60 * 1000);

    // Automatically reject incoming calls when .anticall is enabled.
    sock.ev.on('call', async (calls) => {
      try {
        const settingsStore = require('./utils/settingsStore');
        if (!settingsStore.get('anticall', false)) return;

        for (const call of calls) {
          if (call.status === 'offer') {
            await sock.rejectCall(call.id, call.from);
            logger.info(`[anticall] Rejected incoming call from ${call.from}`);
          }
        }
      } catch (error) {
        logger.error(`[anticall] Failed to reject call: ${error.message}`);
      }
    });
// WAPresence: keep presence as "available" continuously, since a
    // single sendPresenceUpdate call fades once the connection idles.
    setInterval(async () => {
      try {
        const settingsStore = require('./utils/settingsStore');
        if (settingsStore.get('wapresence', false)) {
          await sock.sendPresenceUpdate('available');
        }
      } catch (error) {
        logger.error(`[wapresence] Failed to update presence: ${error.message}`);
      }
    }, 30 * 1000);

    // Register all event listeners, passing startBot itself into the
    // connection handler so it can trigger a clean reconnect when needed.
    registerConnectionHandler(sock, startBot, wasAlreadyRegistered);
    registerMessageHandler(sock, commands);

    // Automatically clear in-memory caches every 6 hours so long uptime
    // doesn't slowly grow memory usage. Only schedule this once, not on
    // every reconnect.
    if (!global.__cacheClearScheduled) {
      global.__cacheClearScheduled = true;
      setInterval(() => {
        const results = global.runClearCache(commands);
        logger.info(`[clearcache] Automatic cache clear: ${JSON.stringify(results)}`);
      }, 6 * 60 * 60 * 1000);
    }
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

// Kick everything off. ISAAC_RESTART_DELAY_MS is set by .updatenow when it
// spawns this process as a replacement for itself — a short delay avoids
// both processes touching the auth_info_baileys files at the same time
// during the handoff.
const startupDelay = parseInt(process.env.ISAAC_RESTART_DELAY_MS || '0', 10);
setTimeout(async () => {
  printBanner();
  await fetchCore();
  commands = loadCommands(commandsPath);
  const { runClearCache } = require('./commands/clearcache');
  global.runClearCache = runClearCache;
  startBot();
}, startupDelay);
