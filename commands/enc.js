/**
 * commands/enc.js
 * ----------------
 * Encodes or decodes text using common formats: base64, hex, url, binary.
 *
 * Usage:
 *   .enc base64 hello world       → encodes "hello world" to base64
 *   .enc decode base64 aGVsbG8=   → decodes base64 back to text
 *   .enc hex hello                → encodes to hex
 *   .enc decode hex 68656c6c6f    → decodes hex back to text
 *   .enc url hello world!         → URL-encodes
 *   .enc decode url hello%20world → URL-decodes
 *   .enc binary hi                → encodes to binary (8-bit per char)
 *   .enc decode binary 01101000...→ decodes binary back to text
 */

const SUPPORTED = ['base64', 'hex', 'url', 'binary'];

function encode(format, text) {
  switch (format) {
    case 'base64':
      return Buffer.from(text, 'utf8').toString('base64');
    case 'hex':
      return Buffer.from(text, 'utf8').toString('hex');
    case 'url':
      return encodeURIComponent(text);
    case 'binary':
      return text
        .split('')
        .map((c) => c.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');
    default:
      return null;
  }
}

function decode(format, text) {
  switch (format) {
    case 'base64':
      return Buffer.from(text, 'base64').toString('utf8');
    case 'hex':
      return Buffer.from(text.replace(/\s+/g, ''), 'hex').toString('utf8');
    case 'url':
      return decodeURIComponent(text);
    case 'binary':
      return text
        .split(/\s+/)
        .filter(Boolean)
        .map((bin) => String.fromCharCode(parseInt(bin, 2)))
        .join('');
    default:
      return null;
  }
}

module.exports = {
  name: 'enc',
  description: 'Encodes/decodes text. Usage: .enc <base64|hex|url|binary> text  |  .enc decode <format> text',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return sock.sendMessage(
        jid,
        {
          text:
            '❌ Usage:\n' +
            '.enc <base64|hex|url|binary> <text>\n' +
            '.enc decode <base64|hex|url|binary> <text>',
        },
        { quoted: msg }
      );
    }

    const isDecode = args[0].toLowerCase() === 'decode';
    const format = (isDecode ? args[1] : args[0]).toLowerCase();
    const text = (isDecode ? args.slice(2) : args.slice(1)).join(' ');

    if (!SUPPORTED.includes(format)) {
      return sock.sendMessage(
        jid,
        { text: `❌ Unsupported format "${format}". Supported: ${SUPPORTED.join(', ')}` },
        { quoted: msg }
      );
    }

    if (!text) {
      return sock.sendMessage(jid, { text: '❌ Please provide some text.' }, { quoted: msg });
    }

    try {
      const result = isDecode ? decode(format, text) : encode(format, text);
      if (result === null) throw new Error('Conversion failed');

      const label = isDecode ? 'Decoded' : 'Encoded';
      await sock.sendMessage(
        jid,
        { text: `🔐 *${label} (${format})*\n\n${result}` },
        { quoted: msg }
      );
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  },
};
