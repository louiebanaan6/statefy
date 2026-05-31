const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
const uploadsDir = process.env.UPLOADS_PATH || require('path').join(__dirname, 'public/uploads');
app.use('/uploads', require('express').static(uploadsDir));

initDatabase();

// Auto-seed on first run if no demo users exist
const { getDb } = require('./database/db');
(async () => {
  try {
    const db = getDb();
    const { count } = db.prepare("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@gen.demo'").get();
    if (count === 0) {
      console.log('No demo users found — running seed...');
      const seed = require('./scripts/seed.js');
      await seed();
    }
  } catch (e) { console.error('Auto-seed error:', e.message); }
})();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/statements', require('./routes/statements'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/search', require('./routes/search'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/spotify', require('./routes/spotify'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Statefy server running on port ${PORT} (all interfaces)`));
