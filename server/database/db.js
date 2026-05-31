const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../statefy.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      username_changed_at TEXT,
      display_name_changed_at TEXT,
      is_verified INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      follower_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS statements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      option_a TEXT DEFAULT 'Agree',
      option_b TEXT DEFAULT 'Disagree',
      custom_options TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      view_count INTEGER DEFAULT 0,
      like_count INTEGER DEFAULT 0,
      vote_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      photo_url TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      statement_id TEXT NOT NULL,
      option_chosen TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, statement_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (statement_id) REFERENCES statements(id)
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      statement_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, statement_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (statement_id) REFERENCES statements(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      statement_id TEXT NOT NULL,
      parent_comment_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      like_count INTEGER DEFAULT 0,
      vote_option TEXT,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (statement_id) REFERENCES statements(id),
      FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, comment_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (comment_id) REFERENCES comments(id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id),
      FOREIGN KEY (following_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (actor_id) REFERENCES users(id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations for existing databases
  try { db.exec('ALTER TABLE statements ADD COLUMN photo_url TEXT'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 1'); } catch {}

  // Remove auto-generated comments from seeded demo users
  try {
    db.exec(`
      UPDATE statements SET comment_count = MAX(0, comment_count - (
        SELECT COUNT(*) FROM comments c JOIN users u ON c.user_id = u.id
        WHERE c.statement_id = statements.id AND u.email LIKE '%@gen.demo' AND c.is_deleted = 0
      ))
    `);
    db.exec(`UPDATE comments SET is_deleted = 1 WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@gen.demo')`);
  } catch {}

  // Anonymize existing deleted accounts so email + username become reusable
  try {
    const deleted = db.prepare("SELECT id FROM users WHERE is_deleted = 1 AND email NOT LIKE 'deleted_%@deleted'").all();
    const anon = db.prepare("UPDATE users SET email = ?, username = ? WHERE id = ?");
    for (const u of deleted) {
      anon.run(`deleted_${u.id}@deleted`, `deleted_${u.id.slice(0, 12)}`, u.id);
    }
  } catch {}
  try { db.exec('ALTER TABLE statements ADD COLUMN audio_url TEXT'); } catch {}
  try { db.exec('ALTER TABLE statements ADD COLUMN audio_title TEXT'); } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS seen_statements (
    user_id TEXT NOT NULL,
    statement_id TEXT NOT NULL,
    seen_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, statement_id)
  )`); } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS ads (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    cta_text TEXT DEFAULT 'Learn More',
    cta_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`); } catch {}
  try { db.exec(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(reporter_id, target_type, target_id),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
  )`); } catch {}

  // seedData disabled — users register themselves; louie.oorts@gmail.com auto-gets admin via auth route
  return db;
}

function seedData(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  console.log('Seeding database...');

  const adminId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, username, display_name, password_hash, is_verified, is_admin)
    VALUES (?, ?, ?, ?, ?, 1, 1)
  `).run(adminId, 'louie.oorts@gmail.com', 'louie', 'Louie', bcrypt.hashSync('Admin1234!', 10));

  const u2 = uuidv4(), u3 = uuidv4(), u4 = uuidv4();

  db.prepare(`INSERT INTO users (id, email, username, display_name, password_hash, bio) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(u2, 'alex@example.com', 'alex', 'Alex Johnson', bcrypt.hashSync('password123', 10), 'Software engineer and tech enthusiast');

  db.prepare(`INSERT INTO users (id, email, username, display_name, password_hash, bio) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(u3, 'sarah@example.com', 'sarah', 'Sarah Chen', bcrypt.hashSync('password123', 10), 'Writer and philosopher');

  db.prepare(`INSERT INTO users (id, email, username, display_name, password_hash, bio) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(u4, 'mike@example.com', 'mike', 'Mike Davis', bcrypt.hashSync('password123', 10), 'Just here to debate');

  const s1 = uuidv4(), s2 = uuidv4(), s3 = uuidv4(), s4 = uuidv4();

  db.prepare(`INSERT INTO statements (id, user_id, content, view_count, like_count) VALUES (?, ?, ?, ?, ?)`)
    .run(s1, adminId, 'Social media has done more harm than good to society.', 142, 0);

  db.prepare(`INSERT INTO statements (id, user_id, content, option_a, option_b, view_count) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(s2, u2, 'Remote work is more productive than working from the office.', 'More productive', 'Less productive', 89);

  db.prepare(`INSERT INTO statements (id, user_id, content, view_count) VALUES (?, ?, ?, ?)`)
    .run(s3, u3, 'Pineapple belongs on pizza.', 234);

  db.prepare(`INSERT INTO statements (id, user_id, content, view_count) VALUES (?, ?, ?, ?)`)
    .run(s4, u4, 'Artificial intelligence will replace most jobs within 10 years.', 178);

  const voteData = [
    [u2, s1, 'Agree'], [u3, s1, 'Agree'], [u4, s1, 'Disagree'],
    [adminId, s2, 'More productive'], [u3, s2, 'More productive'], [u4, s2, 'Less productive'],
    [adminId, s3, 'Agree'], [u2, s3, 'Disagree'], [u3, s3, 'Agree'], [u4, s3, 'Agree'],
    [adminId, s4, 'Agree'], [u2, s4, 'Agree'], [u3, s4, 'Disagree'],
  ];

  const addVote = db.prepare(`INSERT INTO votes (id, user_id, statement_id, option_chosen) VALUES (?, ?, ?, ?)`);
  const incVote = db.prepare(`UPDATE statements SET vote_count = vote_count + 1 WHERE id = ?`);
  voteData.forEach(([uid, sid, opt]) => { addVote.run(uuidv4(), uid, sid, opt); incVote.run(sid); });

  const likeData = [[u2, s1], [u3, s1], [adminId, s2], [u4, s2], [u2, s3], [u4, s3], [u3, s4], [u2, s4]];
  const addLike = db.prepare(`INSERT INTO likes (id, user_id, statement_id) VALUES (?, ?, ?)`);
  const incLike = db.prepare(`UPDATE statements SET like_count = like_count + 1 WHERE id = ?`);
  likeData.forEach(([uid, sid]) => { addLike.run(uuidv4(), uid, sid); incLike.run(sid); });

  const c1 = uuidv4(), c2 = uuidv4(), c3 = uuidv4(), c4 = uuidv4();
  const addComment = db.prepare(`INSERT INTO comments (id, user_id, statement_id, content, vote_option) VALUES (?, ?, ?, ?, ?)`);
  const incComment = db.prepare(`UPDATE statements SET comment_count = comment_count + 1 WHERE id = ?`);

  addComment.run(c1, u2, s1, 'The way it creates echo chambers is particularly damaging. We only see what reinforces our existing beliefs.', 'Agree');
  incComment.run(s1);
  addComment.run(c2, u4, s1, "It depends on how you use it. Social media has also enabled amazing grassroots movements.", 'Disagree');
  incComment.run(s1);
  addComment.run(c3, u3, s2, "I've been way more productive working from home. No commute, fewer interruptions.", 'More productive');
  incComment.run(s2);
  addComment.run(c4, adminId, s3, 'The sweetness of pineapple perfectly balances the saltiness of the ham. Change my mind.', 'Agree');
  incComment.run(s3);

  // A reply
  const r1 = uuidv4();
  db.prepare(`INSERT INTO comments (id, user_id, statement_id, parent_comment_id, content, vote_option) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(r1, u2, s3, c4, 'Hard disagree. The moisture ruins the pizza.', 'Disagree');
  incComment.run(s3);

  console.log('Database seeded!');
}

module.exports = { getDb, initDatabase };
