
const os = require('os');
const config = require('../config/config');
const https = require('https');

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Safe, universal WhatsApp formatting
function formatCommand(text) {
    return `\`\`\`${text.toUpperCase()}\`\`\``;
}

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

module.exports = {
    name: 'menu',
    description: 'Displays the clean command menu.',
    async execute(sock, msg, args, commands) {
        const jid = msg.key.remoteJid;

        // RAM calculation
        const totalRamGb = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(1);
        const freeRamGb = (os.freemem() / (1024 * 1024 * 1024)).toFixed(1);
        const usedRamGb = (parseFloat(totalRamGb) - parseFloat(freeRamGb)).toFixed(1);
        
        const uptimeSeconds = process.uptime();
        const systemDate = new Date();
        
        const currentDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
}).format(systemDate);

const currentTime = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
}).format(systemDate);

        // Option A Header with safe title formatting
        let menuMessage = `┌──────────────────────────────┐\n`;
        menuMessage += `  🤖 *_ISAAC BOT_*\n`;
        menuMessage += `  ━━━━━━━━━━━━━━━━━━━━━━━\n`;
        menuMessage += `  ⚡ Prefix : [ ${config.prefix || '.'} ]\n`;
        menuMessage += `  🔒 Mode   : ${(config.WORK_TYPE || 'public').toUpperCase()}\n`;
        menuMessage += `  🕒 Time   : ${currentTime}\n`;
        menuMessage += `  🗓️ Date   : ${currentDate}\n`;
        menuMessage += `  💾 Ram    : ${usedRamGb} GB / ${totalRamGb} GB\n`;
        menuMessage += `  ⏱️ Uptime : ${formatUptime(uptimeSeconds)}\n`;
menuMessage += `  🔌 Plugins : ${commands.size} commands\n`;
menuMessage += `└──────────────────────────────┘\n`;

        // Your 13 commands
const categories = {
    'GROUP': ['demote', 'groupinfo', 'kick', 'mute', 'promote', 'tagall', 'warn', 'add', 'invite', 'join', 'welcome', 'goodbye', 'unmute', 'amute', 'aunmute', 'ban', 'unban', 'close', 'open', 'desc', 'subject', 'link', 'revoke', 'icon', 'hidetag', 'antilink', 'setgreet', 'tag', 'disp-1', 'disp-7', 'disp-90', 'disp-off', 'approve', 'reject', 'admin', 'vcf', 'groupstatus', 'foreigners'],
    'SETTINGS': ['anticall', 'autoread', 'autorecording', 'autotyping', 'mode', 'prefix', 'autoview', 'pdm', 'zushi'],
    'DOWNLOAD': ['download', 'audio', 'spotify', 'play', 'tiktok', 'ig', 'fb', 'twitter', 'song', 'shazam', 'lyrics', 'lyrics2'],
    'GAMES': ['game', 'tictactoe', 'move', 'ttend', 'rps', 'wordguess', 'guess', 'wgend', 'mathquiz', 'mans', 'answer'],
    'WHATSAPP': ['poll', 'react', 'del', 'setstatus', 'status', 'online', 'caption', 'doc', 'antiedit', 'cinfo', 'clear', 'save1'],
    'AI': ['gemini', 'groq', 'worm', 'gpt', 'dall', 'bing', 'upscale', 'lydia', 'vision', 'void', 'claude', 'wormgpt', 'gptdm'],
    'SECURITY': ['antifake', 'antigm', 'antigstatus', 'antispam', 'antiword', 'common', 'gpp', 'gstatus'],
    'USER': ['block', 'unblock', 'pp', 'fullpp', 'jid', 'gjid', 'left', 'ison'],
    'OWNER': ['owner', 'pair', 'settings', 'kill', 'backup', 'reminder', 'task', 'update', 'updatenow', 'eval', 'gauth', 'antilinkall', 'antidelete', 'autolike', 'autobio', 'menutype', 'wapresence', 'badword', 'antibot', 'antitag', 'welcomegoodbye', 'broadcast', 'restart', 'blocklist', 'logout', 'fetch', 'shell', 'getcmd', 'getfile', 'cat', 'addsudo', 'delsudo', 'checksudo', 'clearsudos'],
    'TOOLS': ['webscan', 'apk', 'clearcache', 'qr', 'url', 'imagesearch', 'define'],
    'FOOTBALL': ['livescore', 'standings', 'table', 'bundesliga', 'epl', 'laliga', 'ligue1', 'seriea', 'ucl', 'news', 'playersearch', 'teamsearch', 'fifa', 'fifaplayoffs', 'euro', 'eplscorers', 'laligascorers', 'bundesligascorers', 'serieascorers', 'ligue1scorers', 'uclscorers'],
    'CODING': ['enc', 'gpass', 'compile-py', 'compile-js', 'compile-c', 'compile-c++'],
    'CONVERTER': ['topdf', 'toexcel', 'toword', 'tovideo', 'toaudio', 'toimg', 'ocr', 'totext', 'carbon', 'cut', 'merge'],
    'MEDIA': ['s', 'take', 'mix', 'smeme', 'vv', 'vv2', 'botpp', 'getpfp', 'removebg', 'similarimage', 'remini', 'remini2', 'save'],
    'MISC': ['isaac', 'script', 'calc', 'donate', 'alive', 'help', 'joke', 'menu', 'ping', 'quote', 'user', 'stats', 'uptime', 'time'],
};        for (const [categoryName, commandList] of Object.entries(categories)) {
            menuMessage += ` ╭─❏ ${categoryName} ❏\n`;
            commandList.forEach(cmd => {
                menuMessage += ` │ ${formatCommand(cmd)}\n`;
            });
            menuMessage += ` ╰─────────────────\n`;
        }

        await sock.sendMessage(jid, { text: menuMessage });
    },
};
