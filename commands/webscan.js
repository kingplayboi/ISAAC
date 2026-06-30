/**
 * commands/webscan.js
 * --------------------
 * Scans a website and gives basic details (status, headers, server, etc.)
 *
 * Usage: .webscan https://google.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function scanSite(targetUrl) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return reject(new Error('Invalid URL'));
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const start = Date.now();

    const req = client.request(
      { hostname: parsed.hostname, path: parsed.pathname || '/', method: 'GET', timeout: 10000 },
      (res) => {
        const responseTime = Date.now() - start;
        res.resume(); // drain body, we only need headers/status

        resolve({
          url: targetUrl,
          status: res.statusCode,
          statusMessage: res.statusMessage,
          server: res.headers['server'] || 'Unknown',
          contentType: res.headers['content-type'] || 'Unknown',
          poweredBy: res.headers['x-powered-by'] || 'Not disclosed',
          responseTime,
          headers: res.headers
        });
      }
    );

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', (err) => reject(err));
    req.end();
  });
}

module.exports = {
  name: 'webscan',
  description: 'Scan a website and give basic details. Usage: .webscan https://google.com',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let url = args.join(' ').trim();

    if (!url) {
      return sock.sendMessage(jid, {
        text: '❌ Enter a URL\nExample: .webscan https://google.com'
      }, { quoted: msg });
    }

    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    await sock.sendMessage(jid, { text: '🔍 Scanning website...' }, { quoted: msg });

    try {
      const result = await scanSite(url);

      const text = `
╭──〔 🌐 WEBSITE SCAN 〕──╮
🔗 *URL:* ${result.url}
📊 *Status:* ${result.status} ${result.statusMessage}
🖥 *Server:* ${result.server}
⚙️ *Powered By:* ${result.poweredBy}
📄 *Content-Type:* ${result.contentType}
⏱ *Response Time:* ${result.responseTime}ms
╰──────────────────╯`.trim();

      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, { text: '❌ Scan failed: ' + e.message }, { quoted: msg });
    }
  },
};
