/**
 * commands/cut.js
 * -----------------
 * Cut a segment from an audio or video file.
 * Usage: .cut <start> <duration>   (reply to audio/video)
 * Example: .cut 00:00:10 15   -> cuts a 15s segment starting at 10s
 *
 * Requires: ffmpeg installed on the system (already used by mp3/toaudio etc.)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

module.exports = {
  name: 'cut',
  description: 'Cut a segment from audio/video. Usage: .cut <start> <duration> (reply to media)',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = ctx?.quotedMessage;

    if (!quoted) {
      return sock.sendMessage(jid, { text: '❌ Reply to an audio or video message with .cut <start> <duration>\nExample: .cut 00:00:10 15' }, { quoted: msg });
    }

    const start = args[0];
    const duration = args[1];

    if (!start || !duration) {
      return sock.sendMessage(jid, { text: '❌ Usage: .cut <start> <duration>\nExample: .cut 00:00:10 15' }, { quoted: msg });
    }

    const type = quoted.videoMessage ? 'video' : quoted.audioMessage ? 'audio' : null;
    if (!type) {
      return sock.sendMessage(jid, { text: '❌ Reply to an audio or video message.' }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '✂️ Cutting...' }, { quoted: msg });

    const tmpDir = os.tmpdir();
    const ext = type === 'video' ? 'mp4' : 'mp3';
    const inputPath = path.join(tmpDir, `cut_in_${Date.now()}.${ext}`);
    const outputPath = path.join(tmpDir, `cut_out_${Date.now()}.${ext}`);

    try {
      const media = await sock.downloadMediaMessage({
        message: quoted,
        key: { remoteJid: jid, id: ctx.stanzaId, participant: ctx.participant }
      });
      fs.writeFileSync(inputPath, media);

      execSync(`ffmpeg -y -i "${inputPath}" -ss ${start} -t ${duration} -c copy "${outputPath}"`);

      const outBuffer = fs.readFileSync(outputPath);
      await sock.sendMessage(jid, {
        [type]: outBuffer,
        mimetype: type === 'video' ? 'video/mp4' : 'audio/mpeg',
        caption: `✂️ Cut: ${start} for ${duration}s`
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Cut failed: ' + e.message }, { quoted: msg });
    } finally {
      [inputPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch {} });
    }
  }
};
