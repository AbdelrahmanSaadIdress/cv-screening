const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const config = require('../config');

const tooMany = (message) => ({ error: message, code: 'RATE_LIMITED' });

function makeLimiter({ windowMs, limit }, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: tooMany(message),
  });
}

const globalLimiter = makeLimiter(
  config.rateLimits.global,
  'Too many requests. Wait a few minutes and try again.'
);
const loginLimiter = makeLimiter(
  config.rateLimits.login,
  'Too many sign-in attempts. Wait 15 minutes and try again.'
);
const registerLimiter = makeLimiter(
  config.rateLimits.register,
  'Too many accounts created from this network. Try again in an hour.'
);

const securityHeaders = helmet(); // CSP, HSTS, nosniff, frame-ancestors, etc.

const corsPolicy = cors({
  origin(origin, callback) {
    // No Origin header means a same-origin request or a non-browser client.
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
});

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence, layered on top of SameSite=Strict cookies:
 *  1. a browser that sends an Origin header must send an allowed one;
 *  2. every state-changing request must carry a custom header, which a
 *     cross-site form or image cannot set.
 */
function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  if (origin && !config.clientOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Request blocked.', code: 'BAD_ORIGIN' });
  }
  if (req.get('x-requested-with') !== 'cv-screening') {
    return res.status(403).json({ error: 'Request blocked.', code: 'MISSING_CSRF_HEADER' });
  }
  next();
}

module.exports = {
  securityHeaders,
  corsPolicy,
  csrfGuard,
  globalLimiter,
  loginLimiter,
  registerLimiter,
};
