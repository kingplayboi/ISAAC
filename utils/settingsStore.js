const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/settings.json');

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
    console.error('[settingsStore] Failed to save:', err.message);
  }
}

let state = load();

function get(key, fallback = undefined) {
  return key in state ? state[key] : fallback;
}

function set(key, value) {
  state[key] = value;
  save(state);
}

function getAll() {
  return { ...state };
}

module.exports = { get, set, getAll };
