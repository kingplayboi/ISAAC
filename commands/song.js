/**
 * commands/song.js
 * ------------------
 * Download a song from YouTube by search query.
 * Usage: .song <song name>
 *
 * Requires: npm install yt-search ytdl-core
 */

const yts = require('yt-search');
const ytdl = require('ytdl-core');

module.exports = {
  name: 'song',
  description: 'Download a song from YouTube. Usage: .song <song name>',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return sock.sendMessage(jid, { text: '❌ Usage: .song <song name>' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: `🔍 Searching for "${query}"...` }, { quoted: msg });

    try {
      const search = await yts(query);
      const video = search.videos?.[0];
      if (!video) {
        return sock.sendMessage(jid, { text: '❌ No results found.' }, { quoted: msg });
      }

      await sock.sendMessage(jid, { text: `⏳ Downloading: ${video.title} (${video.timestamp})` }, { quoted: msg });

      const chunks = [];
      await new Promise((resolve, reject) => {
        ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' })
          .on('data', (c) => chunks.push(c))
          .on('end', resolve)
          .on('error', reject);
      });

      const buffer = Buffer.concat(chunks);

      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`,
        caption: `🎵 *${video.title}*\n⏱ ${video.timestamp} | 👁 ${video.views}`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Song download failed: ' + e.message }, { quoted: msg });
    }
  }
};
