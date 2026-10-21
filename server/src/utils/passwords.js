const bcrypt = require('bcryptjs');
const config = require('../config');

// bcrypt only reads the first 72 bytes, so longer passwords are rejected
// instead of being silently truncated.
const MAX_BYTES = 72;
const MIN_LENGTH = 10;

const COMMON = new Set([
  'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '1234567890', '12345678910', '123456789012', 'qwertyuiop', 'qwerty12345',
  'qwerty123456', 'iloveyou123', 'letmein1234', 'welcome1234', 'welcome123',
  'admin12345', 'administrator', 'changeme123', 'abc1234567', 'abcd123456',
  'football123', 'monkey12345', 'dragon12345', 'sunshine123', 'princess123',
  'superman123', 'trustno1234', 'whatever123', 'google12345', 'recruiter1',
  'recruiter123', 'applicant123', 'company1234',
]);

/** Returns an error message, or null when the password is acceptable. */
function checkPasswordPolicy(password, email = '') {
  if (typeof password !== 'string') return 'Enter a password.';
  if (password.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (Buffer.byteLength(password, 'utf8') > MAX_BYTES) return 'Use 72 bytes or fewer.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  if (COMMON.has(password.toLowerCase())) return 'That password is too common. Choose another.';
  const local = email.split('@')[0];
  if (local.length >= 4 && password.toLowerCase().includes(local.toLowerCase())) {
    return 'Do not use your email address in your password.';
  }
  return null;
}

const hashPassword = (password) => bcrypt.hash(password, config.bcryptCost);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when an email is unknown, so "no such user" takes about
// as long as "wrong password" and cannot be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptCost);

module.exports = { checkPasswordPolicy, hashPassword, verifyPassword, DUMMY_HASH, MIN_LENGTH };
