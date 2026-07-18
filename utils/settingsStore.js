const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/settings.json');
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
        console.error('[settingsStore] Failed to save to disk:', err.message);
    }
}

let state = USE_DB ? {} : loadFromDisk();

const ready = USE_DB
    ? db.query(`
        CREATE TABLE IF NOT EXISTS bot_settings (
            key   TEXT NOT NULL PRIMARY KEY,
            value JSONB NOT NULL
        );
      `)
      .then(async () => {
          const { rows } = await db.query('SELECT key, value FROM bot_settings');
          for (const row of rows) state[row.key] = row.value;
          console.log('✅ settingsStore: loaded settings from PostgreSQL');
      })
      .catch((err) => {
          console.error(
              '[settingsStore] Failed to load from PostgreSQL, falling back to disk cache:',
              err.message
          );
          state = loadFromDisk();
      })
    : Promise.resolve();

function get(key, fallback = undefined) {
    return key in state ? state[key] : fallback;
}

function set(key, value) {
    state[key] = value;

    if (USE_DB) {
        db.query(
            `INSERT INTO bot_settings (key, value)
             VALUES ($1, $2)
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [key, JSON.stringify(value)]
        ).catch((err) => {
            console.error('[settingsStore] Failed to persist to PostgreSQL:', err.message);
        });
    } else {
        saveToDisk(state);
    }
}

function getAll() {
    return { ...state };
}

module.exports = { get, set, getAll, ready };
