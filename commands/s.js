const {
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const sharp = require("sharp");

const ffmpegPath = process.env.FFMPEG_PATH || require('ffmpeg-static') || 'ffmpeg';

module.exports = {
  name: "s",
  aliases: ["sticker"],
  description: "Convert an image or short video into a sticker.",
  category: "media",

  async execute(sock, msg) {
    try {
      const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Reply to an image or short video."
          },
          { quoted: msg }
        );
      }

      let media;
      let type;

      if (quoted.imageMessage) {
        media = quoted.imageMessage;
        type = "image";
      } else if (quoted.videoMessage) {
        media = quoted.videoMessage;

        if ((media.seconds || 0) > 10) {
          return await sock.sendMessage(
            msg.key.remoteJid,
            {
              text: "❌ Video must be 10 seconds or shorter."
            },
            { quoted: msg }
          );
        }

        type = "video";
      } else {
        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: "❌ Reply to an image or short video."
          },
          { quoted: msg }
        );
      }

      const stream = await downloadContentFromMessage(media, type);

      let buffer = Buffer.alloc(0);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      if (type === "image") {
        const sticker = await sharp(buffer)
          .resize(512, 512, {
            fit: "contain",
            background: {
              r: 0,
              g: 0,
              b: 0,
              alpha: 0
            }
          })
          .webp()
          .toBuffer();

        return await sock.sendMessage(
          msg.key.remoteJid,
          {
            sticker
          },
          { quoted: msg }
        );
      }

      const input = path.join(__dirname, "../temp_input.mp4");
      const output = path.join(__dirname, "../temp_output.webp");

      fs.writeFileSync(input, buffer);

      await new Promise((resolve, reject) => {
        exec(
          `"${ffmpegPath}" -y -i "${input}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -loop 0 -ss 0 -t 10 -preset default -an -vsync 0 "${output}"`,
          err => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const sticker = fs.readFileSync(output);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          sticker
        },
        { quoted: msg }
      );

      if (fs.existsSync(input)) fs.unlinkSync(input);
      if (fs.existsSync(output)) fs.unlinkSync(output);

    } catch (e) {
      console.error(e);

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: "❌ Failed to create sticker."
        },
        { quoted: msg }
      );
    }
  }
};
