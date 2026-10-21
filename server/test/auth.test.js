// Must be set before the app is loaded: in-memory database and a throwaway secret.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.DB_PATH = ':memory:';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const db = require('../src/db');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

/** A tiny browser: keeps cookies and only sends them to matching paths. */
function browser() {
  const jar = new Map(); // name -> { value, path }
  return {
    jar,
    async call(method, path, body, headers = {}) {
      const cookie = [...jar.entries()]
        .filter(([, c]) => path.startsWith(c.path))
        .map(([name, c]) => `${name}=${c.value}`)
        .join('; ');
      const res = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'cv-screening',
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const line of res.headers.getSetCookie()) {
        const [pair, ...attrs] = line.split('; ');
        const [name, value] = pair.split('=');
        const path = attrs.find((a) => a.toLowerCase().startsWith('path='))?.slice(5) || '/';
        const expired = attrs.some((a) => /^max-age=0$/i.test(a) || /^expires=.*1970/i.test(a));
        if (expired || !value) jar.delete(name);
        else jar.set(name, { value, path, raw: line });
      }
      let json = null;
      try {
        json = await res.json();
      } catch {}
      return { status: res.status, json, res };
    },
  };
}

const goodApplicant = (n = 1) => ({
  fullName: 'Amira Hassan',
  email: `amira${n}@example.com`,
  password: 'Tangerine-River-42',
  role: 'applicant',
});
// The login endpoint only accepts email and password.
const creds = (n = 1) => ({ email: goodApplicant(n).email, password: goodApplicant(n).password });
const goodRecruiter = (n = 1) => ({
  fullName: 'Omar Khaled',
  email: `omar${n}@acme.com`,
  password: 'Granite-Harbor-77',
  role: 'recruiter',
  company: 'Acme Hiring',
});

