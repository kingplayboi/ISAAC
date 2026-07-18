const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;
let schemaReadyPromise = null;

function getPool() {
    if (!DATABASE_URL) {
        throw new Error(
            'DATABASE_URL is not set. On Heroku, attach the Heroku Postgres ' +
            'add-on (Resources tab) to set it automatically. Locally, add it ' +
            'to your .env file.'
        );
    }

    if (!pool) {
        pool = new Pool({
            connectionString: DATABASE_URL,
            // Heroku Postgres requires SSL but uses a self-signed cert chain
            ssl: { rejectUnauthorized: false }
        });
    }

    return pool;
}

async function ensureSchema() {
    if (!schemaReadyPromise) {
        schemaReadyPromise = getPool()
            .query(`
                CREATE TABLE IF NOT EXISTS group_settings (
                    jid   TEXT NOT NULL,
                    key   TEXT NOT NULL,
                    value BOOLEAN NOT NULL,
                    PRIMARY KEY (jid, key)
                );
            `)
            .then(() => {
                console.log('✅ Connected to PostgreSQL, schema ready');
            })
            .catch((err) => {
                schemaReadyPromise = null; // allow a retry on the next call instead of staying broken forever
                throw err;
            });
    }
    return schemaReadyPromise;
}

async function query(text, params) {
    await ensureSchema();
    return getPool().query(text, params);
}

module.exports = { query, ensureSchema };
