/**
 * utils/messageCache.js
 * ------------------------
 * Keeps a short-lived in-memory cache of recent messages so their
 * content can be recovered if the sender deletes them (antidelete).
 */

const CACHE_LIMIT = 500;
const cache = new Map(); // key: `${remoteJid}:${id}` -> { type, text, rawMessage, senderJid, timestamp }

function set(remoteJid, id, data) {
  const key = `${remoteJid}:${id}`;
  cache.set(key, { ...data, timestamp: Date.now() });

  if (cache.size > CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function get(remoteJid, id) {
  return cache.get(`${remoteJid}:${id}`) || null;
}

function clear() {
  const size = cache.size;
  cache.clear();
  return size;
}

module.exports = { set, get, clear };
