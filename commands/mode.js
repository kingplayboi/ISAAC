const config = require('../config/config');
const runtimeSettings = require('../config/runtimeSettings');

module.exports = {
    name: 'mode',
    description: 'Toggle bot work mode between public and private.',
    async execute(sock, msg, args, commands) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'public' || args[0] === 'private') {
            config.WORK_TYPE = args[0];
            runtimeSettings.set('mode', args[0]);
            return await sock.sendMessage(msg.key.remoteJid, { 
                text: `🔒 *Work Mode updated:* Bot is now set to *${config.WORK_TYPE}*` 
            });
        }

        const currentMode = config.WORK_TYPE || 'public';
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `🔒 *Current Mode:* \`${currentMode.toUpperCase()}\`\n\n💡 Use \`.mode public\` or \`.mode private\` to change it.` 
        });
    },
};
