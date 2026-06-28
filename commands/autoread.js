const config = require('../config/config');

module.exports = {
    name: 'autoread',
    description: 'Toggle automatic read receipts for incoming messages.',
    async execute(sock, msg, args, commands) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.READ_COMMAND = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '📖 *Auto Read:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.READ_COMMAND = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '📖 *Auto Read:* DISABLED [🔴]' });
        }

        const status = config.READ_COMMAND ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `📖 *Auto Read Status:* ${status}\n\n💡 Use \`.autoread on\` or \`.autoread off\` to change it.` 
        });
    },
};
