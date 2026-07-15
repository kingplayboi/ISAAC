/**
 * commands/trt.js
 * ---------------------------
 * Reply to a text message with .trt to auto-detect its language and
 * translate it to English.
 *
 * Requires: npm install franc-min langs
 * (franc-min = local language detection, no API key/network call needed;
 *  langs = maps the detected 3-letter code to a readable language name)
 */

module.exports = {
    name: "trt",
    description: "Auto-detect and translate a replied message to English. Usage: reply to text with .trt",

    async execute(sock, msg) {
        const jid = msg.key.remoteJid;

        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const text = quoted?.conversation || quoted?.extendedTextMessage?.text;

        if (!text) {
            return sock.sendMessage(
                jid,
                { text: "❌ Reply to a text message with .trt" },
                { quoted: msg }
            );
        }

        try {
            const { franc } = require("franc-min");
            const langs = require("langs");

            const detectedCode = franc(text); // returns ISO 639-3, e.g. 'zsm' for Malay, or 'und' if unsure
            const langInfo = langs.where("3", detectedCode);
            const fromLang = langInfo ? langInfo.name : "unknown";

            const res = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|en`
            );
            const data = await res.json();
            const translated = data?.responseData?.translatedText;

            if (!translated) {
                return sock.sendMessage(
                    jid,
                    { text: "❌ Translation failed." },
                    { quoted: msg }
                );
            }

            const reply =
                `🌐 *Translation*\n` +
                `🏳️ From: ${fromLang}\n` +
                `🏳️ To: english\n\n` +
                translated;

            await sock.sendMessage(jid, { text: reply }, { quoted: msg });

        } catch (err) {
            console.error(err);
            await sock.sendMessage(
                jid,
                { text: "❌ Error translating: " + err.message },
                { quoted: msg }
            );
        }
    }
};
