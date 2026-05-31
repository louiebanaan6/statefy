const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
  const q = req.query.q?.trim();
  try {
    const url = q
      ? `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=20`
      : `https://api.deezer.com/chart/0/tracks?limit=20`;
    const r = await fetch(url);
    const data = await r.json();
    const tracks = (data.data || [])
      .filter(t => t.preview)
      .map(t => ({
        id: String(t.id),
        name: t.title,
        artist: t.artist.name,
        album: t.album.title,
        albumArt: t.album.cover_medium || t.album.cover,
        previewUrl: t.preview,
      }));
    res.json({ tracks });
  } catch (e) {
    console.error('[music]', e.message);
    res.status(500).json({ error: 'Music search failed' });
  }
});

module.exports = router;
