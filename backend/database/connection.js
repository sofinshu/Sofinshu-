const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'database', 'strata.db');

// Ensure database directory exists
const dbDir = path.dirname(DB_PATH);
try {
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('[Database] Created directory:', dbDir);
    }
} catch (err) {
    console.warn('[Database] Failed to create directory, will try fallback.');
}

// Create database connection
let db;
try {
    db = new Database(DB_PATH);
    console.log('[Database] Connected to:', DB_PATH);
} catch (error) {
    console.warn(`[Database] Failed to open database at ${DB_PATH}:`, error.message);
    const FALLBACK_PATH = '/tmp/strata.db'; // Common writable path on Railway/Nixpacks
    console.log('[Database] Falling back to temporary database:', FALLBACK_PATH);
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
