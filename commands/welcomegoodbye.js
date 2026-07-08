const config = require('../config/config');

module.exports = {
    name: 'welcomegoodbye',
    description: 'Master toggle for welcome/goodbye messages bot-wide.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            config.WELCOME_GOODBYE = true;
            return await sock.sendMessage(msg.key.remoteJid, { text: '👋 *Welcome/Goodbye:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            config.WELCOME_GOODBYE = false;
            return await sock.sendMessage(msg.key.remoteJid, { text: '👋 *Welcome/Goodbye:* DISABLED [🔴]' });
        }

        const status = config.WELCOME_GOODBYE ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👋 *Welcome/Goodbye Status:* ${status}\n\n💡 Use \`.welcomegoodbye on\` or \`.welcomegoodbye off\` to change it.`
        });
    },
};
