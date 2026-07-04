/**
 * commands/time.js
 * -------------------
 * Find the current time by timezone name (e.g. Africa/Nairobi) or a
 * common city/country shortcode.
 * Usage: .time <timezone or place>
 */

const SHORTCUTS = {
  nairobi: 'Africa/Nairobi',
  kenya: 'Africa/Nairobi',
  london: 'Europe/London',
  uk: 'Europe/London',
  newyork: 'America/New_York',
  ny: 'America/New_York',
  usa: 'America/New_York',
  tokyo: 'Asia/Tokyo',
  japan: 'Asia/Tokyo',
  lagos: 'Africa/Lagos',
  nigeria: 'Africa/Lagos',
  dubai: 'Asia/Dubai',
  india: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  moscow: 'Europe/Moscow',
  sydney: 'Australia/Sydney',
  beijing: 'Asia/Shanghai',
  china: 'Asia/Shanghai'
};

module.exports = {
  name: 'time',
  description: 'Get current time in a timezone. Usage: .time Africa/Nairobi or .time london',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const input = args.join(' ').trim();

    if (!input) {
      return sock.sendMessage(jid, { text: '❌ Usage: .time <timezone or city>\nExample: .time Africa/Nairobi or .time london' }, { quoted: msg });
    }

    const key = input.toLowerCase().replace(/\s+/g, '');
    const tz = SHORTCUTS[key] || input;

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'medium'
      });
      const formatted = formatter.format(new Date());

      await sock.sendMessage(jid, { text: `🕒 *Time in ${tz}:*\n${formatted}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ Unknown timezone "${input}". Try a full IANA name like Africa/Nairobi.` }, { quoted: msg });
    }
  }
};
