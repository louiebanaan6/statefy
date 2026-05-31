const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { checkText } = require('../utils/moderation');

const router = express.Router();

function formatComment(db, comment, userId, statementCreatorId) {
  const result = { ...comment };
  result.is_creator = comment.user_id === statementCreatorId;
  result.display_name = comment.user_deleted ? '[deleted account]' : comment.display_name;
  result.username = comment.user_deleted ? 'deleted' : comment.username;

  if (userId) {
    result.user_liked = !!db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(userId, comment.id);
  } else {
    result.user_liked = false;
  }
  return result;
}

router.get('/statement/:statementId', optionalAuth, (req, res) => {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.statementId);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  const sort = req.query.sort || 'newest';
  let orderBy = 'c.created_at DESC';
  if (sort === 'liked') orderBy = 'c.like_count DESC, c.created_at DESC';

  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.is_verified, u.avatar_url, u.is_deleted as user_deleted
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.statement_id = ? AND c.parent_comment_id IS NULL AND c.is_deleted = 0
    ORDER BY ${orderBy}
  `).all(req.params.statementId);

  const replies = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.is_verified, u.avatar_url, u.is_deleted as user_deleted
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.statement_id = ? AND c.parent_comment_id IS NOT NULL AND c.is_deleted = 0
    ORDER BY c.created_at ASC
  `).all(req.params.statementId);

  const uid = req.user?.id;
  const formattedComments = comments.map(c => {
    const formatted = formatComment(db, c, uid, stmt.user_id);
    formatted.replies = replies
      .filter(r => r.parent_comment_id === c.id)
      .map(r => formatComment(db, r, uid, stmt.user_id));
    return formatted;
  });

  res.json({ comments: formattedComments });
});

router.post('/statement/:statementId', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment content is required' });
  if (content.length > 500) return res.status(400).json({ error: 'Comment must be 500 characters or less' });
  const textCheck = checkText(content.trim());
  if (!textCheck.ok) return res.status(400).json({ error: textCheck.reason });

  const db = getDb();
  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(req.params.statementId);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  const vote = db.prepare('SELECT option_chosen FROM votes WHERE user_id = ? AND statement_id = ?').get(req.user.id, req.params.statementId);
  if (!vote) return res.status(400).json({ error: 'You must vote on this statement before commenting' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO comments (id, user_id, statement_id, content, vote_option)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, req.user.id, req.params.statementId, content.trim(), vote.option_chosen);

  db.prepare('UPDATE statements SET comment_count = comment_count + 1 WHERE id = ?').run(req.params.statementId);

  if (stmt.user_id !== req.user.id) {
    db.prepare(`INSERT INTO notifications (id, user_id, actor_id, type, reference_id) VALUES (?, ?, ?, 'comment', ?)`)
      .run(uuidv4(), stmt.user_id, req.user.id, req.params.statementId);
  }

  const comment = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.is_verified, u.avatar_url, u.is_deleted as user_deleted
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(id);

  res.status(201).json({ comment: formatComment(db, comment, req.user.id, stmt.user_id) });
});

router.post('/:id/reply', authenticate, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Reply content is required' });
  if (content.length > 500) return res.status(400).json({ error: 'Reply must be 500 characters or less' });
  const textCheck = checkText(content.trim());
  if (!textCheck.ok) return res.status(400).json({ error: textCheck.reason });

  const db = getDb();
  const parent = db.prepare('SELECT * FROM comments WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Comment not found' });
  if (parent.parent_comment_id) return res.status(400).json({ error: 'Cannot reply to a reply' });

  const stmt = db.prepare('SELECT * FROM statements WHERE id = ? AND is_deleted = 0').get(parent.statement_id);
  if (!stmt) return res.status(404).json({ error: 'Statement not found' });

  const vote = db.prepare('SELECT option_chosen FROM votes WHERE user_id = ? AND statement_id = ?').get(req.user.id, parent.statement_id);
  if (!vote) return res.status(400).json({ error: 'You must vote on this statement before replying' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO comments (id, user_id, statement_id, parent_comment_id, content, vote_option)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, parent.statement_id, req.params.id, content.trim(), vote.option_chosen);

  db.prepare('UPDATE statements SET comment_count = comment_count + 1 WHERE id = ?').run(parent.statement_id);

  if (parent.user_id !== req.user.id) {
    db.prepare(`INSERT INTO notifications (id, user_id, actor_id, type, reference_id) VALUES (?, ?, ?, 'reply', ?)`)
      .run(uuidv4(), parent.user_id, req.user.id, req.params.id);
  }

  const reply = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.is_verified, u.avatar_url, u.is_deleted as user_deleted
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(id);

  res.status(201).json({ comment: formatComment(db, reply, req.user.id, stmt.user_id) });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  const stmt = db.prepare('SELECT user_id FROM statements WHERE id = ?').get(comment.statement_id);
  const isStatementOwner = stmt?.user_id === req.user.id;
  if (comment.user_id !== req.user.id && !req.user.is_admin && !isStatementOwner) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE comments SET is_deleted = 1 WHERE parent_comment_id = ?').run(req.params.id);
  db.prepare('UPDATE statements SET comment_count = MAX(0, comment_count - 1) WHERE id = ?').run(comment.statement_id);

  res.json({ message: 'Comment deleted' });
});

router.post('/:id/like', authenticate, (req, res) => {
  const db = getDb();
  const comment = db.prepare('SELECT * FROM comments WHERE id = ? AND is_deleted = 0').get(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  if (db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(req.user.id, req.params.id)) {
    return res.status(400).json({ error: 'Already liked' });
  }

  db.prepare('INSERT INTO comment_likes (id, user_id, comment_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.id);
  db.prepare('UPDATE comments SET like_count = like_count + 1 WHERE id = ?').run(req.params.id);

  if (comment.user_id !== req.user.id) {
    db.prepare(`INSERT INTO notifications (id, user_id, actor_id, type, reference_id) VALUES (?, ?, ?, 'like_comment', ?)`)
      .run(uuidv4(), comment.user_id, req.user.id, req.params.id);
  }

  const updated = db.prepare('SELECT like_count FROM comments WHERE id = ?').get(req.params.id);
  res.json({ liked: true, like_count: updated.like_count });
});

router.delete('/:id/like', authenticate, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM comment_likes WHERE user_id = ? AND comment_id = ?').get(req.user.id, req.params.id)) {
    return res.status(400).json({ error: 'Not liked' });
  }
  db.prepare('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?').run(req.user.id, req.params.id);
  db.prepare('UPDATE comments SET like_count = MAX(0, like_count - 1) WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT like_count FROM comments WHERE id = ?').get(req.params.id);
  res.json({ liked: false, like_count: updated.like_count });
});

module.exports = router;
