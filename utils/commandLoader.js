const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function loadCommands(commandsPath) {
  const commands = new Map();

  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    try {
      const command = require(filePath);

      // Support both single export and array of commands
      const commandList = Array.isArray(command) ? command : [command];

      for (const cmd of commandList) {
        if (!cmd || !cmd.name || typeof cmd.execute !== 'function') {
          logger.warn(`[commandLoader] Skipping entry in "${file}" — must have { name, execute }.`);
          continue;
        }
        commands.set(cmd.name.toLowerCase(), cmd);
        logger.info(`[commandLoader] Loaded command: ${cmd.name}`);

        // Also register any declared aliases, pointing to the same
        // command object — previously this field was set on commands but
        // never actually read anywhere, so aliases silently never worked.
        if (Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            if (typeof alias !== 'string' || !alias.trim()) continue;
            const key = alias.toLowerCase();
            if (commands.has(key)) {
              logger.warn(`[commandLoader] Alias "${key}" from "${file}" conflicts with an existing command/alias — skipping.`);
              continue;
            }
            commands.set(key, cmd);
            logger.info(`[commandLoader] Registered alias: ${alias} -> ${cmd.name}`);
          }
        }
      }
    } catch (error) {
      logger.error(`[commandLoader] Failed to load "${file}": ${error.message}`);
    }
  }

  return commands;
}

module.exports = { loadCommands };
