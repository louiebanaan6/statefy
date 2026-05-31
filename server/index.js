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

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/statements', require('./routes/statements'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/search', require('./routes/search'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/spotify', require('./routes/spotify'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Statefy server running on port ${PORT} (all interfaces)`));
