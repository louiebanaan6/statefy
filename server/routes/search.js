const express = require('express');
const { getDb } = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.json({ users: [], statements: [] });

  const db = getDb();
  const like = `%${q}%`;

  const users = db.prepare(`
    SELECT id, username, display_name, avatar_url, is_verified, bio, follower_count
    FROM users
    WHERE is_deleted = 0 AND (LOWER(username) LIKE LOWER(?) OR LOWER(display_name) LIKE LOWER(?))
    ORDER BY follower_count DESC LIMIT 10
  `).all(like, like);

  const statements = db.prepare(`
    SELECT s.id, s.content, s.created_at, s.like_count, s.vote_count, s.comment_count,
           u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.is_deleted = 0 AND u.is_deleted = 0 AND LOWER(s.content) LIKE LOWER(?)
    ORDER BY (s.like_count + s.vote_count) DESC LIMIT 10
  `).all(like);

  const uid = req.user?.id;
  let suggestedUsers;
  if (uid) {
    suggestedUsers = db.prepare(`
      SELECT id, username, display_name, avatar_url, is_verified, bio, follower_count
      FROM users
      WHERE is_deleted = 0 AND id != ?
        AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY follower_count DESC LIMIT 5
    `).all(uid, uid);
  } else {
    suggestedUsers = db.prepare(`
      SELECT id, username, display_name, avatar_url, is_verified, bio, follower_count
      FROM users WHERE is_deleted = 0
      ORDER BY follower_count DESC LIMIT 5
    `).all();
  }

  res.json({ users, statements, suggested_users: suggestedUsers });
});

module.exports = router;
