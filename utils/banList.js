const fs = require('fs');
const path = require('path');
const { resolveIds } = require('./isSudo');

const BAN_FILE = path.join(__dirname, '..', 'data', 'banned.json');

function ensureFile() {
    const dir = path.dirname(BAN_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(BAN_FILE)) {
        fs.writeFileSync(BAN_FILE, JSON.stringify([], null, 2));
    }
}

function getBannedList() {
    ensureFile();
    try {
        const raw = fs.readFileSync(BAN_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function isBanned(msgKeyOrJid) {
    const list = getBannedList();
    const ids = typeof msgKeyOrJid === 'string'
        ? resolveIds({ participant: msgKeyOrJid, remoteJid: msgKeyOrJid })
        : resolveIds(msgKeyOrJid);
    return ids.some((c) => list.includes(c.id));
}

function banUser(msgKeyOrJid) {
    const list = getBannedList();
    const ids = typeof msgKeyOrJid === 'string'
        ? resolveIds({ participant: msgKeyOrJid, remoteJid: msgKeyOrJid })
        : resolveIds(msgKeyOrJid);
    let changed = false;
    for (const { id } of ids) {
        if (!list.includes(id)) { list.push(id); changed = true; }
    }
    if (changed) fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    return list;
}

function unbanUser(msgKeyOrJid) {
    const ids = typeof msgKeyOrJid === 'string'
        ? resolveIds({ participant: msgKeyOrJid, remoteJid: msgKeyOrJid })
        : resolveIds(msgKeyOrJid);
    const idSet = ids.map((c) => c.id);
    const list = getBannedList().filter((id) => !idSet.includes(id));
    fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    return list;
}

module.exports = { getBannedList, isBanned, banUser, unbanUser };
