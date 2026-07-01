/**
 * utils/lydiaStore.js
 * --------------------
 * Tracks which chats (and optionally which specific participants within
 * a chat) have the Lydia auto-chat persona turned on. Persisted to a
 * JSON file so the setting survives bot restarts.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/lydia.json');

function load() {
  try {
    if (!fs.existsSync(DATA_PATH)) return {};
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(state) {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[lydiaStore] Failed to save state:', err.message);
  }
}

let state = load();

function enable(chatJid, targetJid = null) {
  if (!state[chatJid]) state[chatJid] = { all: false, users: {} };

  if (targetJid) {
    state[chatJid].users[targetJid] = true;
  } else {
    state[chatJid].all = true;
  }
  save(state);
}

function disable(chatJid, targetJid = null) {
  if (!state[chatJid]) return;

  if (targetJid) {
    delete state[chatJid].users[targetJid];
  } else {
    state[chatJid].all = false;
    state[chatJid].users = {};
  }
  save(state);
}

function isEnabled(chatJid, senderJid) {
  const entry = state[chatJid];
  if (!entry) return false;
  if (entry.all) return true;
  return !!entry.users[senderJid];
}

module.exports = { enable, disable, isEnabled };
