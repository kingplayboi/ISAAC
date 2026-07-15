/**
 * utils/settingsStore.js
 * ------------------------
 * Bot-wide (not per-group) key/value settings store.
 *
 * Optional PostgreSQL backing: if DATABASE_URL is set, settings persist to
 * a `bot_settings` table (survives Heroku restarts/redeploys). If it's
 * NOT set, this falls back to the original behavior — a local
 * data/settings.json file — so nothing breaks for anyone not using a DB.
 *
 * The public API (get/set/getAll) stays fully synchronous either way, so
 * no call site elsewhere needs to change. Reads come from an in-memory
 * cache; writes update the cache instantly and persist in the background.
 *
 * ⚠️ Startup race note: when using Postgres, there's a brief window right
 * after boot (usually well under a second) before the DB-loaded settings
 * arrive in the cache. If something calls get() in that window, it'll see
 * the fallback value instead of the persisted one. If you have startup
 * code that truly needs settings before anything else runs, `await
 * settingsStore.ready` first (it resolves once the initial DB load, if
 * any, is done).
 */

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
