const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autolike',
    description: 'Toggle auto-reacting to contacts\' status updates.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('autolike', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('autolike', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '❤️ *Auto Like Status:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('autolike', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `❤️ *Auto Like Status:* ${status}\n\n💡 Use \`.autolike on\` or \`.autolike off\` to change it.`
        });
    },
};
