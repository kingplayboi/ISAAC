const { isOwner } = require('../utils/isOwner');

module.exports = {
    name: 'broadcast',
    description: 'Send a message to all groups the bot is in (owner only). Usage: .broadcast <message>',
    async execute(sock, msg, args) {
        const jid = msg.key.remoteJid;
        if (!isOwner(msg)) {
            return sock.sendMessage(jid, { text: '❌ Only the bot owner can use this command.' }, { quoted: msg });
        }

        const text = args.join(' ');
        if (!text) {
            return sock.sendMessage(jid, { text: '❌ Usage: .broadcast <message>' }, { quoted: msg });
        }

        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);

        let sent = 0;
        for (const gid of groupIds) {
            try {
                await sock.sendMessage(gid, { text: `📢 *Broadcast:*\n\n${text}` });
                sent++;
            } catch {}
            await new Promise(r => setTimeout(r, 1000));
        }

        await sock.sendMessage(jid, { text: `✅ Broadcast sent to ${sent}/${groupIds.length} groups.` }, { quoted: msg });
    },
};
