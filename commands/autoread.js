const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'autoread',
    description: 'Toggle automatic read receipts for incoming messages.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('autoread', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '📖 *Auto Read:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('autoread', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '📖 *Auto Read:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('autoread', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📖 *Auto Read Status:* ${status}\n\n💡 Use \`.autoread on\` or \`.autoread off\` to change it.`
        });
    },
};
