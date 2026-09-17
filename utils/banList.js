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

function isBanned(ids) {
    const list = getBannedList();
    return ids.some((i) => list.includes(i.id));
}

function banUser(ids) {
    const list = getBannedList();
    let changed = false;
    for (const { id } of ids) {
        if (!list.includes(id)) { list.push(id); changed = true; }
    }
    if (changed) fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    return list;
}

function unbanUser(ids) {
    const idSet = ids.map((i) => i.id);
    const list = getBannedList().filter((id) => !idSet.includes(id));
    fs.writeFileSync(BAN_FILE, JSON.stringify(list, null, 2));
    return list;
}

module.exports = { getBannedList, isBanned, banUser, unbanUser };
