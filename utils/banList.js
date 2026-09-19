const fs = require('fs');
const path = require('path');

const banPath = path.join(__dirname, '../data/banned.json');

function load() {
  if (!fs.existsSync(banPath)) return [];
  const raw = JSON.parse(fs.readFileSync(banPath, 'utf8'));
  return raw.map((entry) => {
    if (typeof entry === 'string') return { ids: [{ id: entry, type: 'pn' }] };
    if (entry.id && !entry.ids) return { ids: [{ id: entry.id, type: entry.type || 'pn' }] };
    return entry;
  });
}

function save(list) {
  fs.writeFileSync(banPath, JSON.stringify(list, null, 2));
}

function findEntryByAnyId(list, ids) {
  const idSet = ids.map((i) => i.id);
  return list.findIndex((entry) => entry.ids.some((stored) => idSet.includes(stored.id)));
}

function isBanned(ids) {
  return findEntryByAnyId(load(), ids) !== -1;
}

function banUser(ids) {
  const list = load();
  const idx = findEntryByAnyId(list, ids);
  if (idx !== -1) {
    const existing = list[idx];
    for (const newId of ids) {
      if (!existing.ids.some((i) => i.id === newId.id)) existing.ids.push({ id: newId.id, type: newId.type });
    }
  } else {
    list.push({ ids: ids.map((i) => ({ id: i.id, type: i.type })) });
  }
  save(list);
}

function unbanUser(ids) {
  const idSet = ids.map((i) => i.id);
  save(load().filter((entry) => !entry.ids.some((stored) => idSet.includes(stored.id))));
}

function findBanEntry(ids) {
  const idSet = ids.map((i) => i.id);
  return load().find((entry) => entry.ids.some((i) => idSet.includes(i.id)));
}

function getBannedList() {
  return load();
}

module.exports = { isBanned, banUser, unbanUser, findBanEntry, getBannedList };
