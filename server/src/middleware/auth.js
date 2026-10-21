const db = require('../db');
const { verifyAccessToken, ACCESS_COOKIE } = require('../utils/tokens');

const findUser = db.prepare(
  'SELECT id, email, full_name, role, company FROM users WHERE id = ?'
);

/** Requires a valid access cookie and loads the user fresh from the database. */
function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return res.status(401).json({ error: 'Sign in to continue.', code: 'NO_SESSION' });

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'Your session has expired.', code: 'TOKEN_EXPIRED' });
  }

  const user = findUser.get(Number(payload.sub));
  if (!user) return res.status(401).json({ error: 'Sign in to continue.', code: 'NO_SESSION' });

  req.user = user; // role comes from the database, not from the token
  next();
}

/** Use after requireAuth. Allows only the listed roles. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Your account cannot open this area.', code: 'FORBIDDEN' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
