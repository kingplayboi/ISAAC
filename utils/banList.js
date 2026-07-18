const fs = require('fs');
const path = require('path');

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

function isBanned(jid) {
    return getBannedList().includes(jid);
}

function banUser(jid) {
    const list = getBannedList();
    if (!list.includes(jid)) {
        list.push(jid);
        fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    }
    return list;
}

function unbanUser(jid) {
    let list = getBannedList();
    list = list.filter((id) => id !== jid);
    fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    return list;
}

module.exports = { getBannedList, isBanned, banUser, unbanUser };
