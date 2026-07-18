const pino = require('pino');

// pino-pretty is optional eye-candy for development. We try to use it,
// but fall back gracefully to plain pino output if it's not installed,
// so the bot never crashes just because of a missing dev dependency.
let transport;
try {
  require.resolve('pino-pretty');
  transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
} catch {
  transport = undefined; // pino-pretty not installed -> use default JSON output
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport,
});

module.exports = logger;
