/* eslint-disable no-console */
const crypto = require("node:crypto");
const http = require("node:http");
const { readFileSync } = require("node:fs");
const { modules } = require("./seed-modules.cjs");

const PORT = Number(process.env.PORT || 10000);
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.warn(
    "TURSO_DATABASE_URL oder TURSO_AUTH_TOKEN fehlt. Datenbankrouten werden fehlschlagen.",
  );
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });

  if (status === 204) {
    res.end();
    return;
  }

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function encodeArg(value) {
  if (value === null || value === undefined) return { type: "null" };

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }

  return { type: "text", value: String(value) };
}

function decodeValue(value) {
  if (!value || value.type === "null") return null;
  if (value.type === "integer") return Number(value.value);
  if (value.type === "float") return Number(value.value);
  return value.value;
}

async function db(sql, args = []) {
  const response = await fetch(
    `${TURSO_DATABASE_URL.replace(/\/$/, "")}/v2/pipeline`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TURSO_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql,
              args: args.map(encodeArg),
            },
          },
          { type: "close" },
        ],
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || payload?.results?.[0]?.type === "error") {
    throw new Error(
      payload?.results?.[0]?.error?.message ||
        payload?.message ||
        "Turso query failed",
    );
  }

  const result = payload.results[0].response?.result;
  const columns = result?.cols?.map((column) => column.name) || [];

  return (result?.rows || []).map((row) =>
    Object.fromEntries(
      row.map((cell, index) => [columns[index], decodeValue(cell)]),
    ),
  );
}

async function ensureColumn(tableName, columnName, definition) {
  const columns = await db(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await db(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function migrate() {
  const statements = readFileSync(
    new URL("./schema.sql", `file://${__dirname}/`),
    "utf8",
  )
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db(statement);
  }

  await ensureColumn(
    "user_progress",
    "level_progress_json",
    "TEXT NOT NULL DEFAULT '{}'",
  );

  // Sicherheit: existiert auch, falls schema.sql im Deployment veraltet ist.
  await db(
    `CREATE TABLE IF NOT EXISTS module_completions (
       id TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       module_id TEXT NOT NULL,
       completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(user_id, module_id)
     )`,
  );

  await db(
    `CREATE INDEX IF NOT EXISTS idx_module_completions_module_completed_at
       ON module_completions(module_id, completed_at)`,
  );

  // Wichtig für hochgeladene Base64-Lektionsbilder.
  await db(
    `CREATE TABLE IF NOT EXISTS module_lesson_images (
       id TEXT PRIMARY KEY,
       module_id TEXT NOT NULL,
       image_url TEXT NOT NULL,
       alt TEXT NOT NULL,
       placement TEXT NOT NULL,
       sort_order INTEGER NOT NULL DEFAULT 0
     )`,
  );

  // Optionales Video pro Lernmodul.
  await db(
    `CREATE TABLE IF NOT EXISTS module_video_link (
       module_id TEXT PRIMARY KEY,
       video_url TEXT NOT NULL,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );
}

async function replaceModule(module, index = 0) {
  await db(
    `INSERT OR REPLACE INTO learning_modules
     (id,title,description,icon,content,min_level,sort_order,is_published,updated_at)
     VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
    [
      module.id,
      module.title,
      module.description,
      module.icon,
      module.content,
      module.minLevel,
      index,
      module.isPublished === false ? 0 : 1,
    ],
  );

  await db("DELETE FROM module_glossary_items WHERE module_id = ?", [
    module.id,
  ]);
  await db("DELETE FROM module_quiz_questions WHERE module_id = ?", [
    module.id,
  ]);
  await db("DELETE FROM module_lesson_images WHERE module_id = ?", [
    module.id,
  ]);
  await db("DELETE FROM module_video_link WHERE module_id = ?", [module.id]);

  if (module.videoLink) {
    await db(
      `INSERT INTO module_video_link
       (module_id,video_url,updated_at)
       VALUES (?,?,CURRENT_TIMESTAMP)`,
      [module.id, module.videoLink],
    );
  }

  for (const [gIndex, item] of (module.glossary || []).entries()) {
    if (!item.term && !item.definition) continue;

    await db(
      `INSERT INTO module_glossary_items
       (id,module_id,term,definition,sort_order)
       VALUES (?,?,?,?,?)`,
      [
        `${module.id}-g-${gIndex}`,
        module.id,
        item.term,
        item.definition,
        gIndex,
      ],
    );
  }

  for (const [imageIndex, image] of (module.lessonImages || []).entries()) {
    if (!image.imageUrl) continue;

    await db(
      `INSERT INTO module_lesson_images
       (id,module_id,image_url,alt,placement,sort_order)
       VALUES (?,?,?,?,?,?)`,
      [
        image.id || `${module.id}-image-${imageIndex}`,
        module.id,
        image.imageUrl,
        image.alt || `Bild ${imageIndex + 1} zu ${module.title}`,
        image.placement || "after-content",
        imageIndex,
      ],
    );
  }

  for (const [qIndex, question] of (module.quiz || []).entries()) {
    if (!question.question) continue;

    await db(
      `INSERT INTO module_quiz_questions
       (id,module_id,question,options_json,correct_index,explanation,image_url,sort_order)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        question.id || `${module.id}-q-${qIndex}`,
        module.id,
        question.question,
        JSON.stringify(question.options || []),
        question.correctIndex || 0,
        question.explanation || "",
        question.imageUrl || null,
        qIndex,
      ],
    );
  }
}

async function seed() {
  for (const [index, module] of modules.entries()) {
    await replaceModule({ ...module, isPublished: true }, index);
  }
}

function signToken(user) {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");

  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      displayName: user.displayName || null,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    }),
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${sig}`;
}

function verifyToken(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const [header, payload, sig] = token.split(".");
  if (!header || !payload || !sig) return null;

  const expected = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (sig.length !== expected.length) return null;

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  return parsed.exp > Date.now() / 1000 ? parsed : null;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key.toString("hex")),
    ),
  );

  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");

  const candidate = await new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key.toString("hex")),
    ),
  );

  return (
    hash.length === candidate.length &&
    crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(candidate))
  );
}

