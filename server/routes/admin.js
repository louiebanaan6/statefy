const express = require('express');
const { getDb } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// Directly set follower_count on a user (fake/boosted)
router.put('/users/:id/set-followers', (req, res) => {
  const db = getDb();
  const count = Math.max(0, parseInt(req.body.count) || 0);
  db.prepare('UPDATE users SET follower_count = ? WHERE id = ?').run(count, req.params.id);
  res.json({ follower_count: count });
});

// Directly set following_count on a user
router.put('/users/:id/set-following', (req, res) => {
  const db = getDb();
  const count = Math.max(0, parseInt(req.body.count) || 0);
  db.prepare('UPDATE users SET following_count = ? WHERE id = ?').run(count, req.params.id);
  res.json({ following_count: count });
});

// Directly set like_count on a statement
router.put('/statements/:id/set-likes', (req, res) => {
  const db = getDb();
  const count = Math.max(0, parseInt(req.body.count) || 0);
  db.prepare('UPDATE statements SET like_count = ? WHERE id = ?').run(count, req.params.id);
  res.json({ like_count: count });
});

router.get('/users', (req, res) => {
  const db = getDb();
  const q = req.query.q || '';
  const users = db.prepare(`
    SELECT id, email, username, display_name, avatar_url, is_verified, is_admin, is_banned, is_deleted, created_at, follower_count, following_count
    FROM users
    WHERE (LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(display_name) LIKE LOWER(?))
    ORDER BY created_at DESC LIMIT 50
  `).all(`%${q}%`, `%${q}%`, `%${q}%`);
  res.json({ users });
});

router.get('/stats', (req, res) => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_deleted = 0').get();
  const totalStatements = db.prepare('SELECT COUNT(*) as count FROM statements WHERE is_deleted = 0').get();
  const votesToday = db.prepare("SELECT COUNT(*) as count FROM votes WHERE date(created_at) = date('now')").get();
  const totalVotes = db.prepare('SELECT COUNT(*) as count FROM votes').get();
  res.json({
    total_users: totalUsers.count,
    total_statements: totalStatements.count,
    votes_today: votesToday.count,
    total_votes: totalVotes.count,
  });
});

router.put('/users/:id/ban', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.is_admin) return res.status(400).json({ error: 'Cannot ban an admin' });

  const newBanned = user.is_banned ? 0 : 1;
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(newBanned, req.params.id);
  res.json({ is_banned: !!newBanned, message: newBanned ? 'User banned' : 'User unbanned' });
});

router.put('/users/:id/make-admin', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(req.params.id);
  res.json({ is_admin: true });
});

router.put('/users/:id/verify', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newVerified = user.is_verified ? 0 : 1;
  db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(newVerified, req.params.id);
  res.json({ is_verified: !!newVerified, message: newVerified ? 'User verified' : 'Verification removed' });
});

router.delete('/users/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  const anonEmail = `deleted_${req.params.id}@deleted`;
  const anonUsername = `deleted_${req.params.id.slice(0, 12)}`;
  db.prepare('UPDATE users SET is_deleted = 1, email = ?, username = ? WHERE id = ?')
    .run(anonEmail, anonUsername, req.params.id);
  res.json({ message: 'User deleted' });
});

router.delete('/statements/:id', (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });
  db.prepare('UPDATE statements SET is_deleted = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Statement deleted' });
});

router.get('/statements', (req, res) => {
  const db = getDb();
  const q = req.query.q || '';
  const statements = db.prepare(`
    SELECT s.*, u.username, u.display_name
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.is_deleted = 0 AND LOWER(s.content) LIKE LOWER(?)
    ORDER BY s.created_at DESC LIMIT 50
  `).all(`%${q}%`);
  res.json({ statements });
});

