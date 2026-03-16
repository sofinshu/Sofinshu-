const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'strata.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
let db;
try {
    db = new Database(DB_PATH);
    console.log('[Database] Connected to:', DB_PATH);
} catch (error) {
    console.warn(`[Database] Failed to open database at ${DB_PATH}:`, error.message);
    const FALLBACK_PATH = path.join(__dirname, 'strata.db');
    console.log('[Database] Falling back to local database:', FALLBACK_PATH);
    db = new Database(FALLBACK_PATH);
}

// Enable WAL mode for better concurrency
if (db) {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
}

// Initialize schema
function initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('[Database] Schema initialized');
    }
}

// Run migrations on startup
initSchema();

module.exports = db;
