const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'welcomegoodbye',
    description: 'Master toggle for welcome/goodbye messages bot-wide.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('welcomegoodbye', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '👋 *Welcome/Goodbye:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('welcomegoodbye', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '👋 *Welcome/Goodbye:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('welcomegoodbye', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `👋 *Welcome/Goodbye Status:* ${status}\n\n💡 Use \`.welcomegoodbye on\` or \`.welcomegoodbye off\` to change it.`
        });
    },
};
