const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

function sanitize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

function enrichStatement(db, s, userId) {
  const result = { ...s };
  result.options = s.custom_options ? JSON.parse(s.custom_options) : [s.option_a, s.option_b];
  if (userId) {
    const liked = db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(userId, s.id);
    result.user_liked = !!liked;
    const vote = db.prepare('SELECT option_chosen FROM votes WHERE user_id = ? AND statement_id = ?').get(userId, s.id);
    result.user_vote = vote?.option_chosen || null;
  } else {
    result.user_liked = false;
    result.user_vote = null;
  }
  return result;
}

router.get('/:username', optionalAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const statCount = db.prepare('SELECT COUNT(*) as count FROM statements WHERE user_id = ? AND is_deleted = 0').get(user.id);
  const result = { ...sanitize(user), statement_count: statCount.count };

  if (req.user && req.user.id !== user.id) {
    const following = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
    result.is_following = !!following;
    // Friends = both follow each other
    if (following) {
      const mutualFollow = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(user.id, req.user.id);
      result.is_friend = !!mutualFollow;
    } else {
      result.is_friend = false;
    }
  }

  res.json({ user: result });
});

router.put('/me', authenticate, (req, res) => {
  const db = getDb();
  const { display_name, username, bio, avatar_url, current_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const updates = {};

  if (display_name !== undefined) {
    if (display_name.trim().length < 1 || display_name.trim().length > 30) {
      return res.status(400).json({ error: 'Display name must be 1-30 characters' });
    }
    if (user.display_name_changed_at) {
      const daysSince = (Date.now() - new Date(user.display_name_changed_at).getTime()) / 86400000;
      if (daysSince < 7) {
        return res.status(400).json({ error: `Display name can be changed again in ${Math.ceil(7 - daysSince)} day(s)` });
      }
    }
    updates.display_name = display_name.trim();
    updates.display_name_changed_at = new Date().toISOString();
  }

  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores only)' });
    }
    if (user.username_changed_at) {
      const daysSince = (Date.now() - new Date(user.username_changed_at).getTime()) / 86400000;
      if (daysSince < 30) {
        return res.status(400).json({ error: `Username can be changed again in ${Math.ceil(30 - daysSince)} day(s)` });
      }
    }
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?').get(username, req.user.id);
    if (existing) return res.status(400).json({ error: 'Username is already taken' });
    updates.username = username;
    updates.username_changed_at = new Date().toISOString();
  }

  if (bio !== undefined) {
    if (bio.length > 160) return res.status(400).json({ error: 'Bio must be 160 characters or less' });
    updates.bio = bio;
  }

  if (avatar_url !== undefined) {
    updates.avatar_url = avatar_url;
  }

  if (new_password) {
    const { password_code } = req.body;
    if (!password_code) return res.status(400).json({ error: 'Email verification code is required to change password' });
    if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const record = db.prepare(
      'SELECT * FROM email_codes WHERE email = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).get(req.user.email, 'change_password');
    if (!record) return res.status(400).json({ error: 'No verification code found. Send a new code first.' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Code has expired. Send a new code.' });
    if (record.code !== password_code.trim()) return res.status(400).json({ error: 'Incorrect code.' });
    db.prepare('UPDATE email_codes SET used = 1 WHERE id = ?').run(record.id);
    updates.password_hash = bcrypt.hashSync(new_password, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No changes provided' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), req.user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitize(updated) });
});

router.get('/:username/statements', optionalAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const statements = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.user_id = ? AND s.is_deleted = 0
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `).all(user.id, limit + 1, offset);

  const hasMore = statements.length > limit;
  const uid = req.user?.id;
  res.json({ statements: statements.slice(0, limit).map(s => enrichStatement(db, s, uid)), hasMore });
});

router.get('/:username/liked', optionalAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const statements = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s
    JOIN users u ON s.user_id = u.id
    JOIN likes l ON l.statement_id = s.id
    WHERE l.user_id = ? AND s.is_deleted = 0
    ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `).all(user.id, limit + 1, offset);

  const hasMore = statements.length > limit;
  const uid = req.user?.id;
  res.json({ statements: statements.slice(0, limit).map(s => enrichStatement(db, s, uid)), hasMore });
});

router.post('/:username/follow', authenticate, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself' });

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id);
  if (existing) return res.status(400).json({ error: 'Already following' });

  db.prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, target.id);
  db.prepare('UPDATE users SET follower_count = follower_count + 1 WHERE id = ?').run(target.id);
  db.prepare('UPDATE users SET following_count = following_count + 1 WHERE id = ?').run(req.user.id);

  db.prepare(`INSERT INTO notifications (id, user_id, actor_id, type) VALUES (?, ?, ?, 'follow')`)
    .run(uuidv4(), target.id, req.user.id);

  res.json({ following: true });
});

router.delete('/:username/follow', authenticate, (req, res) => {
  const db = getDb();
  const target = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, target.id);
  if (!existing) return res.status(400).json({ error: 'Not following' });

  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  db.prepare('UPDATE users SET follower_count = MAX(0, follower_count - 1) WHERE id = ?').run(target.id);
  db.prepare('UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?').run(req.user.id);

  res.json({ following: false });
});

router.get('/:username/followers', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.bio
    FROM follows f JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? AND u.is_deleted = 0
    ORDER BY f.created_at DESC
  `).all(user.id);

  res.json({ users: followers });
});

router.get('/:username/following', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND is_deleted = 0').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const following = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.bio
    FROM follows f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? AND u.is_deleted = 0
    ORDER BY f.created_at DESC
  `).all(user.id);

  res.json({ users: following });
});

module.exports = router;
