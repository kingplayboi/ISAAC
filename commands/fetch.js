const https = require('https');
const http = require('http');
const { isDev } = require('../utils/isDev');

function fetchRaw(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, data }));
        }).on('error', reject);
    });
}

module.exports = {
    name: 'fetch',
    description: 'Fetches raw content from a URL (developer only). Usage: .fetch <url>',
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        if (!isDev(msg)) {
            return sock.sendMessage(jid, { text: '❌ This command is restricted.' }, { quoted: msg });
        }

        const url = args[0];
        if (!url) {
            return sock.sendMessage(jid, { text: '❌ Usage: .fetch <url>' }, { quoted: msg });
        }

        try {
            const result = await fetchRaw(url);
            await sock.sendMessage(jid, { text: `📡 *Status:* ${result.status}\n\n${result.data.slice(0, 3500)}` }, { quoted: msg });
        } catch (error) {
            await sock.sendMessage(jid, { text: `❌ ${error.message}` }, { quoted: msg });
        }
    },
};
