/**
 * commands/download.js
 * --------------------
 * Downloads audio from a YouTube video and sends it as an audio message.
 *
 * NOTE: YouTube actively changes its site internals to block scrapers
 * like ytdl-core. This command can break without warning whenever that
 * happens — known limitation of any unofficial YouTube downloader. If it
 * stops working, try: npm install @distube/ytdl-core@latest
 *
 * Usage: !download <YouTube URL>
 */
const ytdl = require('@distube/ytdl-core');

module.exports = {
  name: 'download',
  description: 'Downloads audio from a YouTube link. Usage: !download <url>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !ytdl.validateURL(url)) {
      await sock.sendMessage(
        jid,
        { text: 'Usage: !download <YouTube URL>\nExample: !download https://youtube.com/watch?v=...' },
        { quoted: msg }
      );
      return;
    }

    await sock.sendMessage(jid, { text: '⏳ Downloading audio, this may take a moment...' }, { quoted: msg });

    try {
      const info = await ytdl.getInfo(url);
      const title = info.videoDetails.title;

      const chunks = [];
      const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

      await new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      await sock.sendMessage(
        jid,
        { audio: buffer, mimetype: 'audio/mp4', ptt: false, fileName: `${title}.mp3` },
        { quoted: msg }
      );
    } catch (error) {
      await sock.sendMessage(
        jid,
        {
          text:
            '❌ Could not download that video. YouTube frequently changes things that break ' +
            'downloaders like this one — if it keeps failing, the underlying library may need updating.',
        },
        { quoted: msg }
      );
    }
  },
};
