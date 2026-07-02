/**
 * commands/gpass.js
 * -------------------
 * Generates a cryptographically secure random password.
 *
 * Usage:
 *   .gpass              → 16-character password, letters+numbers+symbols
 *   .gpass 24            → 24-character password
 *   .gpass 20 nosymbols  → 20-character, letters+numbers only
 */

const crypto = require('crypto');

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function generatePassword(length, includeSymbols) {
  const charset = LOWER + UPPER + DIGITS + (includeSymbols ? SYMBOLS : '');
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

module.exports = {
  name: 'gpass',
  description: 'Generates a secure random password. Usage: .gpass [length] [nosymbols]',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    let length = 16;
    let includeSymbols = true;

    for (const arg of args) {
      if (/^\d+$/.test(arg)) {
        length = parseInt(arg, 10);
      } else if (arg.toLowerCase() === 'nosymbols') {
        includeSymbols = false;
      }
    }

    if (length < 6 || length > 128) {
      return sock.sendMessage(
        jid,
        { text: '❌ Length must be between 6 and 128 characters.' },
        { quoted: msg }
      );
    }

    const password = generatePassword(length, includeSymbols);

    await sock.sendMessage(
      jid,
      {
        text:
          `🔑 *Generated Password*\n\n` +
          `\`\`\`${password}\`\`\`\n\n` +
          `📏 Length: ${length}${includeSymbols ? '' : ' (no symbols)'}\n` +
          `⚠️ This message will not be auto-deleted — remove it once saved.`,
      },
      { quoted: msg }
    );
  },
};
