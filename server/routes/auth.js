const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { sendVerificationCode, sendPasswordResetCode } = require('../utils/email');

function validateEmailDomain(email) {
  return new Promise((resolve) => {
    const domain = email.split('@')[1];
    if (!domain) return resolve(false);
    dns.resolveMx(domain, (err, addresses) => {
      resolve(!err && addresses && addresses.length > 0);
    });
  });
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const router = express.Router();

function sanitize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

router.post('/register', async (req, res) => {
  const { email, username, display_name, password } = req.body;

  if (!email || !username || !display_name || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
  }
  if (display_name.trim().length < 1 || display_name.trim().length > 30) {
    return res.status(400).json({ error: 'Display name must be 1-30 characters' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();

  if (db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND is_deleted = 0').get(email)) {
    return res.status(400).json({ error: 'Email is already registered' });
  }
  if (db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(username)) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const id = uuidv4();
  const isAdmin = email.toLowerCase() === 'louie.oorts@gmail.com' ? 1 : 0;

  try {
    db.prepare(`
      INSERT INTO users (id, email, username, display_name, password_hash, is_admin, is_verified, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase(), username, display_name.trim(), bcrypt.hashSync(password, 10), isAdmin, isAdmin, isAdmin);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email or username is already taken' });
    }
    throw e;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM email_codes WHERE email = ? AND type = ?').run(email.toLowerCase(), 'verify_email');
  db.prepare('INSERT INTO email_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), email.toLowerCase(), code, 'verify_email', expiresAt);

  console.log(`[VERIFY CODE] ${email}: ${code}`);
  sendVerificationCode(email.toLowerCase(), code).catch(e => console.error('[EMAIL ERROR]', e.message));

  res.status(201).json({ requiresVerification: true, email: email.toLowerCase() });
});

router.post('/verify-email', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const db = getDb();
  const record = db.prepare(
    'SELECT * FROM email_codes WHERE email = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(email.toLowerCase(), 'verify_email');

  if (!record) return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  if (record.code !== code.trim()) return res.status(400).json({ error: 'Incorrect code. Please try again.' });

  db.prepare('UPDATE email_codes SET used = 1 WHERE id = ?').run(record.id);
  db.prepare('UPDATE users SET email_verified = 1 WHERE LOWER(email) = LOWER(?)').run(email);

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) return res.status(404).json({ error: 'Account not found' });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: sanitize(user) });
});

router.post('/resend-code', async (req, res) => {
  const { email, type } = req.body;
  if (!email || !type) return res.status(400).json({ error: 'Email and type are required' });
  if (!['verify_email', 'reset_password'].includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

  if (type === 'verify_email' && !user) return res.status(404).json({ error: 'No account found with that email' });
  if (type === 'reset_password' && !user) {
    return res.json({ ok: true });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM email_codes WHERE email = ? AND type = ?').run(email.toLowerCase(), type);
  db.prepare('INSERT INTO email_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), email.toLowerCase(), code, type, expiresAt);

  console.log(`[${type.toUpperCase()} CODE] ${email}: ${code}`);
  const sendFn = type === 'verify_email' ? sendVerificationCode : sendPasswordResetCode;
  sendFn(email.toLowerCase(), code).catch(e => console.error('[EMAIL ERROR]', e.message));

  res.json({ ok: true });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);

  if (!user) {
    return res.json({ ok: true });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM email_codes WHERE email = ? AND type = ?').run(email.toLowerCase(), 'reset_password');
  db.prepare('INSERT INTO email_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), email.toLowerCase(), code, 'reset_password', expiresAt);

  console.log(`[RESET CODE] ${email}: ${code}`);
  sendPasswordResetCode(email.toLowerCase(), code).catch(e => console.error('[EMAIL ERROR]', e.message));

  res.json({ ok: true });
});

router.post('/check-reset-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const db = getDb();
  const record = db.prepare(
    'SELECT * FROM email_codes WHERE email = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(email.toLowerCase(), 'reset_password');

  if (!record) return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  if (record.code !== code.trim()) return res.status(400).json({ error: 'Incorrect code. Please try again.' });

  res.json({ ok: true });
});

router.post('/reset-password', (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) return res.status(400).json({ error: 'All fields are required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const db = getDb();
  const record = db.prepare(
    'SELECT * FROM email_codes WHERE email = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
  ).get(email.toLowerCase(), 'reset_password');

  if (!record) return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  if (record.code !== code.trim()) return res.status(400).json({ error: 'Incorrect code. Please try again.' });

  db.prepare('UPDATE email_codes SET used = 1 WHERE id = ?').run(record.id);
  db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)').run(bcrypt.hashSync(new_password, 10), email);

  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.is_banned) return res.status(403).json({ error: 'Your account has been banned' });
  if (user.is_deleted) return res.status(403).json({ error: 'This account has been deleted' });
  if (user.email_verified != null && user.email_verified !== 1) {
    return res.status(403).json({ error: 'Email not verified', requiresVerification: true, email: user.email });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: sanitize(user) });
});

router.post('/send-password-change-code', authenticate, async (req, res) => {
  const db = getDb();
  const email = req.user.email;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM email_codes WHERE email = ? AND type = ?').run(email, 'change_password');
  db.prepare('INSERT INTO email_codes (id, email, code, type, expires_at) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), email, code, 'change_password', expiresAt);
  console.log(`[CHANGE PASSWORD CODE] ${email}: ${code}`);
  sendPasswordResetCode(email, code).catch(e => console.error('[EMAIL ERROR]', e.message));
  res.json({ ok: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

module.exports = router;
