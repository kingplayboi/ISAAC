const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../config/groupSettings.json');
const USE_DB = !!process.env.DATABASE_URL;

let db = null;
if (USE_DB) {
    db = require('./db');
}

function loadFromDisk() {
    try {
        if (!fs.existsSync(DATA_PATH)) return {};
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveToDisk(currentState) {
    try {
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
        fs.writeFileSync(DATA_PATH, JSON.stringify(currentState, null, 2));
    } catch (err) {
        console.error('[groupSettingsStore] Failed to save to disk:', err.message);
    }
}

let state = USE_DB ? {} : loadFromDisk();

const ready = USE_DB
    ? db.ensureSchema()
        .then(async () => {
            const { rows } = await db.query('SELECT jid, key, value FROM group_settings');
            for (const row of rows) {
                if (!state[row.jid]) state[row.jid] = {};
                state[row.jid][row.key] = row.value;
            }
            console.log('✅ groupSettingsStore: loaded settings from PostgreSQL');
        })
        .catch((err) => {
            console.error('[groupSettingsStore] Failed to load from PostgreSQL, falling back to disk cache:', err.message);
            state = loadFromDisk();
        })
    : Promise.resolve();

function get(jid, key, fallback = undefined) {
    return state[jid] && key in state[jid] ? state[jid][key] : fallback;
}

function getAll(jid) {
    return { ...(state[jid] || {}) };
}

function set(jid, key, value) {
    if (!state[jid]) state[jid] = {};
    state[jid][key] = value;

    if (USE_DB) {
        db.query(
            `INSERT INTO group_settings (jid, key, value) VALUES ($1, $2, $3)
             ON CONFLICT (jid, key) DO UPDATE SET value = EXCLUDED.value`,
            [jid, key, value]
        ).catch((err) => {
            console.error('[groupSettingsStore] Failed to persist to PostgreSQL:', err.message);
        });
    } else {
        saveToDisk(state);
    }
}

module.exports = { get, set, getAll, ready };
