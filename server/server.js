/* eslint-disable no-console */
const crypto = require('node:crypto');
const http = require('node:http');
const { readFileSync } = require('node:fs');
const { modules } = require('../server/seed-modules.cjs');

const PORT = Number(process.env.PORT || 10000);
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.warn('TURSO_DATABASE_URL oder TURSO_AUTH_TOKEN fehlt. Datenbankrouten werden fehlschlagen.');
}

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function encodeArg(value) {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') return Number.isInteger(value) ? { type: 'integer', value: String(value) } : { type: 'float', value };
  return { type: 'text', value: String(value) };
}

function decodeValue(value) {
  if (!value || value.type === 'null') return null;
  if (value.type === 'integer') return Number(value.value);
  return value.value;
}

async function db(sql, args = []) {
  const response = await fetch(`${TURSO_DATABASE_URL.replace(/\/$/, '')}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TURSO_AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(encodeArg) } }, { type: 'close' }] }),
  });
  const payload = await response.json();
  if (!response.ok || payload?.results?.[0]?.type === 'error') {
    throw new Error(payload?.results?.[0]?.error?.message || payload?.message || 'Turso query failed');
  }
  const result = payload.results[0].response?.result;
  const columns = result?.cols?.map((c) => c.name) || [];
  return (result?.rows || []).map((row) => Object.fromEntries(row.map((cell, i) => [columns[i], decodeValue(cell)])));
}

async function migrate() {
  const sql = readFileSync(new URL('./schema.sql', `file://${__dirname}/`), 'utf8')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of sql) await db(statement);
}

async function seed() {
  for (const [index, module] of modules.entries()) {
    await db(`INSERT OR REPLACE INTO learning_modules (id,title,description,icon,content,min_level,sort_order,is_published,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`, [module.id, module.title, module.description, module.icon, module.content, module.minLevel, index, 1]);
    for (const [gIndex, item] of module.glossary.entries()) {
      await db(`INSERT OR REPLACE INTO module_glossary_items (id,module_id,term,definition,sort_order) VALUES (?,?,?,?,?)`, [`${module.id}-g-${gIndex}`, module.id, item.term, item.definition, gIndex]);
    }
    for (const [qIndex, question] of module.quiz.entries()) {
      await db(`INSERT OR REPLACE INTO module_quiz_questions (id,module_id,question,options_json,correct_index,explanation,image_url,sort_order) VALUES (?,?,?,?,?,?,?,?)`, [question.id, module.id, question.question, JSON.stringify(question.options), question.correctIndex, question.explanation, question.imageUrl || null, qIndex]);
    }
  }
}

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

function verifyToken(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [header, payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (!sig || sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  return parsed.exp > Date.now() / 1000 ? parsed : null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => e ? reject(e) : resolve(key.toString('hex'))));
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (e, key) => e ? reject(e) : resolve(key.toString('hex'))));
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate));
}

async function getModules(moduleId) {
  const where = moduleId ? 'WHERE m.id = ? AND m.is_published = 1' : 'WHERE m.is_published = 1';
  const rows = await db(`SELECT m.*, g.id glossary_id, g.term, g.definition, q.id quiz_id, q.question, q.options_json, q.correct_index, q.explanation, q.image_url FROM learning_modules m LEFT JOIN module_glossary_items g ON g.module_id=m.id LEFT JOIN module_quiz_questions q ON q.module_id=m.id ${where} ORDER BY m.sort_order, g.sort_order, q.sort_order`, moduleId ? [moduleId] : []);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) map.set(row.id, { id: row.id, title: row.title, description: row.description, icon: row.icon, content: row.content, minLevel: row.min_level, glossary: [], quiz: [] });
    const mod = map.get(row.id);
    if (row.glossary_id && !mod.glossary.some((g) => g.term === row.term)) mod.glossary.push({ term: row.term, definition: row.definition });
    if (row.quiz_id && !mod.quiz.some((q) => q.id === row.quiz_id)) mod.quiz.push({ id: row.quiz_id, question: row.question, options: JSON.parse(row.options_json), correctIndex: row.correct_index, explanation: row.explanation, imageUrl: row.image_url || undefined });
  }
  return [...map.values()];
}

http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/health') return json(res, 200, { ok: true });
    if (url.pathname === '/admin/migrate' && req.method === 'POST') { await migrate(); return json(res, 200, { ok: true }); }
    if (url.pathname === '/admin/seed' && req.method === 'POST') { await seed(); return json(res, 200, { ok: true }); }
    if (url.pathname === '/modules' && req.method === 'GET') return json(res, 200, await getModules());
    if (url.pathname.startsWith('/modules/') && req.method === 'GET') {
      const found = await getModules(decodeURIComponent(url.pathname.split('/')[2]));
      return found[0] ? json(res, 200, found[0]) : json(res, 404, { error: 'Modul nicht gefunden' });
    }
    if (url.pathname === '/auth/register' && req.method === 'POST') {
      const { email, password, displayName } = await readBody(req);
      if (!email || !password || password.length < 8) return json(res, 400, { error: 'E-Mail und Passwort mit mindestens 8 Zeichen erforderlich.' });
      const user = { id: crypto.randomUUID(), email: email.toLowerCase(), displayName: displayName || null };
      await db('INSERT INTO users (id,email,display_name,password_hash) VALUES (?,?,?,?)', [user.id, user.email, user.displayName, await hashPassword(password)]);
      await db('INSERT INTO user_progress (user_id) VALUES (?)', [user.id]);
      return json(res, 201, { token: signToken(user), user });
    }
    if (url.pathname === '/auth/login' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      const rows = await db('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
      if (!rows[0] || !(await verifyPassword(password || '', rows[0].password_hash))) return json(res, 401, { error: 'Ungültige Zugangsdaten.' });
      const user = { id: rows[0].id, email: rows[0].email, displayName: rows[0].display_name };
      return json(res, 200, { token: signToken(user), user });
    }
    if (url.pathname === '/me/progress') {
      const auth = verifyToken(req);
      if (!auth) return json(res, 401, { error: 'Nicht angemeldet.' });
      if (req.method === 'GET') {
        const rows = await db('SELECT * FROM user_progress WHERE user_id = ?', [auth.sub]);
        const row = rows[0] || {};
        return json(res, 200, { level: row.level || null, completedModules: JSON.parse(row.completed_modules_json || '[]'), quizScores: JSON.parse(row.quiz_scores_json || '{}'), totalProgress: row.total_progress || 0, trophies: JSON.parse(row.trophies_json || '[]') });
      }
      if (req.method === 'PUT') {
        const progress = await readBody(req);
        await db(`INSERT INTO user_progress (user_id,level,completed_modules_json,quiz_scores_json,total_progress,trophies_json,updated_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET level=excluded.level, completed_modules_json=excluded.completed_modules_json, quiz_scores_json=excluded.quiz_scores_json, total_progress=excluded.total_progress, trophies_json=excluded.trophies_json, updated_at=CURRENT_TIMESTAMP`, [auth.sub, progress.level || null, JSON.stringify(progress.completedModules || []), JSON.stringify(progress.quizScores || {}), progress.totalProgress || 0, JSON.stringify(progress.trophies || [])]);
        return json(res, 200, progress);
      }
    }
    return json(res, 404, { error: 'Route nicht gefunden.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Serverfehler' });
  }
}).listen(PORT, () => console.log(`KAI API läuft auf Port ${PORT}`));
