const CACHE_LIMIT = 3000;
const MAX_CACHE_BYTES = 40 * 1024 * 1024; // 40MB ceiling
const cache = new Map(); // key: `${remoteJid}:${id}` -> { type, text, rawMessage, senderJid, timestamp }
let approxBytes = 0;

function estimateSize(data) {
  try {
    return Buffer.byteLength(JSON.stringify(data));
  } catch {
    return 0;
  }
}

function set(remoteJid, id, data) {
  const key = `${remoteJid}:${id}`;
  const entry = { ...data, timestamp: Date.now() };
  const size = estimateSize(entry);

  const old = cache.get(key);
  if (old) approxBytes -= estimateSize(old);

  cache.set(key, entry);
  approxBytes += size;

  while ((cache.size > CACHE_LIMIT || approxBytes > MAX_CACHE_BYTES) && cache.size > 0) {
    const oldestKey = cache.keys().next().value;
    const oldestVal = cache.get(oldestKey);
    approxBytes -= estimateSize(oldestVal);
    cache.delete(oldestKey);
  }
}

function get(remoteJid, id) {
  return cache.get(`${remoteJid}:${id}`) || null;
}

function clear() {
  const size = cache.size;
  cache.clear();
  approxBytes = 0;
  return size;
}

module.exports = { set, get, clear };
