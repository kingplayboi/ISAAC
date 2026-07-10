const settingsStore = require('../utils/settingsStore');

module.exports = {
    name: 'gptdm',
    description: 'Toggle AI auto-reply (Gemini) for plain DMs.',
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return;

        if (args[0] === 'on') {
            settingsStore.set('gptdm', true);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *GPTDM:* ENABLED [🟢]' });
        } else if (args[0] === 'off') {
            settingsStore.set('gptdm', false);
            return await sock.sendMessage(msg.key.remoteJid, { text: '💬 *GPTDM:* DISABLED [🔴]' });
        }

        const status = settingsStore.get('gptdm', false) ? 'ENABLED [🟢]' : 'DISABLED [🔴]';
        await sock.sendMessage(msg.key.remoteJid, {
            text: `💬 *GPTDM Status:* ${status}\n\n💡 Use \`.gptdm on\` or \`.gptdm off\` to change it.`
        });
    },
};
