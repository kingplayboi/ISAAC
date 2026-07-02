/**
 * commands/shazam.js
 * -------------------
 * Identifies a song from a short audio or video clip using AudD,
 * then downloads and sends the full audio automatically.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const yts = require('yt-search');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const AUDD_API_TOKEN = '1ad87635d6a7e6e1ad8c2ccbe503d097';
const AUDD_ENDPOINT = 'https://api.audd.io/';

function extractMediaTarget(msg) {
  const m = msg.message;

  if (m?.audioMessage) return { type: 'audio', message: m, key: msg.key };
  if (m?.videoMessage) return { type: 'video', message: m, key: msg.key };

  const ctx = m?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;

  if (quoted?.audioMessage) {
    return {
      type: 'audio',
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
    };
  }

  if (quoted?.videoMessage) {
    return {
      type: 'video',
      message: quoted,
      key: {
        remoteJid: msg.key.remoteJid,
        id: ctx.stanzaId,
        fromMe: false,
        participant: ctx.participant,
      },
    };
  }

  return null;
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        return downloadBuffer(res.headers.location)
          .then(resolve)
          .catch(reject);
      }

      const chunks = [];

      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  name: 'shazam',
  description:
    'Identifies a song from audio/video and downloads the full track.',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = extractMediaTarget(msg);

    if (!target) {
      return await sock.sendMessage(
        jid,
        {
          text:
            '🎧 Reply to a voice note, audio file, or short video with *.shazam*.',
        },
        { quoted: msg }
      );
    }

    await sock.sendMessage(jid, {
      react: { text: '🔎', key: msg.key },
    });

    let tmpInput;
    let tmpAudio;
    let downloadedSong;

    try {
      const { downloadMediaMessage } = require('@whiskeysockets/baileys');

      const targetMsg = {
        key: target.key,
        message: target.message,
      };

      const buffer = await downloadMediaMessage(
        targetMsg,
        'buffer',
        {},
        {
          reuploadRequest: sock.updateMediaMessage,
        }
      );

      const tmpDir = os.tmpdir();

      const ext = target.type === 'video' ? 'mp4' : 'ogg';

      tmpInput = path.join(
        tmpDir,
        `shazam_in_${Date.now()}.${ext}`
      );

      tmpAudio = path.join(
        tmpDir,
        `shazam_out_${Date.now()}.mp3`
      );

      fs.writeFileSync(tmpInput, buffer);

      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        tmpInput,
        '-t',
        '20',
        '-vn',
        '-ac',
        '1',
        '-ar',
        '44100',
        '-f',
        'mp3',
        tmpAudio,
      ]);

      const form = new FormData();

      form.append('api_token', AUDD_API_TOKEN);
      form.append('return', 'apple_music,spotify');
      form.append(
        'file',
        new Blob([fs.readFileSync(tmpAudio)]),
        'sample.mp3'
      );

      const response = await fetch(AUDD_ENDPOINT, {
        method: 'POST',
        body: form,
      });

      const data = await response.json();

      if (data.status !== 'success' || !data.result) {
        return await sock.sendMessage(
          jid,
          {
            text:
              "😕 Couldn't identify that track. Try a clearer clip.",
          },
          { quoted: msg }
        );
      }

      const r = data.result;

      const spotifyUrl =
        r.spotify?.external_urls?.spotify;

      const appleUrl =
        r.apple_music?.url;

      const albumArt =
        r.spotify?.album?.images?.[0]?.url ||
        r.apple_music?.artwork?.url?.replace(
          '{w}x{h}',
          '500x500'
        );

      const caption = [
        `🎵 *${r.title}*`,
        `👤 *Artist:* ${r.artist}`,
        r.album ? `💿 *Album:* ${r.album}` : null,
        r.release_date
          ? `📅 *Released:* ${r.release_date}`
          : null,
        spotifyUrl
          ? `🟢 *Spotify:* ${spotifyUrl}`
          : null,
        appleUrl
          ? `🍎 *Apple Music:* ${appleUrl}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');

      if (albumArt) {
        const img = await downloadBuffer(albumArt);

        await sock.sendMessage(
          jid,
          {
            image: img,
            caption,
          },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(
          jid,
          { text: caption },
          { quoted: msg }
        );
      }

      // DOWNLOAD FULL SONG
      const query = `${r.title} ${r.artist}`;

      await sock.sendMessage(
        jid,
        {
          text: `🎧 Downloading *${query}*...`,
        },
        { quoted: msg }
      );

      const search = await yts(query);

      const video = search.videos[0];

      if (!video) {
        throw new Error(
          'Could not find the song on YouTube.'
        );
      }

      const outputTemplate = path.join(
        tmpDir,
        `shazam_song_${Date.now()}.%(ext)s`
      );

      await execFileAsync('yt-dlp', [
        '--js-runtimes',
        'node',
        '-x',
        '--audio-format',
        'mp3',
        '--audio-quality',
        '0',
        '--no-playlist',
        '-o',
        outputTemplate,
        video.url,
      ]);

      downloadedSong = outputTemplate.replace(
        '%(ext)s',
        'mp3'
      );

      if (!fs.existsSync(downloadedSong)) {
        throw new Error('Downloaded song not found.');
      }

      await sock.sendMessage(
        jid,
        {
          audio: fs.readFileSync(downloadedSong),
          mimetype: 'audio/mpeg',
          fileName: `${r.title}.mp3`,
          ptt: false,
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error('[SHAZAM ERROR]', error);

      await sock.sendMessage(
        jid,
        {
          text: `⚠️ ${error.message}`,
        },
        { quoted: msg }
      );
    } finally {
      [tmpInput, tmpAudio, downloadedSong].forEach((f) => {
        if (f && fs.existsSync(f)) {
          try {
            fs.unlinkSync(f);
          } catch {}
        }
      });
    }
  },
};
