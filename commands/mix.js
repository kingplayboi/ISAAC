/**
 * commands/mix.js
 * ------------------
 * Mix two emojis into a single combined image/sticker (Google's
 * "Emoji Kitchen" concept). Usage: .mix 😂 😭
 *
 * Uses a free public mirror of the Emoji Kitchen API. If it doesn't
 * have a combination for the given pair, it'll say so — not every
 * emoji pair has a pre-rendered mashup.
 */
const axios = require('axios');

module.exports = {
  name: 'mix',
  description: 'Mix two emojis into one image. Usage: .mix 😂 😭',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const input = args.join(' ').trim();
    const emojis = [...input].filter((c) => /\p{Extended_Pictographic}/u.test(c));

    if (emojis.length < 2) {
      return sock.sendMessage(jid, { text: '❌ Usage: .mix 😂 😭 (two emojis)' }, { quoted: msg });
    }

    const [a, b] = emojis;
    const codeA = a.codePointAt(0).toString(16);
    const codeB = b.codePointAt(0).toString(16);

    try {
      const url = `https://emojik.vercel.app/s/${codeA}_${codeB}?size=256`;
      const res = await axios.get(url, { responseType: 'arraybuffer', validateStatus: () => true });

      if (res.status !== 200 || !res.data?.length) {
        return sock.sendMessage(jid, { text: `❌ No mix found for ${a}${b}. Try a different pair.` }, { quoted: msg });
      }

      await sock.sendMessage(jid, { image: Buffer.from(res.data), caption: `${a} + ${b}` }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Could not mix emojis: ' + e.message }, { quoted: msg });
    }
  },
};
