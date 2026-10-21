// Creates server/.env with a fresh random secret the first time you run the app.
// An existing .env is never overwritten.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const target = path.join(__dirname, '..', '.env');

if (fs.existsSync(target)) {
  console.log('.env already exists, leaving it as it is.');
  process.exit(0);
}

const contents = [
  'PORT=5000',
  'CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173',
  `JWT_ACCESS_SECRET=${crypto.randomBytes(48).toString('base64url')}`,
  '',
].join('\n');

fs.writeFileSync(target, contents, { mode: 0o600 });
console.log('Created .env with a new random JWT_ACCESS_SECRET.');
