const leoProfanity = require('leo-profanity');

// ─── Normalisatie ────────────────────────────────────────────────────────────
// Vangt af: leet speak, symbolen, herhaalde letters, spaties/punten tussen letters
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/ph/g, 'f')
    .replace(/[@4]/g, 'a')
    .replace(/3/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/7/g, 't')
    .replace(/[*#%^&_]/g, '')           // verwijder wildcard symbolen
    .replace(/([a-z])[.\-,\s](?=[a-z])/g, '$1') // f.u.c.k → fuck
    .replace(/(.)\1{2,}/g, '$1$1');     // fuuuck → fuuck
}

// ─── Enkelvoudige woorden (worden aan leo-profanity toegevoegd) ───────────────
const EXTRA_WORDS = [
  // ── Dutch ──
  'kut','lul','hoer','slet','tering','kanker','tyfus','godverdomme','godver',
  'klootzak','eikel','teef','mongool','debiel','trut','neger','nikker',
  'flikker','neuken','neuk','kutwijf','klerelijer','tyfuslijer','reet',
  'pik','doos','kontgat','stoephoer','kankermongool','aidsmongool',
  'kutmongool','kankerlijer','tyfushoer','kankerhoer','poepchinees','fikker',
  // ── English (extra boven leo-profanity) ──
  'coon','kike','hymie','wop','dago','kraut','jap','gook','raghead',
  'sandnigger','towelhead','beaner','zipperhead','cracker','spook',
  'retard','spaz','wigger','peckerwood','redneck',
  // ── Hate / extremisme ──
  'hitler','heil','nazi','nazis','nsdap','kkk','fascist','fascism',
  'antisemitism','antisemite','judensau','judenschwein','untermenschen',
  'auschwitz','holocaust','aryan','1488','sieg','fuhrer',
  // ── French ──
  'connard','connasse','merde','putain','salope','pute','encule','batard',
  'branleur','gouine','negre','bamboula','bougnoule','raton','youpin',
  'feuj','pede','couille','niquer','foutre','chier',
  // ── German ──
  'scheiße','scheiss','ficken','arschloch','wichser','hurensohn','fotze',
  'miststuck','drecksau','kacke','pisser','nutte','schlampe','kanake',
  'turke','auslanderschwein',
  // ── Spanish ──
  'puta','puto','mierda','cono','joder','maricon','cabron','pendejo',
  'verga','chingar','culero','pinche','gilipollas','mamon','capullo',
  'mojado','sudaca',
  // ── Italian ──
  'cazzo','stronzo','troia','frocio','checca','terrone','vaffanculo',
  // ── Portuguese ──
  'porra','caralho','boceta','viado','bicha','caralho',
  // ── Russian (transliteratie) ──
  'blyad','suka','pizda','khuy','yebat','pidor','govno','blyat',
  'ebat','nahuy','pizdets','mudak','shlyukha','eblan','zalupa',
  // ── Turkish ──
  'orospu','amk','piç','ibne','gavat','sıktirgit',
  // ── Polish ──
  'kurwa','chuj','pierdolić','jebac','skurwysyn','cipa','dupek','kutas',
  // ── Arabic (transliteratie) ──
  'sharmouta','khawal','zabbi','kosomak','ibn el sharmouta',
];

leoProfanity.add(EXTRA_WORDS);

// ─── Zinnen / meerdere woorden (apart gecheckt via substring) ─────────────────
const BANNED_PHRASES = [
  'kill yourself','kys','go die','sieg heil','heil hitler','white power',
  'white supremacy','mein kampf','master race','gas the jews','14 words',
  'ku klux klan','vete a la mierda','fils de pute','hijo de puta',
  'vaffanculo','va te faire foutre','fick dich','hurensohn','pizdets',
  'amına koyayım','orospu çocuğu','ibn el sharmouta',
  'vuile hoer','smerige hoer','stoephoer','kanker op','donder op',
];

function checkText(text) {
  if (!text) return { ok: true };

  const raw = text.toLowerCase();
  const norm = normalize(text);

  // Check zinnen first
  for (const phrase of BANNED_PHRASES) {
    if (raw.includes(phrase) || norm.includes(normalize(phrase))) {
      return { ok: false, reason: 'Your message contains inappropriate language.' };
    }
  }

  // Check enkelvoudige woorden via leo-profanity (op zowel origineel als genormaliseerd)
  if (leoProfanity.check(raw) || leoProfanity.check(norm)) {
    return { ok: false, reason: 'Your message contains inappropriate language.' };
  }

  return { ok: true };
}

// ─── Afbeeldingsmoderatie (nsfwjs + tfjs + jimp — optioneel) ─────────────────
let _model = null;
let _modelReady = false;

async function loadNsfw() {
  if (_modelReady) return _model;
  try {
    require('@tensorflow/tfjs');
    const nsfwjs = require('nsfwjs');
    _model = await nsfwjs.load();
    console.log('[moderation] NSFW model geladen');
  } catch {
    _model = null;
  }
  _modelReady = true;
  return _model;
}

async function checkImage(imagePath) {
  try {
    const tf = require('@tensorflow/tfjs');
    const Jimp = require('jimp');
    const model = await loadNsfw();
    if (!model) return { ok: true };

    const img = await Jimp.read(imagePath);
    img.resize(299, 299);
    const data = new Float32Array(299 * 299 * 3);
    let i = 0;
    img.scan(0, 0, 299, 299, function (x, y, idx) {
      data[i++] = this.bitmap.data[idx] / 255;
      data[i++] = this.bitmap.data[idx + 1] / 255;
      data[i++] = this.bitmap.data[idx + 2] / 255;
    });
    const tensor = tf.tensor4d(data, [1, 299, 299, 3]);
    const predictions = await model.classify(tensor);
    tensor.dispose();

    const badProb = predictions
      .filter(p => ['Porn', 'Hentai'].includes(p.className))
      .reduce((s, p) => s + p.probability, 0);

    if (badProb > 0.60) {
      return { ok: false, reason: 'This image contains inappropriate content.' };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

module.exports = { checkText, checkImage };
