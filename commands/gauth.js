/**
 * commands/gauth.js
 * -------------------
 * Manage Google Authentication (Authenticate, Import, Logout, Status).
 * Usage:
 *   .gauth authenticate   -> get an auth URL
 *   .gauth import <code>  -> exchange code for tokens
 *   .gauth logout         -> remove stored tokens
 *   .gauth status         -> show auth status
 *
 * Requires: npm install googleapis
 * Env vars (.env): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { google } = require('googleapis');

const tokenPath = path.join(__dirname, '../config/google_token.json');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
  );
}

module.exports = {
  name: 'gauth',
  description: 'Manage Google Authentication. Usage: .gauth authenticate|import <code>|logout|status',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return sock.sendMessage(jid, { text: '❌ Google auth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' }, { quoted: msg });
    }

    const oauth2Client = getOAuthClient();

    if (sub === 'authenticate') {
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/tasks',
          'https://www.googleapis.com/auth/youtube.readonly'
        ]
      });
      return sock.sendMessage(jid, {
        text: `🔐 *Google Authentication*\n\n1. Open this link and grant access:\n${url}\n\n2. Copy the code you receive and run:\n.gauth import <code>`
      }, { quoted: msg });
    }

    if (sub === 'import') {
      const code = args[1];
      if (!code) {
        return sock.sendMessage(jid, { text: '❌ Usage: .gauth import <code>' }, { quoted: msg });
      }
      try {
        const { tokens } = await oauth2Client.getToken(code);
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
        await sock.sendMessage(jid, { text: '✅ Google account linked successfully!' }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: '❌ Failed to import token: ' + e.message }, { quoted: msg });
      }
      return;
    }

    if (sub === 'logout') {
      if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
      return sock.sendMessage(jid, { text: '✅ Google account unlinked.' }, { quoted: msg });
    }

    if (sub === 'status') {
      if (!fs.existsSync(tokenPath)) {
        return sock.sendMessage(jid, { text: '❌ Not authenticated. Use .gauth authenticate' }, { quoted: msg });
      }
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      const expiry = token.expiry_date ? new Date(token.expiry_date).toLocaleString() : 'unknown';
      return sock.sendMessage(jid, { text: `✅ *Authenticated with Google*\nToken expires: ${expiry}` }, { quoted: msg });
    }

    await sock.sendMessage(jid, { text: '❌ Usage: .gauth authenticate|import <code>|logout|status' }, { quoted: msg });
  }
};
