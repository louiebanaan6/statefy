const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get active ads (public)
router.get('/', (req, res) => {
  const db = getDb();
  const ads = db.prepare('SELECT * FROM ads WHERE is_active = 1 ORDER BY created_at DESC').all();
  res.json({ ads });
});

// Admin: get all ads
router.get('/all', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  const ads = db.prepare('SELECT * FROM ads ORDER BY created_at DESC').all();
  res.json({ ads });
});

// Admin: create ad
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, description, image_url, cta_text, cta_url } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO ads (id, title, description, image_url, cta_text, cta_url) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, title.trim(), description?.trim() || null, image_url?.trim() || null, cta_text?.trim() || 'Learn More', cta_url?.trim() || null);
  res.json({ ad: db.prepare('SELECT * FROM ads WHERE id = ?').get(id) });
});

// Admin: update ad
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { title, description, image_url, cta_text, cta_url, is_active } = req.body;
  const db = getDb();
  const ad = db.prepare('SELECT * FROM ads WHERE id = ?').get(req.params.id);
  if (!ad) return res.status(404).json({ error: 'Ad not found' });
  db.prepare('UPDATE ads SET title=?, description=?, image_url=?, cta_text=?, cta_url=?, is_active=? WHERE id=?')
    .run(
      title?.trim() ?? ad.title,
      description?.trim() ?? ad.description,
      image_url?.trim() ?? ad.image_url,
      cta_text?.trim() ?? ad.cta_text,
      cta_url?.trim() ?? ad.cta_url,
      is_active !== undefined ? (is_active ? 1 : 0) : ad.is_active,
      req.params.id
    );
  res.json({ ad: db.prepare('SELECT * FROM ads WHERE id = ?').get(req.params.id) });
});

// Admin: delete ad
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM ads WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
