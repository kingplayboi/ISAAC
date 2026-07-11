const axios = require("axios");
const FormData = require("form-data");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  name: "vision",
  description: "Analyze a replied image using Keith Vision AI",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

    if (!contextInfo?.quotedMessage?.imageMessage) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ Reply to an image.\n\nExample:\n.vision What's in this image?"
        },
        { quoted: msg }
      );
    }

    const question = args.join(" ") || "Describe this image.";

    await sock.sendMessage(
      jid,
      { text: "👁️ Analyzing image..." },
      { quoted: msg }
    );

    try {
      const buffer = await downloadMediaMessage(
        {
          key: {
            remoteJid: jid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
          },
          message: contextInfo.quotedMessage
        },
        "buffer",
        {},
        {
          logger: console,
          reuploadRequest: sock.updateMediaMessage
        }
      );

      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", buffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });

      const upload = await axios.post(
        "https://catbox.moe/user/api.php",
        form,
        {
          headers: form.getHeaders()
        }
      );

      const imageUrl = upload.data.trim();

      const { data } = await axios.get(
        "https://apiskeith2-production-ec66.up.railway.app/ai/vision",
        {
          params: {
            image: imageUrl,
            q: question
          }
        }
      );

      const answer =
        data.result ||
        data.response ||
        data.message ||
        data.data ||
        JSON.stringify(data, null, 2);

      await sock.sendMessage(
        jid,
        {
          text: `👁️ *Vision AI*\n\n${answer}`
        },
        { quoted: msg }
      );
    } catch (err) {
      console.error(err);

      await sock.sendMessage(
        jid,
        {
          text:
            "❌ Vision failed.\n\n" +
            (err.response?.data?.message ||
              err.response?.data ||
              err.message)
        },
        { quoted: msg }
      );
    }
  }
};
