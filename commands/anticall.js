const config = require('../config/config');

module.exports = {
    name: 'anticall',
    description: 'Toggle automatic call rejection.',
    async execute(sock, msg, args, commands) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.REJECT_CALL = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🚫 *Anti-Call:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.REJECT_CALL = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '🚫 *Anti-Call:* DISABLED [🔴]' });
        }

        const status = config.REJECT_CALL ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `🚫 *Anti-Call Status:* ${status}\n\n💡 Use \`.anticall on\` or \`.anticall off\` to change it.` 
        });
    },
};
