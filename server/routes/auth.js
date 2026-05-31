const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dns = require('dns');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// Check if email domain has MX records (validates that email domain can receive mail)
function validateEmailDomain(email) {
  return new Promise((resolve) => {
    const domain = email.split('@')[1];
    if (!domain) return resolve(false);
    dns.resolveMx(domain, (err, addresses) => {
      resolve(!err && addresses && addresses.length > 0);
    });
  });
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
  // Validate that the email domain actually exists
  const domainValid = await validateEmailDomain(email);
  if (!domainValid) {
    return res.status(400).json({ error: 'Email domain does not exist. Please use a real email address.' });
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

  if (db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email)) {
    return res.status(400).json({ error: 'Email is already registered' });
  }
  if (db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username)) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const id = uuidv4();
  const isAdmin = email.toLowerCase() === 'louie.oorts@gmail.com' ? 1 : 0;

  db.prepare(`
    INSERT INTO users (id, email, username, display_name, password_hash, is_admin, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, email.toLowerCase(), username, display_name.trim(), bcrypt.hashSync(password, 10), isAdmin, isAdmin);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ token, user: sanitize(user) });
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

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: sanitize(user) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: sanitize(req.user) });
});

module.exports = router;
