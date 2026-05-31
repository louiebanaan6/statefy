const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { checkText } = require('../utils/moderation');

const router = express.Router();

function getOptions(statement) {
  if (statement.custom_options) {
    try { return JSON.parse(statement.custom_options); } catch {}
  }
  return [statement.option_a, statement.option_b];
}

function getVoteResults(db, statementId, statement) {
  const options = getOptions(statement);
  const votes = db.prepare('SELECT option_chosen, COUNT(*) as count FROM votes WHERE statement_id = ? GROUP BY option_chosen').all(statementId);
  const total = votes.reduce((s, v) => s + v.count, 0);
  return options.map((option, idx) => {
    const v = votes.find(x => x.option_chosen === option);
    const count = v?.count || 0;
    return { option, count, percentage: total > 0 ? Math.round((count / total) * 100) : 0, index: idx };
  });
}

function enrichStatement(db, s, userId) {
  const result = { ...s };
  result.options = getOptions(s);
  if (userId) {
    result.user_liked = !!db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(userId, s.id);
    const vote = db.prepare('SELECT option_chosen FROM votes WHERE user_id = ? AND statement_id = ?').get(userId, s.id);
    result.user_vote = vote?.option_chosen || null;
  } else {
    result.user_liked = false;
    result.user_vote = null;
  }
  if (result.user_vote !== null || !userId) {
    result.vote_results = getVoteResults(db, s.id, s);
  }
  return result;
}

// IMPORTANT: named routes must be registered before /:id
router.get('/following', authenticate, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 10;
  const offset = (page - 1) * limit;
  const db = getDb();
  const uid = req.user.id;

  const rows = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s
    JOIN users u ON s.user_id = u.id
    JOIN follows f ON f.following_id = s.user_id AND f.follower_id = ?
    WHERE s.is_deleted = 0 AND u.is_deleted = 0
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).all(uid, limit + 1, offset);

  const hasMore = rows.length > limit;
  res.json({ statements: rows.slice(0, limit).map(s => enrichStatement(db, s, uid)), hasMore, page });
});

router.get('/trending', optionalAuth, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.is_deleted = 0 AND u.is_deleted = 0
      AND s.created_at > datetime('now', '-7 days')
    ORDER BY (s.like_count + s.vote_count + s.comment_count * 1.5) DESC
    LIMIT 10
  `).all();
  res.json({ statements: rows.map(s => enrichStatement(db, s, req.user?.id)) });
});

router.get('/', optionalAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 10;
  const offset = (page - 1) * limit;
  const db = getDb();
  const uid = req.user?.id;

  const seenClause = uid
    ? `AND s.id NOT IN (SELECT statement_id FROM seen_statements WHERE user_id = ?)`
    : '';
  const params = uid ? [uid, limit + 1, offset] : [limit + 1, offset];

  const rows = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.is_deleted = 0 AND u.is_deleted = 0 ${seenClause}
    ORDER BY (
      CAST(strftime('%s', s.created_at) AS INTEGER) +
      (s.like_count * 2 + s.vote_count + s.comment_count * 1.5) * 1800
    ) DESC
    LIMIT ? OFFSET ?
  `).all(...params);

  const hasMore = rows.length > limit;
  res.json({ statements: rows.slice(0, limit).map(s => enrichStatement(db, s, uid)), hasMore, page });
});

router.post('/seen', authenticate, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
  const db = getDb();
  const insert = db.prepare(`INSERT OR IGNORE INTO seen_statements (user_id, statement_id) VALUES (?, ?)`);
  const batch = db.transaction(() => ids.forEach(id => insert.run(req.user.id, id)));
  batch();
  res.json({ ok: true });
});

