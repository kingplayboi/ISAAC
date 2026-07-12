/**
 * utils/groupCache.js
 * ----------------------
 * Caches group metadata in memory so Baileys can resolve group encryption
 * sessions without re-fetching from WhatsApp on every message. Without
 * this, group commands can fail with a "No sessions" error.
 *
 * Previously this lived only inside index.js, which meant no command
 * could reach it to clear it. Extracted here so both index.js and
 * commands/clearcache.js can share the same instance.
 */

const NodeCache = require('node-cache');

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

module.exports = { groupCache };
