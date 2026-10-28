const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

if (config.dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
}

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    full_name     TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('recruiter', 'applicant')),
    company       TEXT,
    created_at    INTEGER NOT NULL,
    last_login_at INTEGER
  );

  -- Only a SHA-256 hash of each refresh token is stored, never the token itself.
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id   TEXT    NOT NULL,
    token_hash  TEXT    NOT NULL UNIQUE,
    created_at  INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL,
    revoked_at  INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens(family_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_user   ON refresh_tokens(user_id);

  -- Tracked per email (whether or not the account exists) so a locked
  -- response looks identical for real and made-up addresses.
  CREATE TABLE IF NOT EXISTS login_attempts (
    email        TEXT PRIMARY KEY,
    failures     INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    updated_at   INTEGER NOT NULL
  );
`);

module.exports = db;
const { uniqueSlug } = require('./utils/slug');

// Add the slug column to databases created before this change.
const columns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!columns.includes('slug')) {
  db.exec('ALTER TABLE users ADD COLUMN slug TEXT');
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_slug ON users(slug)');

// Give a slug to existing users.
const slugTaken = db.prepare('SELECT 1 FROM users WHERE slug = ?');
const setSlug = db.prepare('UPDATE users SET slug = ? WHERE id = ?');
for (const u of db.prepare('SELECT id, full_name FROM users WHERE slug IS NULL').all()) {
  setSlug.run(uniqueSlug(u.full_name, (s) => slugTaken.get(s)), u.id);
}
