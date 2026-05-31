const { getDb, initDatabase } = require('../database/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const FIRST = ['Alex','Jordan','Morgan','Taylor','Riley','Casey','Cameron','Drew','Jamie','Quinn','Avery','Blake','Charlie','Dakota','Elliot','Finley','Gray','Harper','Jesse','Kendall','Lane','Marley','Noel','Parker','Reece','Sage','Tatum','Val','Waverly','Zara','Aaron','Bella','Chris','Diana','Ethan','Fiona','George','Hannah','Ivan','Julia','Kevin','Laura','Marcus','Nina','Oscar','Petra','Ryan','Sofia','Tom','Uma','Victor','Wendy','Xander','Yara','Zoe','Liam','Emma','Noah','Olivia','Lucas','Mia','Aiden','Isabella','Mason','Ava'];
const LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker','Hall','Rivera','Campbell','Mitchell','Carter','Roberts','Phillips','Evans','Turner','Parker','Collins','Edwards','Stewart','Morris','Rogers','Reed','Cook','Bell','Ward','Hughes','Price','Diaz','Foster','Simmons','Russell','Griffin','Ramirez','Butler','Cox'];

const BIOS = [
  'Just here to share hot takes.','Opinions are free, yours are wrong.',
  'Professional overthinker.','I argue for sport.','Coffee addict and contrarian.',
  'Living life, forming opinions.','Not all heroes wear capes.','Asking the real questions.',
  'Tech nerd. Debate enthusiast.','Climate advocate and proud.','Gamer, student, human.',
  'Reading books you haven\'t heard of.','Music is life.','Foodie and amateur chef.',
  'Athlete by day, thinker by night.','Just a vibe.','Minimalist with maximum opinions.',
  'Philosophy student. Everything is questionable.','Sports analyst at heart.',
  'Building the future one take at a time.','Art lover. Film critic.',
  'Politics junky. Always learning.','Fitness coach. Straight talker.',
  'Entrepreneur. Relentlessly curious.','Night owl. Deep thoughts at 3am.',
  null, null, null, null, null,
];

const AVATARS = Array.from({length: 70}, (_, i) => `https://i.pravatar.cc/300?img=${i+1}`);
AVATARS.push(...Array(30).fill(null));

const STATEMENTS = [
  ["Social media has done more harm than good to society.","Agree","Disagree"],
  ["Artificial intelligence will replace most jobs within 10 years.","Agree","Disagree"],
  ["Smartphones have made us less social.","True","False"],
  ["TikTok should be banned globally.","Ban it","Keep it"],
  ["Remote work is more productive than office work.","More productive","Less productive"],
  ["Electric cars are the future of transport.","Agree","Disagree"],
  ["Crypto will replace traditional currency.","Agree","Disagree"],
  ["AI-generated art is real art.","It is","It isn't"],
  ["Privacy is more important than convenience.","Privacy","Convenience"],
  ["Social media influencers deserve their income.","Yes","No"],
  ["Technology makes us lazier.","Agree","Disagree"],
  ["Streaming killed the music industry.","Agree","Disagree"],
  ["Video games are a valid career path.","Yes","No"],
  ["Pineapple belongs on pizza.","Yes","No"],
  ["Breakfast is the most important meal of the day.","Agree","Disagree"],
  ["Veganism is the most ethical diet.","Agree","Disagree"],
  ["Fast food should be taxed higher.","Yes","No"],
  ["Coffee is better than tea.","Coffee","Tea"],
  ["Eating meat is ethically wrong.","Agree","Disagree"],
  ["Universal basic income should be implemented.","For it","Against it"],
  ["The voting age should be lowered to 16.","Yes","No"],
  ["Billionaires should not exist.","Agree","Disagree"],
  ["Celebrities should stay out of politics.","Yes","No"],
  ["Climate change is the biggest threat to humanity.","Agree","Disagree"],
  ["The news media is mostly biased.","Yes","No"],
  ["Cancel culture has gone too far.","Yes","No"],
  ["Homework should be abolished.","Abolish it","Keep it"],
  ["Zoos are ethical.","Ethical","Not ethical"],
  ["The death penalty is ever justified.","Yes","Never"],
  ["Age gaps in relationships are always problematic.","Agree","Disagree"],
  ["Long distance relationships never work.","True","False"],
  ["Social media ruins relationships.","Agree","Disagree"],
  ["Friendship is more important than romantic love.","Agree","Disagree"],
  ["You should always tell the truth no matter what.","Always","Sometimes lie"],
  ["Money is the root of all evil.","Agree","Disagree"],
  ["You can be friends with your ex.","Yes","No"],
  ["Online friendships are just as real as offline ones.","Agree","Disagree"],
  ["Mental health days should be mandatory.","Yes","No"],
  ["Everyone should meditate daily.","Agree","Disagree"],
  ["Running is the best form of exercise.","Yes","No"],
  ["Sleep is more important than diet.","Sleep","Diet"],
  ["Gym culture is toxic.","Agree","Disagree"],
  ["Everyone should see a therapist.","Agree","Disagree"],
  ["Cold showers are better than hot showers.","Cold","Hot"],
  ["Marvel movies are overrated.","Overrated","Deserved"],
  ["Music was better in the 90s.","Better then","Better now"],
  ["Reading books is better than watching TV.","Books","TV"],
  ["Video games are more creative than movies.","Agree","Disagree"],
  ["Remakes are never as good as the original.","Never","Sometimes"],
  ["Podcasts are better than radio.","Podcasts","Radio"],
  ["Anime is legitimate cinema.","Yes","No"],
  ["Football is the greatest sport ever.","Agree","Disagree"],
  ["Athletes are overpaid.","Overpaid","Fair pay"],
  ["Esports deserve Olympic inclusion.","Yes","No"],
  ["Sports are too commercialized.","Agree","Disagree"],
  ["University degrees are becoming worthless.","Agree","Disagree"],
  ["A 4-day work week should be standard.","Yes","No"],
  ["Grades don't measure intelligence.","Agree","Disagree"],
  ["Entrepreneurship is riskier than having a job.","Riskier","Safer"],
  ["Learning to code should be mandatory in school.","Yes","No"],
  ["Student loans should be forgiven.","Yes","No"],
  ["The school system is outdated.","Agree","Disagree"],
  ["Passion matters more than salary when choosing a job.","Passion","Salary"],
  ["Life has no inherent meaning.","Agree","Disagree"],
  ["Free will is an illusion.","Illusion","It's real"],
  ["Happiness is a choice.","Agree","Disagree"],
  ["Humans are fundamentally selfish.","Agree","Disagree"],
  ["Time is the most valuable resource.","Yes","No"],
  ["Failure is more educational than success.","Agree","Disagree"],
  ["The world is getting better overall.","Getting better","Getting worse"],
  ["Cats are better than dogs.","Cats","Dogs"],
  ["Money can buy happiness.","Yes","No"],
  ["City life is better than rural life.","City","Rural"],
  ["Travel changes your perspective on life.","Agree","Disagree"],
  ["Tattoos affect job prospects unfairly.","Agree","Disagree"],
  ["Networking is more important than talent.","Networking","Talent"],
  ["Second chances should always be given.","Always","Not always"],
  ["Humor is the best coping mechanism.","Agree","Disagree"],
  ["People are too sensitive nowadays.","Yes","No"],
  ["Your 20s are the best years of your life.","Agree","Disagree"],
  ["Violence in video games makes people more violent.","True","False"],
  ["Democracy is the best form of government.","Best","Not best"],
  ["Love at first sight is real.","Real","Not real"],
  ["Everything happens for a reason.","Agree","Disagree"],
  ["The internet has made people smarter.","Smarter","Dumber"],
  ["Beauty standards are harmful.","Harmful","Just standards"],
  ["Social media should have age verification.","Yes","No"],
  ["Music is the universal language.","Agree","Disagree"],
  ["Online dating has improved relationships.","Yes","No"],
  ["School uniforms suppress individuality.","Agree","Disagree"],
  ["Self-care is not selfish.","Agree","Disagree"],
  ["Boredom is necessary for creativity.","Yes","No"],
  ["Everyone deserves a basic level of respect.","Always","Must be earned"],
  ["Courage is the most important virtue.","Yes","No"],
  ["Nature is more powerful than nurture.","Nature","Nurture"],
  ["Living in the moment beats planning for the future.","Agree","Disagree"],
  ["Forgiveness is for yourself not the other person.","Yes","No"],
  ["Being busy is not the same as being productive.","Agree","Disagree"],
  ["Competition brings out the best in people.","Yes","No"],
  ["Growth requires discomfort.","Always","Not always"],
  ["We are all just pretending to know what we're doing.","True","False"],
  ["Most people are fundamentally good.","Agree","Disagree"],
  ["Perfection is the enemy of good.","Agree","Disagree"],
  ["Luck plays a bigger role in success than we admit.","Agree","Disagree"],
  ["The best ideas come in the shower.","True","False"],
  ["Introversion is misunderstood as shyness.","Agree","Disagree"],
  ["Dreams reveal our true desires.","Agree","Disagree"],
  ["Words are more powerful than actions.","Words","Actions"],
  ["Regret is a waste of time.","Agree","Disagree"],
  ["Common sense is not so common.","True","False"],
  ["Books are better than their movie adaptations.","Books","Movies"],
  ["Society places too much value on youth.","Agree","Disagree"],
  ["Confidence is built through action not thought.","Agree","Disagree"],
  ["Traditions hold society back.","Yes","No"],
  ["Silence is underrated.","Agree","Disagree"],
  ["First impressions are always accurate.","Always","Not always"],
  ["Procrastination can be productive.","Sometimes","Never"],
  ["Climate activists go too far.","Yes","No"],
  ["Open relationships can work long term.","Yes","No"],
  ["Hard work beats talent when talent doesn't work hard.","Agree","Disagree"],
  ["Social media fame is meaningless.","Meaningless","Has value"],
  ["Opinions should always be backed by facts.","Yes","No"],
  ["History repeats itself.","Always","Not always"],
  ["Art should provoke discomfort.","Yes","No"],
  ["Being multilingual makes you more intelligent.","Agree","Disagree"],
  ["Rules are meant to be broken.","Sometimes","Never"],
  ["Ambition is always a good thing.","Yes","No"],
  ["It's never too late to change.","Agree","Disagree"],
  ["Conspiracy theories reveal real truths.","Sometimes","Never"],
  ["Social pressure makes us worse people.","Agree","Disagree"],
  ["Kindness without limits becomes weakness.","Agree","Disagree"],
  ["People who talk less know more.","Agree","Disagree"],
  ["Fear of death is irrational.","Irrational","Rational"],
  ["Loyalty is the most important quality in a friend.","Agree","Disagree"],
  ["You should follow your heart not your head.","Heart","Head"],
  ["The present is all that matters.","Agree","Disagree"],
  ["Space exploration is a waste of money.","Waste","Worth it"],
  ["Drug use should be fully decriminalized.","Yes","No"],
  ["Religion does more good than harm.","Agree","Disagree"],
  ["Prisons should focus on rehabilitation not punishment.","Rehabilitation","Punishment"],
  ["The metaverse will change how we live.","Agree","Disagree"],
  ["5G networks are completely safe.","Safe","Not sure"],
  ["Meal prepping is worth the effort.","Absolutely","Not for me"],
  ["Summer is the best season.","Yes","No"],
  ["Morning people are more successful.","Agree","Disagree"],
  ["Minimalism improves mental health.","Agree","Disagree"],
  ["Intermittent fasting actually works.","It works","It doesn't"],
  ["Walking is underrated as exercise.","Agree","Disagree"],
  ["Reality TV is a guilty pleasure everyone has.","True","False"],
  ["Stand-up comedy is the hardest art form.","Agree","Disagree"],
  ["Home advantage makes a big difference in sports.","Big difference","Small difference"],
  ["Sports build character.","Yes","No"],
  ["Doping should be legalized in sports.","Legalize it","Keep ban"],
  ["Gap years are beneficial.","Yes","No"],
  ["Working from home will outlast the pandemic.","Yes","No"],
  ["Children should learn a second language from birth.","Yes","No"],
  ["Parents should be held responsible for their kids' behavior.","Yes","No"],
  ["Social hierarchies are natural and unavoidable.","Natural","Avoidable"],
  ["Charity begins at home.","Agree","Disagree"],
  ["You are the product of your environment.","Agree","Disagree"],
  ["Equality of outcome is impossible.","Agree","Disagree"],
  ["You can be too kind.","Yes","No"],
  ["Overthinking is a form of intelligence.","Agree","Disagree"],
  ["Children are wiser than adults give them credit for.","Agree","Disagree"],
  ["Society benefits more from artists than scientists.","Artists","Scientists"],
  ["Everyone is creative in their own way.","Yes","No"],
  ["The most dangerous phrase is we have always done it this way.","Agree","Disagree"],
  ["Childhood shapes who we are more than anything else.","Agree","Disagree"],
  ["Jealousy is always a red flag.","Yes","No"],
  ["Introversion is a superpower.","Agree","Disagree"],
];

const COMMENTS = [
  "Completely agree with this.","I've been saying this for years!",
  "This is more nuanced than it seems.","Hot take but I'm here for it.",
  "Can't disagree with the logic here.","This is exactly what's wrong.",
  "Change my mind but I think you're wrong.","The data backs this up.",
  "People sleep on this point.","This hits different.",
  "There's a lot more to unpack here.","Solid point.",
  "I used to think the opposite.","This made me think.",
  "100% this. No debate needed.","Strong disagree but respect it.",
  "Finally someone said it.","The other side has a point though.",
  "This is factually incorrect.","Interesting perspective.",
  "I see both sides honestly.","This is the hill I will die on.",
  "Nuance is key here.","Oversimplified but directionally correct.",
  "Exactly what I needed to read.","Bold claim. Back it up.",
  "The truth is somewhere in the middle.","Facts don't care about feelings.",
  "This is subjective at best.","Finally some common sense.",
  "I respectfully disagree.","Could not agree more.",
  "This is going to be controversial.","Unpopular opinion but valid.",
  "Not everything is black and white.","This aged well.",
  "We need to talk about this more.","Society isn't ready for this truth.",
  "My professor literally said this yesterday.","Imagine disagreeing with this.",
  "The silent majority agrees.","Brave of you to post this.",
  "This deserves more attention.","Said what we were all thinking.",
  "Absolutely not. Hard pass.","You might be onto something.",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function daysAgo(n, baseDate) {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setTime(d.getTime() - n * 86400000 + randInt(0, 86400000 - 1));
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

async function main() {
  initDatabase();
  const db = getDb();

  const { count } = db.prepare("SELECT COUNT(*) as count FROM users WHERE email LIKE '%@gen.demo'").get();
  if (count > 0) { console.log('Already seeded.'); return; }

  // ─── Fetch Deezer tracks ─────────────────────────────────────────────────────
  console.log('Fetching Deezer tracks...');
  let tracks = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch('https://api.deezer.com/chart/0/tracks?limit=50', { signal: controller.signal });
    clearTimeout(timeout);
    const d = await r.json();
    tracks = (d.data || []).filter(t => t.preview).map(t => ({
      url: t.preview, title: `${t.title} — ${t.artist.name}`
    }));
    console.log(`Got ${tracks.length} tracks`);
  } catch { console.log('Deezer unavailable, skipping music'); }

  const pw = bcrypt.hashSync('8fq51fsq81q6sfqs518fzq18b816sqnh7d5sfq86s', 10);
  const usedNames = new Set();

  function genUser(tier) {
    let first, last, attempt = 0;
    do {
      first = rand(FIRST); last = rand(LAST); attempt++;
    } while (usedNames.has(`${first}${last}`) && attempt < 200);
    usedNames.add(`${first}${last}`);
    const num = randInt(1, 999);
    const username = `${first.toLowerCase()}${last.toLowerCase()}${num}`;
    const display = `${first} ${last}`;
    const email = `${username}@gen.demo`;
    const avatar = Math.random() < 0.65 ? AVATARS[randInt(0, AVATARS.length - 1)] : null;
    const bio = rand(BIOS);
    const verified = tier <= 1 ? 1 : tier <= 2 ? (Math.random() < 0.4 ? 1 : 0) : 0;

    // Follower counts by tier
    let followerCount;
    if (tier === 0) followerCount = randInt(50000, 500000);      // mega celebrity
    else if (tier === 1) followerCount = randInt(10000, 49999);  // popular
    else if (tier === 2) followerCount = randInt(1000, 9999);    // known
    else if (tier === 3) followerCount = randInt(100, 999);      // active
    else if (tier === 4) followerCount = randInt(10, 99);        // regular
    else followerCount = randInt(0, 9);                          // lurker

    return { username, display, email, avatar, bio, verified, followerCount };
  }

  // ─── Build 800 users ────────────────────────────────────────────────────────
  console.log('Creating 800 users...');
  const tiers = [
    { tier: 0, count: 5 },    // mega
    { tier: 1, count: 15 },   // popular
    { tier: 2, count: 30 },   // known
    { tier: 3, count: 100 },  // active
    { tier: 4, count: 200 },  // regular
    { tier: 5, count: 450 },  // lurkers (no/few statements)
  ];

  const allUsers = [];
  for (const { tier, count } of tiers) {
    for (let i = 0; i < count; i++) {
      allUsers.push({ ...genUser(tier), tier });
    }
  }

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, username, display_name, password_hash, bio, avatar_url, is_verified, follower_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const userIds = [];
  const userTiers = [];
  const userCreatedAt = [];

  db.transaction(() => {
    allUsers.forEach((u, i) => {
      const id = uuidv4();
      const createdAt = daysAgo(randInt(30, 365));
      insertUser.run(id, u.email, u.username, u.display, pw, u.bio || '', u.avatar, u.verified, u.followerCount, createdAt);
      userIds.push(id);
      userTiers.push(u.tier);
      userCreatedAt.push(createdAt);
    });
  })();
  console.log(`Created ${userIds.length} users`);

  // ─── Real follow relationships (subset — actual DB rows) ─────────────────────
  console.log('Creating follow relationships...');
  const insertFollow = db.prepare(`INSERT OR IGNORE INTO follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)`);
  const incFollowing = db.prepare(`UPDATE users SET following_count = following_count + 1 WHERE id = ?`);

  db.transaction(() => {
    userIds.forEach((uid, i) => {
      // Each user follows some others (more for tier 3-5 following tier 0-2)
      const numFollowing = randInt(2, 30);
      const targets = shuffle(userIds.filter((_, j) => j !== i && userTiers[j] <= 3)).slice(0, numFollowing);
      targets.forEach(tid => {
        insertFollow.run(uuidv4(), uid, tid, daysAgo(randInt(1, 90)));
        incFollowing.run(uid);
      });
    });
  })();

  // ─── Create ~7000 statements ─────────────────────────────────────────────────
  console.log('Creating statements...');
  const stmtsPerTier = [250, 120, 60, 20, 8, 0]; // avg per user per tier
  // tier 5 (450 users) → ~30% get 1-3 statements, rest 0

  const insertStmt = db.prepare(`
    INSERT INTO statements (id, user_id, content, option_a, option_b, photo_url, audio_url, audio_title, view_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stmtIds = [];
  const stmtUserIdx = [];
  const stmtDates = [];

  db.transaction(() => {
    userIds.forEach((uid, ui) => {
      const tier = userTiers[ui];
      let numPosts;
      if (tier === 0) numPosts = randInt(200, 350);
      else if (tier === 1) numPosts = randInt(80, 150);
      else if (tier === 2) numPosts = randInt(30, 70);
      else if (tier === 3) numPosts = randInt(10, 30);
      else if (tier === 4) numPosts = randInt(1, 10);
      else numPosts = Math.random() < 0.25 ? randInt(1, 3) : 0; // 75% of lurkers post nothing

      for (let j = 0; j < numPosts; j++) {
        const [content, optA, optB] = STATEMENTS[Math.floor(Math.random() * STATEMENTS.length)];
        const sid = uuidv4();
        const hasPhoto = Math.random() < 0.35;
        const hasMusic = Math.random() < 0.25 && tracks.length > 0;
        const photo = hasPhoto ? `https://picsum.photos/seed/${sid.slice(0,8)}/600/400` : null;
        const track = hasMusic ? tracks[Math.floor(Math.random() * tracks.length)] : null;
        const createdAt = daysAgo(randInt(0, 120));
        insertStmt.run(sid, uid, content, optA, optB, photo, track?.url || null, track?.title || null, 0, createdAt);
        stmtIds.push(sid);
        stmtUserIdx.push(ui);
        stmtDates.push(new Date(createdAt.replace(' ', 'T') + 'Z'));
      }
    });
  })();
  console.log(`Created ${stmtIds.length} statements`);

  // ─── Votes ────────────────────────────────────────────────────────────────────
  console.log('Adding votes...');
  const insertVote = db.prepare(`INSERT OR IGNORE INTO votes (id, user_id, statement_id, option_chosen, created_at) VALUES (?, ?, ?, ?, ?)`);
  const incVote = db.prepare(`UPDATE statements SET vote_count = vote_count + 1 WHERE id = ?`);
  const getOpts = db.prepare(`SELECT option_a, option_b FROM statements WHERE id = ?`);

  // Process in chunks to avoid huge transactions
  const CHUNK = 500;
  for (let start = 0; start < stmtIds.length; start += CHUNK) {
    const chunk = stmtIds.slice(start, start + CHUNK);
    db.transaction(() => {
      chunk.forEach((sid, ci) => {
        const ui = stmtUserIdx[start + ci];
        const tier = userTiers[ui];
        const maxVoters = tier === 0 ? randInt(50, 200) : tier === 1 ? randInt(20, 80) : tier <= 3 ? randInt(5, 30) : randInt(1, 10);
        const voters = shuffle(userIds.filter((_, j) => j !== ui)).slice(0, Math.min(maxVoters, userIds.length - 1));
        const { option_a, option_b } = getOpts.get(sid);
        const stmtDate = stmtDates[start + ci];
        voters.forEach(vid => {
          const opt = Math.random() < 0.58 ? option_a : option_b;
          const voteDate = daysAgo(0, new Date(Math.max(stmtDate.getTime(), Date.now() - randInt(0, 30) * 86400000)));
          insertVote.run(uuidv4(), vid, sid, opt, voteDate.replace(' ','T').slice(0,19).replace('T',' '));
          incVote.run(sid);
        });
      });
    })();
    if (start % 2000 === 0) console.log(`  votes: ${start}/${stmtIds.length}`);
  }

  // ─── Likes ────────────────────────────────────────────────────────────────────
  console.log('Adding likes...');
  const insertLike = db.prepare(`INSERT OR IGNORE INTO likes (id, user_id, statement_id, created_at) VALUES (?, ?, ?, ?)`);
  const incLike = db.prepare(`UPDATE statements SET like_count = like_count + 1 WHERE id = ?`);

  for (let start = 0; start < stmtIds.length; start += CHUNK) {
    const chunk = stmtIds.slice(start, start + CHUNK);
    db.transaction(() => {
      chunk.forEach((sid, ci) => {
        const ui = stmtUserIdx[start + ci];
        const tier = userTiers[ui];
        const maxLikes = tier === 0 ? randInt(30, 150) : tier <= 2 ? randInt(5, 50) : randInt(0, 15);
        const likers = shuffle(userIds).slice(0, maxLikes);
        likers.forEach(vid => {
          insertLike.run(uuidv4(), vid, sid, daysAgo(randInt(0, 30)));
          incLike.run(sid);
        });
      });
    })();
    if (start % 2000 === 0) console.log(`  likes: ${start}/${stmtIds.length}`);
  }

  // Comments intentionally not generated — fake users only vote, they don't comment

  // ─── Recalculate view counts proportional to actual engagement ───────────────
  console.log('Recalculating view counts...');
  const stmtsForViews = db.prepare('SELECT id, vote_count, like_count, comment_count FROM statements').all();
  const updateViews = db.prepare('UPDATE statements SET view_count = ? WHERE id = ?');
  db.transaction(() => {
    stmtsForViews.forEach(stmt => {
      const engagement = stmt.vote_count + stmt.like_count + stmt.comment_count;
      let views;
      if (engagement === 0) {
        views = randInt(1, 25);
      } else {
        const rate = 0.04 + Math.random() * 0.12; // 4–16% engagement rate
        views = Math.max(engagement + 1, Math.round(engagement / rate));
      }
      updateViews.run(views, stmt.id);
    });
  })();

  console.log('\n✅ Done!');
  console.log(`Users: 800 | Statements: ${stmtIds.length}`);
  console.log('Password for all demo accounts: 8fq51fsq81q6sfqs518fzq18b816sqnh7d5sfq86s');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
