const config = require('./config');
const db = require('./db');
const app = require('./app');

// Clear out expired or long-revoked refresh tokens once an hour.
const cleanup = setInterval(() => {
  const cutoff = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked_at < ?').run(cutoff, cutoff);
  db.prepare('DELETE FROM login_attempts WHERE updated_at < ?').run(cutoff);
}, 60 * 60 * 1000);
cleanup.unref();

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port} (${config.env})`);
});