test('register signs the user in with httpOnly, SameSite=Strict cookies', async () => {
  const b = browser();
  const r = await b.call('POST', '/api/auth/register', goodApplicant(1));
  assert.equal(r.status, 201);
  assert.equal(r.json.user.role, 'applicant');
  assert.equal(r.json.user.password_hash, undefined);
  for (const { raw } of b.jar.values()) {
    assert.match(raw, /HttpOnly/i);
    assert.match(raw, /SameSite=Strict/i);
  }
  const me = await b.call('GET', '/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.json.user.email, 'amira1@example.com');
});

test('password is stored hashed, never in plain text', () => {
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('amira1@example.com');
  assert.match(row.password_hash, /^\$2[aby]\$/);
  assert.doesNotMatch(row.password_hash, /Tangerine/);
});

test('weak and common passwords are rejected', async () => {
  const b = browser();
  for (const password of ['short1', 'allletterspassword', '1234567890123', 'Password123']) {
    const r = await b.call('POST', '/api/auth/register', { ...goodApplicant(2), password });
    assert.equal(r.status, 400, password);
    assert.ok(r.json.fields.password, password);
  }
});

test('recruiters must give a company; unknown roles such as admin are refused', async () => {
  const b = browser();
  const noCompany = await b.call('POST', '/api/auth/register', { ...goodRecruiter(3), company: '' });
  assert.equal(noCompany.status, 400);
  assert.ok(noCompany.json.fields.company);

  const admin = await b.call('POST', '/api/auth/register', { ...goodApplicant(3), role: 'admin' });
  assert.equal(admin.status, 400);
  assert.ok(admin.json.fields.role);

  const extra = await b.call('POST', '/api/auth/register', { ...goodApplicant(3), isAdmin: true });
  assert.equal(extra.status, 400);
});

test('duplicate email is refused, case-insensitively', async () => {
  const b = browser();
  const r = await b.call('POST', '/api/auth/register', {
    ...goodApplicant(1),
    email: 'AMIRA1@Example.com',
  });
  assert.equal(r.status, 409);
});

test('wrong password and unknown email give the same answer', async () => {
  const b = browser();
  const wrong = await b.call('POST', '/api/auth/login', {
    email: 'amira1@example.com',
    password: 'Not-The-Password-1',
  });
  const unknown = await b.call('POST', '/api/auth/login', {
    email: 'nobody@example.com',
    password: 'Not-The-Password-1',
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.json, unknown.json);
});

test('five failed logins lock the account, even for the right password', async () => {
  const reg = browser();
  await reg.call('POST', '/api/auth/register', goodApplicant(4));

  const b = browser();
  for (let i = 0; i < 5; i++) {
    const r = await b.call('POST', '/api/auth/login', {
      email: 'amira4@example.com',
      password: 'wrong-password-9',
    });
    assert.equal(r.status, 401);
  }
  const locked = await b.call('POST', '/api/auth/login', creds(4));
  assert.equal(locked.status, 429);
  assert.equal(locked.json.code, 'LOCKED');
  assert.ok(locked.res.headers.get('retry-after'));

  // A made-up email locks in exactly the same way, so locks reveal nothing.
  let last;
  for (let i = 0; i < 6; i++) {
    last = await b.call('POST', '/api/auth/login', {
      email: 'ghost@example.com',
      password: 'wrong-password-9',
    });
  }
  assert.equal(last.status, 429);
});

test('successful login resets the failure counter', async () => {
  const reg = browser();
  await reg.call('POST', '/api/auth/register', goodApplicant(5));
  const b = browser();
  for (let i = 0; i < 3; i++) {
    await b.call('POST', '/api/auth/login', { email: 'amira5@example.com', password: 'wrong-password-9' });
  }
  const ok = await b.call('POST', '/api/auth/login', creds(5));
  assert.equal(ok.status, 200);
  assert.equal(db.prepare('SELECT * FROM login_attempts WHERE email = ?').get('amira5@example.com'), undefined);
});

test('roles are enforced on the server', async () => {
  const anon = browser();
  assert.equal((await anon.call('GET', '/api/recruiter/overview')).status, 401);

  const rec = browser();
  await rec.call('POST', '/api/auth/register', goodRecruiter(6));
  const app = browser();
  await app.call('POST', '/api/auth/register', goodApplicant(6));

  assert.equal((await rec.call('GET', '/api/recruiter/overview')).status, 200);
  assert.equal((await rec.call('GET', '/api/applicant/overview')).status, 403);
  assert.equal((await app.call('GET', '/api/applicant/overview')).status, 200);
  assert.equal((await app.call('GET', '/api/recruiter/overview')).status, 403);
});

test('state-changing requests need the CSRF header and a trusted origin', async () => {
  const b = browser();
  const noHeader = await b.call('POST', '/api/auth/login', creds(1), { 'X-Requested-With': '' });
  assert.equal(noHeader.status, 403);

  const evil = await b.call('POST', '/api/auth/login', creds(1), { Origin: 'https://evil.example' });
  assert.equal(evil.status, 403);

  const trusted = await b.call('POST', '/api/auth/login', creds(1), { Origin: 'http://localhost:5173' });
  assert.equal(trusted.status, 200);
});

test('forged and unsigned tokens are rejected', async () => {
  const b = browser();
  const forged = jwt.sign({ role: 'recruiter' }, 'some-other-secret-some-other-secret-1', {
    subject: '1',
    issuer: 'shortlist-api',
    audience: 'shortlist-web',
  });
  b.jar.set('sl_access', { value: forged, path: '/api' });
  assert.equal((await b.call('GET', '/api/recruiter/overview')).status, 401);

  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' +
    Buffer.from('{"sub":"1","role":"recruiter","iss":"shortlist-api","aud":"shortlist-web"}').toString('base64url') + '.';
  b.jar.set('sl_access', { value: none, path: '/api' });
  assert.equal((await b.call('GET', '/api/recruiter/overview')).status, 401);
});

test('a stolen role claim does not help: role comes from the database', async () => {
  const b = browser();
  await b.call('POST', '/api/auth/register', goodApplicant(7));
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get('amira7@example.com');
  const config = require('../src/config');
  const lying = jwt.sign({ role: 'recruiter' }, config.jwtSecret, {
    subject: String(user.id),
    issuer: 'shortlist-api',
    audience: 'shortlist-web',
    expiresIn: 60,
  });
  b.jar.set('sl_access', { value: lying, path: '/api' });
  assert.equal((await b.call('GET', '/api/recruiter/overview')).status, 403);
});

test('refresh rotates tokens; replaying an old one revokes the whole session', async () => {
  const b = browser();
  await b.call('POST', '/api/auth/register', goodApplicant(8));
  const first = b.jar.get('sl_refresh').value;

  const r1 = await b.call('POST', '/api/auth/refresh');
  assert.equal(r1.status, 200);
  const second = b.jar.get('sl_refresh').value;
  assert.notEqual(first, second);

  // Pretend the first token was used a while ago, then replay it.
  const { hashToken } = require('../src/utils/tokens');
  db.prepare('UPDATE refresh_tokens SET revoked_at = revoked_at - 60 WHERE token_hash = ?').run(hashToken(first));
  const thief = browser();
  thief.jar.set('sl_refresh', { value: first, path: '/api/auth' });
  const replay = await thief.call('POST', '/api/auth/refresh');
  assert.equal(replay.status, 401);
  assert.equal(replay.json.code, 'REUSED');

  // The legitimate holder of the newest token is signed out too.
  const victim = await b.call('POST', '/api/auth/refresh');
  assert.equal(victim.status, 401);
});

test('logout revokes the refresh token', async () => {
  const b = browser();
  await b.call('POST', '/api/auth/register', goodApplicant(9));
  const refresh = b.jar.get('sl_refresh').value;
  const out = await b.call('POST', '/api/auth/logout');
  assert.equal(out.status, 200);
  assert.equal(b.jar.size, 0);

  const again = browser();
  again.jar.set('sl_refresh', { value: refresh, path: '/api/auth' });
  assert.equal((await again.call('POST', '/api/auth/refresh')).status, 401);
});

test('responses carry security headers and hide the framework', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.headers.get('x-powered-by'), null);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy'));
});

test('malformed and oversized bodies get clean errors', async () => {
  const bad = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cv-screening' },
    body: '{not json',
  });
  assert.equal(bad.status, 400);

  const big = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'cv-screening' },
    body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(20000) }),
  });
  assert.equal(big.status, 413);
});