// Give a like to a statement on behalf of a user
router.post('/users/:userId/likes/:statementId', (req, res) => {
  const db = getDb();
  const { userId, statementId } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const stmt = db.prepare('SELECT id FROM statements WHERE id = ? AND is_deleted = 0').get(statementId);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(userId, statementId);
  if (existing) return res.status(400).json({ error: 'Already liked' });
  const { v4: uuidv4 } = require('uuid');
  db.prepare('INSERT INTO likes (id, user_id, statement_id) VALUES (?, ?, ?)').run(uuidv4(), userId, statementId);
  db.prepare('UPDATE statements SET like_count = like_count + 1 WHERE id = ?').run(statementId);
  res.json({ message: 'Like given' });
});

// Remove a like from a statement
router.delete('/users/:userId/likes/:statementId', (req, res) => {
  const db = getDb();
  const { userId, statementId } = req.params;
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(userId, statementId);
  if (!existing) return res.status(404).json({ error: 'Like not found' });
  db.prepare('DELETE FROM likes WHERE user_id = ? AND statement_id = ?').run(userId, statementId);
  db.prepare('UPDATE statements SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(statementId);
  res.json({ message: 'Like removed' });
});

// Get liked statements of a user
router.get('/users/:userId/likes', (req, res) => {
  const db = getDb();
  const statements = db.prepare(`
    SELECT s.id, s.content, s.like_count, s.created_at, u.username, u.display_name
    FROM likes l JOIN statements s ON l.statement_id = s.id JOIN users u ON s.user_id = u.id
    WHERE l.user_id = ? AND s.is_deleted = 0
    ORDER BY l.created_at DESC LIMIT 20
  `).all(req.params.userId);
  res.json({ statements });
});

// Make user A follow user B
router.post('/users/:followerId/follow/:followingId', (req, res) => {
  const db = getDb();
  const { followerId, followingId } = req.params;
  if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself' });
  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);
  if (existing) return res.status(400).json({ error: 'Already following' });
  const { v4: uuidv4 } = require('uuid');
  db.prepare('INSERT INTO follows (id, follower_id, following_id) VALUES (?, ?, ?)').run(uuidv4(), followerId, followingId);
  db.prepare('UPDATE users SET following_count = following_count + 1 WHERE id = ?').run(followerId);
  db.prepare('UPDATE users SET follower_count = follower_count + 1 WHERE id = ?').run(followingId);
  res.json({ message: 'Follow added' });
});

// Remove follow relationship
router.delete('/users/:followerId/follow/:followingId', (req, res) => {
  const db = getDb();
  const { followerId, followingId } = req.params;
  const existing = db.prepare('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId);
  if (!existing) return res.status(404).json({ error: 'Follow not found' });
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
  db.prepare('UPDATE users SET following_count = MAX(0, following_count - 1) WHERE id = ?').run(followerId);
  db.prepare('UPDATE users SET follower_count = MAX(0, follower_count - 1) WHERE id = ?').run(followingId);
  res.json({ message: 'Follow removed' });
});

// Get followers of a user
router.get('/users/:userId/followers', (req, res) => {
  const db = getDb();
  const followers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, f.created_at
    FROM follows f JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? AND u.is_deleted = 0
    ORDER BY f.created_at DESC LIMIT 50
  `).all(req.params.userId);
  res.json({ followers });
});

// Get who a user is following
router.get('/users/:userId/following', (req, res) => {
  const db = getDb();
  const following = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, f.created_at
    FROM follows f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? AND u.is_deleted = 0
    ORDER BY f.created_at DESC LIMIT 50
  `).all(req.params.userId);
  res.json({ following });
});

router.get('/reports', (req, res) => {
  const db = getDb();
  const reports = db.prepare(`
    SELECT r.*, u.username as reporter_username, u.display_name as reporter_display,
      CASE r.target_type
        WHEN 'statement' THEN (SELECT content FROM statements WHERE id = r.target_id)
        WHEN 'comment' THEN (SELECT content FROM comments WHERE id = r.target_id)
      END as target_content
    FROM reports r JOIN users u ON r.reporter_id = u.id
    ORDER BY r.created_at DESC LIMIT 100
  `).all();
  res.json({ reports });
});

router.delete('/reports/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM reports WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
