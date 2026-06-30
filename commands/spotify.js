/*
 * Spotify Downloader Command
 * Searches YouTube for the requested track and sends back the audio.
 */
const axios = require('axios');
const yts = require('yt-search');
const config = require('../config/config');

module.exports = {
    name: 'spotify',
    description: 'Download from Spotify (name or link)',
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        const prefix = config.prefix || '.';
        const text = args.join(' ').trim();

        if (!text) {
            return sock.sendMessage(jid, {
                text: `*🎵 Spotify Downloader*\n\nUsage:\n  *${prefix}spotify* _song name_\n  *${prefix}spotify* _<spotify URL>_\n\nExample: *${prefix}spotify* Shape of You Ed Sheeran`,
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '🎵', key: msg.key } });

            const results = await yts(text);
            const video = results.videos[0];

            if (!video) {
                return sock.sendMessage(jid, { text: `❌ No results found for: *${text}*` }, { quoted: msg });
            }

            const safeTitle = video.title.replace(/[\/\\:*?"<>|]/g, '').trim();
            const fileName = `${safeTitle}.mp3`;
            const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

            await sock.sendMessage(jid, {
                text: `⬇️ Found: *${video.title}*\n⏱️ ${video.timestamp}\n\nDownloading audio...`,
            }, { quoted: msg });

            const apis = [
                `https://apis.xcasper.space/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
                `https://mcow.giftedtechnexus.workers.dev/api/yta?url=${encodeURIComponent(videoUrl)}`,
            ];

            let downloadUrl = null;
            for (const url of apis) {
                try {
                    const res = await axios.get(url, { timeout: 15000 });
                    downloadUrl = res.data?.result || res.data?.url || res.data?.result?.download_url || null;
                    if (downloadUrl) break;
                } catch (e) {
                    continue;
                }
            }

            if (!downloadUrl) {
                return sock.sendMessage(jid, {
                    text: '❌ All download APIs failed. The link might be restricted or the services are down.',
                }, { quoted: msg });
            }

            await sock.sendMessage(jid, {
                audio: { url: downloadUrl },
                mimetype: 'audio/mpeg',
                fileName,
            }, { quoted: msg });

            await sock.sendMessage(jid, { text: `✅ Successfully downloaded: *${safeTitle}*` }, { quoted: msg });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(jid, { text: '❌ An internal error occurred while processing your request.' }, { quoted: msg });
        }
    },
};
