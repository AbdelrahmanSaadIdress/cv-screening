const crypto = require('crypto');
const express = require('express');
const { z } = require('zod');

const config = require('../config');
const db = require('../db');
const { loginLimiter, registerLimiter } = require('../middleware/security');
const { requireAuth } = require('../middleware/auth');
const {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
  DUMMY_HASH,
} = require('../utils/passwords');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} = require('../utils/tokens');

const router = express.Router();
const now = () => Math.floor(Date.now() / 1000);

/* ----------------------------- validation ----------------------------- */

const email = z
  .string({ error: 'Enter your email address.' })
  .trim()
  .toLowerCase()
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address.'));

const registerSchema = z
  .object({
    fullName: z
      .string({ error: 'Enter your full name.' })
      .trim()
      .min(2, 'Enter your full name.')
      .max(100, 'Use 100 characters or fewer.'),
    email,
    password: z.string({ error: 'Enter a password.' }).max(200, 'That password is too long.'),
    role: z.enum(['recruiter', 'applicant'], { error: 'Choose how you will use Shortlist.' }),
    company: z.string().trim().max(100, 'Use 100 characters or fewer.').optional(),
  })
  .strict();

const loginSchema = z
  .object({
    email,
    password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
  })
  .strict();

function fieldErrors(zodError) {
  const fields = {};
  for (const issue of zodError.issues) {
    const key = issue.path[0] ?? 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

function invalid(res, fields) {
  return res.status(400).json({ error: 'Check the highlighted fields.', code: 'INVALID', fields });
}

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name,
  role: u.role,
  company: u.company,
});

/* ------------------------------ sessions ------------------------------ */

const insertToken = db.prepare(
  `INSERT INTO refresh_tokens (user_id, family_id, token_hash, created_at, expires_at)
   VALUES (?, ?, ?, ?, ?)`
);

function startSession(res, user, familyId = crypto.randomUUID()) {
  const refresh = generateRefreshToken();
  const t = now();
  insertToken.run(user.id, familyId, refresh.hash, t, t + config.refreshTtlSeconds);
  setAuthCookies(res, signAccessToken(user), refresh.token);
}

/* --------------------------- login throttling -------------------------- */

const getAttempts = db.prepare('SELECT * FROM login_attempts WHERE email = ?');
const clearAttempts = db.prepare('DELETE FROM login_attempts WHERE email = ?');
const bumpAttempts = db.prepare(
  `INSERT INTO login_attempts (email, failures, locked_until, updated_at) VALUES (?, 1, NULL, ?)
   ON CONFLICT(email) DO UPDATE SET failures = failures + 1, updated_at = excluded.updated_at`
);
const lockEmail = db.prepare(
  'UPDATE login_attempts SET locked_until = ?, failures = 0 WHERE email = ?'
);

/** Seconds left on a lockout, or 0. */
function lockRemaining(addr) {
  const row = getAttempts.get(addr);
  if (!row?.locked_until) return 0;
  const left = row.locked_until - now();
  if (left > 0) return left;
  clearAttempts.run(addr); // lock expired
  return 0;
}

function recordFailure(addr) {
  bumpAttempts.run(addr, now());
  const row = getAttempts.get(addr);
  if (row.failures >= config.maxFailedLogins) {
    lockEmail.run(now() + config.lockoutSeconds, addr);
  }
}

/* -------------------------------- routes ------------------------------- */

router.post('/register', registerLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, fieldErrors(parsed.error));
  const { fullName, email: addr, password, role, company } = parsed.data;

  const fields = {};
  const policyError = checkPasswordPolicy(password, addr);
  if (policyError) fields.password = policyError;
  if (role === 'recruiter' && (!company || company.length < 2)) {
    fields.company = 'Enter your company name.';
  }
  if (Object.keys(fields).length) return invalid(res, fields);

  const passwordHash = await hashPassword(password);
  let user;
  try {
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, company, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(addr, passwordHash, fullName, role, role === 'recruiter' ? company : null, now(), now());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        error: 'An account with this email already exists. Sign in instead.',
        code: 'EMAIL_TAKEN',
        fields: { email: 'This email is already registered.' },
      });
    }
    throw err;
  }

  startSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, fieldErrors(parsed.error));
  const { email: addr, password } = parsed.data;

  const left = lockRemaining(addr);
  if (left > 0) {
    res.set('Retry-After', String(left));
    return res.status(429).json({
      error: 'Too many failed attempts. Try again in 15 minutes.',
      code: 'LOCKED',
      retryAfterSeconds: left,
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(addr);
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !ok) {
    recordFailure(addr);
    return res.status(401).json({ error: 'Incorrect email or password.', code: 'BAD_CREDENTIALS' });
  }

  clearAttempts.run(addr);
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now(), user.id);
  startSession(res, user);
  res.json({ user: publicUser(user) });
});

const findRefresh = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?');
const revokeToken = db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?');
const revokeFamily = db.prepare(
  'UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL'
);

/**
 * Refresh tokens are single-use. Each call swaps the old token for a new one
 * in the same family. If a token that was already used shows up again, someone
 * is replaying a stolen copy, so the whole family is revoked.
 */
router.post('/refresh', (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  const fail = (code = 'NO_SESSION') => {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Sign in to continue.', code });
  };
  if (!presented) return fail();

  const row = findRefresh.get(hashToken(presented));
  if (!row) return fail();

  const t = now();
  if (row.revoked_at) {
    // A second tab can race the first one; only treat later reuse as theft.
    if (t - row.revoked_at > config.refreshReuseGraceSeconds) revokeFamily.run(t, row.family_id);
    return fail('REUSED');
  }
  if (row.expires_at <= t) return fail('EXPIRED');

  const user = db
    .prepare('SELECT id, email, full_name, role, company FROM users WHERE id = ?')
    .get(row.user_id);
  if (!user) return fail();

  db.transaction(() => {
    revokeToken.run(t, row.id);
    startSession(res, user, row.family_id);
  })();

  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE];
  if (presented) {
    const row = findRefresh.get(hashToken(presented));
    if (row) revokeFamily.run(now(), row.family_id);
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