function moduleFromRows(rows) {
  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        title: row.title,
        description: row.description,
        icon: row.icon,
        content: row.content,
        minLevel: row.min_level,
        videoLink: row.video_url || undefined,
        isPublished: Boolean(row.is_published),
        sortOrder: row.sort_order,
        glossary: [],
        lessonImages: [],
        quiz: [],
      });
    }

    const mod = map.get(row.id);

    if (row.glossary_id && !mod.glossary.some((g) => g.term === row.term)) {
      mod.glossary.push({
        term: row.term,
        definition: row.definition,
      });
    }

    if (
      row.lesson_image_id &&
      !mod.lessonImages.some((image) => image.id === row.lesson_image_id)
    ) {
      mod.lessonImages.push({
        id: row.lesson_image_id,
        imageUrl: row.lesson_image_url,
        alt: row.lesson_image_alt,
        placement: row.lesson_image_placement,
      });
    }

    if (row.quiz_id && !mod.quiz.some((q) => q.id === row.quiz_id)) {
      mod.quiz.push({
        id: row.quiz_id,
        question: row.question,
        options: JSON.parse(row.options_json),
        correctIndex: row.correct_index,
        explanation: row.explanation,
        imageUrl: row.image_url || undefined,
      });
    }
  }

  return [...map.values()];
}

async function getModules(moduleId, { admin = false } = {}) {
  const where = moduleId
    ? `WHERE m.id = ?${admin ? "" : " AND m.is_published = 1"}`
    : admin
      ? ""
      : "WHERE m.is_published = 1";

  const rows = await db(
    `SELECT
       m.*,
       v.video_url,
       g.id glossary_id,
       g.term,
       g.definition,
       li.id lesson_image_id,
       li.image_url lesson_image_url,
       li.alt lesson_image_alt,
       li.placement lesson_image_placement,
       q.id quiz_id,
       q.question,
       q.options_json,
       q.correct_index,
       q.explanation,
       q.image_url
     FROM learning_modules m
     LEFT JOIN module_video_link v ON v.module_id = m.id
     LEFT JOIN module_glossary_items g ON g.module_id = m.id
     LEFT JOIN module_lesson_images li ON li.module_id = m.id
     LEFT JOIN module_quiz_questions q ON q.module_id = m.id
     ${where}
     ORDER BY
       m.sort_order,
       g.sort_order,
       li.sort_order,
       q.sort_order`,
    moduleId ? [moduleId] : [],
  );

  return moduleFromRows(rows);
}

async function getModuleCompletionStats(moduleId) {
  return db(
    `SELECT date(completed_at) AS day, COUNT(*) AS completions
     FROM module_completions
     WHERE module_id = ?
     GROUP BY date(completed_at)
     ORDER BY day`,
    [moduleId],
  );
}

