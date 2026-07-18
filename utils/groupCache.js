const NodeCache = require('node-cache');

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

module.exports = { groupCache };
