const { getDb, initDatabase } = require('../database/db');
const bcrypt = require('bcryptjs');

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  initDatabase();
  const db = getDb();

  // 1. Update all @gen.demo user passwords
  const newPw = '8fq51fsq81q6sfqs518fzq18b816sqnh7d5sfq86s';
  console.log('Hashing new password...');
  const newHash = bcrypt.hashSync(newPw, 10);
  const result = db.prepare("UPDATE users SET password_hash = ? WHERE email LIKE '%@gen.demo'").run(newHash);
  console.log(`Updated passwords for ${result.changes} demo users`);

  // 2. Fix view counts — recalculate based on actual engagement (votes + likes + comments)
  //    Realistic engagement rate: 4–16% of viewers interact
  console.log('Recalculating view counts...');
  const stmts = db.prepare('SELECT id, vote_count, like_count, comment_count FROM statements WHERE is_deleted = 0').all();
  const updateViews = db.prepare('UPDATE statements SET view_count = ? WHERE id = ?');

  db.transaction(() => {
    stmts.forEach(stmt => {
      const engagement = stmt.vote_count + stmt.like_count + stmt.comment_count;
      let views;
      if (engagement === 0) {
        views = randInt(1, 25);
      } else {
        const rate = 0.04 + Math.random() * 0.12; // 4–16%
        views = Math.max(engagement + 1, Math.round(engagement / rate));
      }
      updateViews.run(views, stmt.id);
    });
  })();

  console.log(`Fixed view counts for ${stmts.length} statements`);
  console.log('\nDone!');
}

main().catch(console.error);