async function recordModuleCompletion(userId, moduleId) {
  await db(
    `INSERT OR IGNORE INTO module_completions
     (id,user_id,module_id)
     VALUES (?,?,?)`,
    [`${userId}:${moduleId}`, userId, moduleId],
  );
}

async function recordNewCompletions(userId, nextCompletedModules) {
  const previous = await db(
    "SELECT completed_modules_json FROM user_progress WHERE user_id = ?",
    [userId],
  );

  const alreadyCompleted = new Set(
    JSON.parse(previous[0]?.completed_modules_json || "[]"),
  );

  for (const moduleId of nextCompletedModules) {
    if (!alreadyCompleted.has(moduleId)) {
      await recordModuleCompletion(userId, moduleId);
    }
  }
}

http
  .createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return json(res, 204, {});

      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === "/health") {
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/admin/migrate" && req.method === "POST") {
        await migrate();
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/admin/seed" && req.method === "POST") {
        await seed();
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/admin/modules" && req.method === "GET") {
        return json(res, 200, await getModules(null, { admin: true }));
      }

      if (url.pathname === "/admin/modules" && req.method === "POST") {
        const body = await readBody(req);
        await replaceModule(body, Number(body.sortOrder || 0));
        return json(res, 201, (await getModules(body.id, { admin: true }))[0]);
      }

      if (
        url.pathname.startsWith("/admin/modules/") &&
        url.pathname.endsWith("/completions") &&
        req.method === "GET"
      ) {
        const id = decodeURIComponent(url.pathname.split("/")[3]);
        return json(res, 200, await getModuleCompletionStats(id));
      }

      if (url.pathname.startsWith("/admin/modules/")) {
        const id = decodeURIComponent(url.pathname.split("/")[3]);

        if (req.method === "PUT") {
          const body = await readBody(req);

          if (id !== body.id) {
            await db("DELETE FROM learning_modules WHERE id = ?", [id]);
          }

          await replaceModule(body, Number(body.sortOrder || 0));
          return json(res, 200, (await getModules(body.id, { admin: true }))[0]);
        }

        if (req.method === "DELETE") {
          await db("DELETE FROM learning_modules WHERE id = ?", [id]);
          return json(res, 200, { ok: true });
        }
      }

      if (
        url.pathname === "/admin/stats/module-completions-daily" &&
        req.method === "GET"
      ) {
        const rows = await db(
          `SELECT
             m.id AS moduleId,
             m.title AS title,
             date(c.completed_at) AS day,
             COUNT(c.id) AS completions
           FROM learning_modules m
           LEFT JOIN module_completions c ON c.module_id = m.id
           GROUP BY m.id, date(c.completed_at)
           ORDER BY m.sort_order, day`,
        );

        return json(res, 200, rows);
      }

      if (url.pathname === "/admin/stats/overview" && req.method === "GET") {
        const [users, mods, completions] = await Promise.all([
          db("SELECT COUNT(*) AS count FROM users"),
          db("SELECT COUNT(*) AS count FROM learning_modules"),
          db("SELECT COUNT(*) AS count FROM module_completions"),
        ]);

        return json(res, 200, {
          totalUsers: users[0].count,
          totalModules: mods[0].count,
          totalCompletions: completions[0].count,
        });
      }

      if (
        url.pathname.startsWith("/modules/") &&
        url.pathname.endsWith("/complete") &&
        req.method === "POST"
      ) {
        const moduleId = decodeURIComponent(url.pathname.split("/")[2]);
        const auth = verifyToken(req);
        const body = await readBody(req);

        const anonymousId = String(body.anonymousId || "")
          .replace(/[^a-zA-Z0-9:-]/g, "")
          .slice(0, 80);

        const userId =
          auth?.sub || `anonymous:${anonymousId || crypto.randomUUID()}`;

        await recordModuleCompletion(userId, moduleId);
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/modules" && req.method === "GET") {
        const published = await getModules();

        return json(
          res,
          200,
          published.map(({ isPublished, sortOrder, ...module }) => module),
        );
      }

      if (url.pathname.startsWith("/modules/") && req.method === "GET") {
        const found = await getModules(
          decodeURIComponent(url.pathname.split("/")[2]),
        );

        return found[0]
          ? json(res, 200, found[0])
          : json(res, 404, { error: "Modul nicht gefunden" });
      }

      if (url.pathname === "/auth/register" && req.method === "POST") {
        const { email, password, displayName } = await readBody(req);

        if (!email || !password || password.length < 8) {
          return json(res, 400, {
            error: "E-Mail und Passwort mit mindestens 8 Zeichen erforderlich.",
          });
        }

        const user = {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          displayName: displayName || null,
        };

        await db(
          "INSERT INTO users (id,email,display_name,password_hash) VALUES (?,?,?,?)",
          [user.id, user.email, user.displayName, await hashPassword(password)],
        );

        await db("INSERT INTO user_progress (user_id) VALUES (?)", [user.id]);

        return json(res, 201, {
          token: signToken(user),
          user,
        });
      }

      if (url.pathname === "/auth/logout" && req.method === "POST") {
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/auth/login" && req.method === "POST") {
        const { email, password } = await readBody(req);

        const rows = await db("SELECT * FROM users WHERE email = ?", [
          String(email || "").toLowerCase(),
        ]);

        if (
          !rows[0] ||
          !(await verifyPassword(password || "", rows[0].password_hash))
        ) {
          return json(res, 401, {
            error: "Ungültige Zugangsdaten.",
          });
        }

        const user = {
          id: rows[0].id,
          email: rows[0].email,
          displayName: rows[0].display_name,
        };

        return json(res, 200, {
          token: signToken(user),
          user,
        });
      }

      if (url.pathname === "/me" && req.method === "GET") {
        const auth = verifyToken(req);
        if (!auth) return json(res, 401, { error: "Nicht angemeldet." });

        const rows = await db(
          "SELECT id,email,display_name FROM users WHERE id = ?",
          [auth.sub],
        );

        return rows[0]
          ? json(res, 200, {
              id: rows[0].id,
              email: rows[0].email,
              displayName: rows[0].display_name,
            })
          : json(res, 404, { error: "User nicht gefunden." });
      }

      if (url.pathname === "/me/module-completion" && req.method === "POST") {
        const auth = verifyToken(req);
        if (!auth) return json(res, 401, { error: "Nicht angemeldet." });

        const { moduleId } = await readBody(req);

        if (!moduleId) {
          return json(res, 400, { error: "moduleId fehlt." });
        }

        await recordModuleCompletion(auth.sub, moduleId);
        return json(res, 200, { ok: true });
      }

      if (url.pathname === "/me/progress") {
        const auth = verifyToken(req);
        if (!auth) return json(res, 401, { error: "Nicht angemeldet." });

        if (req.method === "GET") {
          const rows = await db(
            `SELECT p.*, u.display_name, u.email
             FROM user_progress p
             JOIN users u ON u.id = p.user_id
             WHERE p.user_id = ?`,
            [auth.sub],
          );

          const row = rows[0] || {};

          return json(res, 200, {
            displayName: row.display_name || auth.displayName || null,
            email: row.email || auth.email || null,
            level: row.level || null,
            completedModules: JSON.parse(row.completed_modules_json || "[]"),
            quizScores: JSON.parse(row.quiz_scores_json || "{}"),
            totalProgress: row.total_progress || 0,
            trophies: JSON.parse(row.trophies_json || "[]"),
            levelProgress: JSON.parse(row.level_progress_json || "{}"),
          });
        }

        if (req.method === "PUT") {
          const progress = await readBody(req);

          await recordNewCompletions(auth.sub, progress.completedModules || []);

          await db(
            `INSERT INTO user_progress
             (user_id,level,completed_modules_json,quiz_scores_json,total_progress,level_progress_json,trophies_json,updated_at)
             VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
             ON CONFLICT(user_id) DO UPDATE SET
               level=excluded.level,
               completed_modules_json=excluded.completed_modules_json,
               quiz_scores_json=excluded.quiz_scores_json,
               total_progress=excluded.total_progress,
               level_progress_json=excluded.level_progress_json,
               trophies_json=excluded.trophies_json,
               updated_at=CURRENT_TIMESTAMP`,
            [
              auth.sub,
              progress.level || null,
              JSON.stringify(progress.completedModules || []),
              JSON.stringify(progress.quizScores || {}),
              progress.totalProgress || 0,
              JSON.stringify(progress.levelProgress || {}),
              JSON.stringify(progress.trophies || []),
            ],
          );

          return json(res, 200, progress);
        }
      }

      return json(res, 404, { error: "Route nicht gefunden." });
    } catch (error) {
      console.error(error);
      return json(res, 500, {
        error: error.message || "Serverfehler",
      });
    }
  })
  .listen(PORT, () => console.log(`KAI API läuft auf Port ${PORT}`));