router.delete('/seen', authenticate, (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM seen_statements WHERE user_id = ?`).run(req.user.id);
  res.json({ ok: true });
});

router.post('/', authenticate, (req, res) => {
  const { content, option_a, option_b, custom_options, photo_url, audio_url, audio_title } = req.body;

  if (!content?.trim()) return res.status(400).json({ error: 'Statement content is required' });
  if (content.trim().length > 280) return res.status(400).json({ error: 'Statement must be 280 characters or less' });
  const textCheck = checkText(content.trim());
  if (!textCheck.ok) return res.status(400).json({ error: textCheck.reason });

  // Check vote options for profanity
  const optionsToCheck = custom_options?.length
    ? custom_options.map(o => String(o).trim()).filter(Boolean)
    : [option_a, option_b].filter(Boolean);
  for (const opt of optionsToCheck) {
    const optCheck = checkText(opt);
    if (!optCheck.ok) return res.status(400).json({ error: `Vote option contains inappropriate language.` });
  }

  let customJson = null;
  if (custom_options && Array.isArray(custom_options) && custom_options.length > 0) {
    const cleaned = custom_options.map(o => String(o).trim()).filter(Boolean);
    if (cleaned.length < 2 || cleaned.length > 4) return res.status(400).json({ error: 'Provide 2-4 custom options' });
    customJson = JSON.stringify(cleaned);
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(`
    INSERT INTO statements (id, user_id, content, option_a, option_b, custom_options, photo_url, audio_url, audio_title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.user.id, content.trim(),
    customJson ? null : (option_a?.trim() || 'Agree'),
    customJson ? null : (option_b?.trim() || 'Disagree'),
    customJson,
    photo_url || null,
    audio_url || null,
    audio_title || null
  );

  const stmt = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id WHERE s.id = ?
  `).get(id);

  res.status(201).json({ statement: enrichStatement(db, stmt, req.user.id) });
});

router.get('/:id', optionalAuth, (req, res) => {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.is_verified, u.avatar_url
    FROM statements s JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.is_deleted = 0 AND u.is_deleted = 0
  `).get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });
  res.json({ statement: enrichStatement(db, stmt, req.user?.id) });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });
  if (stmt.user_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not authorized' });
  // Soft-delete statement and all its comments
  db.prepare('UPDATE statements SET is_deleted = 1 WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE comments SET is_deleted = 1 WHERE statement_id = ?').run(req.params.id);
  res.json({ message: 'Statement deleted' });
});

router.post('/:id/like', authenticate, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  if (db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(req.user.id, req.params.id)) {
    return res.status(400).json({ error: 'Already liked' });
  }

  db.prepare('INSERT INTO likes (id, user_id, statement_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.id);
  db.prepare('UPDATE statements SET like_count = like_count + 1 WHERE id = ?').run(req.params.id);

  if (stmt.user_id !== req.user.id) {
    db.prepare(`INSERT INTO notifications (id, user_id, actor_id, type, reference_id) VALUES (?, ?, ?, 'like_statement', ?)`)
      .run(uuidv4(), stmt.user_id, req.user.id, req.params.id);
  }

  const updated = db.prepare('SELECT like_count FROM statements WHERE id = ?').get(req.params.id);
  res.json({ liked: true, like_count: updated.like_count });
});

router.delete('/:id/like', authenticate, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM likes WHERE user_id = ? AND statement_id = ?').get(req.user.id, req.params.id)) {
    return res.status(400).json({ error: 'Not liked' });
  }
  db.prepare('DELETE FROM likes WHERE user_id = ? AND statement_id = ?').run(req.user.id, req.params.id);
  db.prepare('UPDATE statements SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT like_count FROM statements WHERE id = ?').get(req.params.id);
  res.json({ liked: false, like_count: updated.like_count });
});

router.post('/:id/vote', authenticate, (req, res) => {
  const { option } = req.body;
  if (!option) return res.status(400).json({ error: 'Vote option is required' });

  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  const options = getOptions(stmt);
  if (!options.includes(option)) return res.status(400).json({ error: 'Invalid vote option' });

  if (db.prepare('SELECT id FROM votes WHERE user_id = ? AND statement_id = ?').get(req.user.id, req.params.id)) {
    return res.status(400).json({ error: 'You have already voted on this statement' });
  }

  db.prepare('INSERT INTO votes (id, user_id, statement_id, option_chosen) VALUES (?, ?, ?, ?)').run(uuidv4(), req.user.id, req.params.id, option);
  db.prepare('UPDATE statements SET vote_count = vote_count + 1 WHERE id = ?').run(req.params.id);

  const results = getVoteResults(db, req.params.id, stmt);
  res.json({ voted: true, option_chosen: option, results });
});

router.get('/:id/votes', optionalAuth, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  const results = getVoteResults(db, req.params.id, stmt);
  let userVote = null;
  if (req.user) {
    const v = db.prepare('SELECT option_chosen FROM votes WHERE user_id = ? AND statement_id = ?').get(req.user.id, req.params.id);
    userVote = v?.option_chosen || null;
  }
  res.json({ results, userVote });
});

router.post('/:id/view', optionalAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE statements SET view_count = view_count + 1 WHERE id = ? AND is_deleted = 0').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/report', authenticate, (req, res) => {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Reason required' });
  const db = getDb();
  const stmt = db.prepare('SELECT id FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });
  const existing = db.prepare('SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?').get(req.user.id, 'statement', req.params.id);
  if (existing) return res.status(400).json({ error: 'Already reported' });
  db.prepare('INSERT INTO reports (id, reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'statement', req.params.id, reason.trim());
  res.json({ ok: true });
});

module.exports = router;
