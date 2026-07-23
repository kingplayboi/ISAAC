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

const fs = require('fs');

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
      const raw = config.sessionId.replace(/^ISAAC-MD:~/, '');
      const buffer = Buffer.from(raw, 'base64');
      fs.writeFileSync(credsPath, buffer);
      logger.info('✅ Restored session from SESSION_ID.');
    } catch (error) {
      logger.error(`[restoreSessionFromEnv] Failed to restore session: ${error.message}`);
    }
  }
}

const commandsPath = path.join(__dirname, 'commands');
let commands = {};

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
restoreSessionFromEnv();
restoreSettingsFromEnv();

    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, config.authFolder)
    );
const wasAlreadyRegistered = state.creds.registered;

    const { version } = await fetchLatestBaileysVersion();

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
      defaultQueryTimeoutMs: 90000,
        connectTimeoutMs: 90000,
        keepAliveIntervalMs: 15000,
        retryRequestDelayMs: 1000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
      browser: ['Ubuntu', 'Chrome', '120.0.6099.130'],
      cachedGroupMetadata: async (jid) => groupCache.get(jid),
    });

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

    registerConnectionHandler(sock, startBot, wasAlreadyRegistered);
    registerMessageHandler(sock, commands);

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

process.on('uncaughtException', (error) => {
  logger.error(`[uncaughtException] ${error.stack || error.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[unhandledRejection] ${reason}`);
});

const startupDelay = parseInt(process.env.ISAAC_RESTART_DELAY_MS || '0', 10);
setTimeout(async () => {
  printBanner();
  await fetchCore();
  commands = loadCommands(commandsPath);
  const { runClearCache } = require('./commands/clearcache');
  global.runClearCache = runClearCache;
  startBot();
}, startupDelay);
