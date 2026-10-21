const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const ISSUER = 'shortlist-api';
const AUDIENCE = 'shortlist-web';

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: config.accessTtlSeconds,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'], // never trust the algorithm named in the token
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

const ACCESS_COOKIE = 'sl_access';
const REFRESH_COOKIE = 'sl_refresh';

function baseCookie() {
  return { httpOnly: true, secure: config.isProd, sameSite: 'strict' };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie(),
    path: '/api',
    maxAge: config.accessTtlSeconds * 1000,
  });
  // The refresh cookie is only ever sent to the auth routes.
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    path: '/api/auth',
    maxAge: config.refreshTtlSeconds * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), path: '/api' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie(), path: '/api/auth' });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
