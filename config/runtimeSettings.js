/**
 * config/runtimeSettings.js
 * ----------------------------
 * Small persisted store for settings that can be changed at runtime via
 * bot commands (prefix, work mode) so they survive restarts instead of
 * silently resetting to the .env defaults every time the process starts.
 */

const fs = require('fs');
const path = require('path');

const settingsPath = path.join(__dirname, 'botSettings.json');

function load() {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function save(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function get(key, fallback) {
  const settings = load();
  return settings[key] !== undefined ? settings[key] : fallback;
}

function set(key, value) {
  const settings = load();
  settings[key] = value;
  save(settings);
}

module.exports = { get, set };
