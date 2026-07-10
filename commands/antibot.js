const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'antibot',
    description: 'Toggle kicking messages that look like bot commands from non-admins.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('antibot', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🤖 *Antibot:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('antibot', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '🤖 *Antibot:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('antibot', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🤖 *Antibot Status:* ${status}\n\n💡 Use \`.antibot on\` or \`.antibot off\` to change it.`
        });
    },
};
