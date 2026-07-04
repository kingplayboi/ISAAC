/**
 * commands/ison.js
 * ------------------
 * Check if a phone number is registered on WhatsApp.
 * Usage: .ison 254712345678
 */

module.exports = {
  name: 'ison',
  description: 'Check if a phone number is registered on WhatsApp. Usage: .ison 254712345678',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const number = args[0]?.replace(/[^0-9]/g, '');

    if (!number) {
      return sock.sendMessage(jid, { text: '❌ Usage: .ison 254712345678' }, { quoted: msg });
    }

    try {
      const result = await sock.onWhatsApp(`${number}@s.whatsapp.net`);
      const exists = result?.[0]?.exists;

      await sock.sendMessage(jid, {
        text: exists
          ? `✅ +${number} is registered on WhatsApp.`
          : `❌ +${number} is not on WhatsApp.`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not check number: ' + e.message }, { quoted: msg });
    }
  }
};
