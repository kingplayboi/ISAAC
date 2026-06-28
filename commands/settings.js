const config = require('../config/config');

module.exports = {
    name: 'settings',
    description: 'Displays or updates the bot configuration status.',
    async execute(sock, msg, args, commands) {
        const jid = msg.key.remoteJid;
        
        // Only allow the owner to view or change configurations
        // You can adjust this check depending on how your owner JID is stored
        const isOwner = msg.key.fromMe; 
        if (!isOwner) {
            return await sock.sendMessage(jid, { text: '❌ This command is restricted to the bot owner.' });
        }

        // If no arguments are provided, display the current dashboard panel
        if (args.length === 0) {
            let settingsMessage = `┌──────────────────────────────┐\n`;
            settingsMessage += `  ⚙️ \`\`\`BOT SETTINGS DASHBOARD\`\`\`\n`;
            settingsMessage += `  ━━━━━━━━━━━━━━━━━━━━━━━\n`;
            settingsMessage += `  🔒 Work Mode : ${config.WORK_TYPE || 'public'}\n`;
            settingsMessage += `  📖 Auto Read : ${config.READ_COMMAND ? 'ENABLED [🟢]' : 'DISABLED [🔴]'}\n`;
            settingsMessage += `  🚫 Anti-Call : ${config.REJECT_CALL ? 'ENABLED [🟢]' : 'DISABLED [🔴]'}\n`;
            settingsMessage += `  ⏳ Sudo Users: ${Array.isArray(config.SUDO) ? config.SUDO.length : 1}\n`;
            settingsMessage += `└──────────────────────────────┘\n\n`;
            settingsMessage += `💡 *Tip:* To toggle configurations, you can extend this module to edit your configuration parameters directly!`;

            return await sock.sendMessage(jid, { text: settingsMessage });
        }
    },
};
