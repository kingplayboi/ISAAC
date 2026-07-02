
const os = require('os');
const config = require('../config/config');

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
        
        const uptimeSeconds = os.uptime();
        const systemDate = new Date();
        
        const currentDate = `${String(systemDate.getDate()).padStart(2, '0')}/${String(systemDate.getMonth() + 1).padStart(2, '0')}/${systemDate.getFullYear()}`;
        const currentTime = systemDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Option A Header with safe title formatting
        let menuMessage = `┌──────────────────────────────┐\n`;
        menuMessage += `  🤖 *_ISAAC BOT_*\n`;
        menuMessage += `  ━━━━━━━━━━━━━━━━━━━━━━━\n`;
        menuMessage += `  👤 Owner  : Pappi Isaac\n`;
        menuMessage += `  ⚡ Prefix : [ ${config.prefix || '.'} ]\n`;
        menuMessage += `  🕒 Time   : ${currentTime}\n`;
        menuMessage += `  🗓️ Date   : ${currentDate}\n`;
        menuMessage += `  📦 Engine : Baileys v5\n`;
        menuMessage += `  💾 Ram    : ${usedRamGb} GB / ${totalRamGb} GB\n`;
        menuMessage += `  ⏱️ Uptime : ${formatUptime(uptimeSeconds)}\n`;
menuMessage += `  🔌 Plugins : ${commands.size} commands\n`;
menuMessage += `└──────────────────────────────┘\n`;

        // Your 13 commands
const categories = {
    'GROUP': ['demote', 'groupinfo', 'kick', 'mute', 'promote', 'tagall', 'warn', 'add', 'invite', 'join', 'welcome', 'goodbye', 'unmute', 'amute', 'aunmute', 'ban', 'unban'],
    'SETTINGS': ['anticall', 'autoread', 'autorecording', 'autotyping', 'mode'],
    'DOWNLOAD': ['download', 'spotify', 'play', 'tiktok', 'ig', 'fb', 'twitter'],
    'GAMES': ['game', 'tictactoe', 'move', 'ttend', 'rps', 'wordguess', 'guess', 'wgend', 'mathquiz', 'mans'],
    'WHATSAPP': ['poll', 'react', 'delete', 'read', 'setstatus', 'status', 'vv', 'online', 'caption', 'doc', 'antiedit', 'call', 'cinfo', 'clear', 'creact', 'scstatus'],
    'AI': ['gemini', 'groq', 'gpt', 'dall', 'bing', 'upscale', 'lydia'],
    'SECURITY': ['antifake', 'antigm', 'antigstatus', 'antilink', 'antispam', 'antiword', 'common', 'gpp', 'gstatus'],
    'USER': ['block', 'unblock', 'pp', 'fullpp', 'jid', 'gjid', 'left'],
    'OWNER': ['owner', 'kill', 'backup', 'reminder', 'task', 'tog', 'update', 'updatenow'],
    'TOOLS': ['webscan'],
    'LIVESCORE': ['livescore', 'table'],
    'CODING': ['enc', 'gpass', 'compile-py', 'compile-js', 'compile-c', 'compile-c++'],
    'CONVERTER': ['topdf', 'toexcel', 'toword', 'tovideo', 'toaudio', 'toimg', 'ocr', 'totext', 'carbon'],
    'MISC': ['isaac', 'script', 'calc', 'alive', 'help', 'joke', 'menu', 'ping', 'quote', 'user', 'stats']
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
