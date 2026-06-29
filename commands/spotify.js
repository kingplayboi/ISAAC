/* 
 * Spotify Downloader Plugin 
 * Place this in: plugins/spotify.js
 */

module.exports = {
  command: ['spotify'],
  description: 'Download from Spotify (name or link)',
  category: 'downloads',
  handler: async (client, m, { text, prefix, api }) => {
    if (!text) return m.reply(`*🎵 Spotify Downloader*\n\nUsage:\n  *${prefix}spotify* _song name_\n  *${prefix}spotify* _<spotify URL>_\n\nExample: *${prefix}spotify* Shape of You Ed Sheeran`);

    try {
      await client.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
      const msg = await client.sendMessage(m.chat, { text: `🔍 Searching for *${text}*...` }, { quoted: m });

      // 1. Search for the track on YouTube
      const results = await yts(text);
      const video = results.videos[0];
      if (!video) return client.sendMessage(m.chat, { text: `❌ No results found for: *${text}*`, edit: msg.key });

      const safeTitle = video.title.replace(/[\/\\:*?"<>|]/g, '').trim();
      const fileName = `${safeTitle}.mp3`;
      const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

      await client.sendMessage(m.chat, { text: `⬇️ Found: *${video.title}*\n⏱️ ${video.timestamp}\n\nDownloading audio...`, edit: msg.key });

      // 2. Waterfall API approach to get the download link
      const apis = [
        `${api}/download/audio?url=${encodeURIComponent(videoUrl)}`,
        `https://apis.xcasper.space/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://mcow.giftedtechnexus.workers.dev/api/yta?url=${encodeURIComponent(videoUrl)}`
      ];

      let downloadUrl = null;

      for (const url of apis) {
        try {
          const res = await axios.get(url, { timeout: 15000 });
          // Logic to extract URL based on common API response structures
          downloadUrl = res.data?.result || res.data?.url || res.data?.result?.download_url || null;
          if (downloadUrl) break; 
        } catch (e) {
          continue; // Try next API if this one fails
        }
      }

      if (!downloadUrl) {
        return client.sendMessage(m.chat, { text: '❌ All download APIs failed. The YouTube link might be restricted or the services are down.', edit: msg.key });
      }

      // 3. Send the file
      await client.sendMessage(m.chat, { audio: { url: downloadUrl }, mimetype: 'audio/mpeg', fileName }, { quoted: m });
      await client.sendMessage(m.chat, { text: `✅ Successfully downloaded: *${safeTitle}*`, edit: msg.key });

    } catch (err) {
      console.error(err);
      m.reply('❌ An internal error occurred while processing your request.');
    }
  }
};
    
