const path = require('path');
require('dotenv').config({ quiet: true });

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

function requireSecret(name) {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(
      `${name} is missing or shorter than 32 characters. Run "npm run setup" to generate one.`
    );
  }
  return value;
}

// Returns the fallback in development and refuses to start in production.
function requireInDev(fallback) {
  if (isProd) throw new Error('CLIENT_ORIGIN must be set in production.');
  return fallback;
}

module.exports = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,

  // Origins allowed to call the API from a browser (comma separated).
  // In production this must be set explicitly, for example https://app.yourcompany.com
  clientOrigins: (process.env.CLIENT_ORIGIN || requireInDev('http://localhost:5173,http://127.0.0.1:5173'))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Set to 1 when running behind a reverse proxy (Nginx, Render, Heroku...)
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false,

  jwtSecret: requireSecret('JWT_ACCESS_SECRET'),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db'),

  accessTtlSeconds: 15 * 60, // short-lived access token
  refreshTtlSeconds: 7 * 24 * 60 * 60, // refresh token, rotated on every use
  refreshReuseGraceSeconds: 10, // tolerates two tabs refreshing at the same moment

  bcryptCost: isTest ? 4 : 12,

  maxFailedLogins: 5,
  lockoutSeconds: 15 * 60,

  // Per-IP limits, per window
  rateLimits: {
    global: { windowMs: 15 * 60 * 1000, limit: isTest ? 10000 : 300 },
    login: { windowMs: 15 * 60 * 1000, limit: isTest ? 10000 : 20 },
    register: { windowMs: 60 * 60 * 1000, limit: isTest ? 10000 : 10 },
  },
};
