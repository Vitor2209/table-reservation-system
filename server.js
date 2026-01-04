/**
 * Minimal Node.js server (no dependencies).
 * - Serves static files (index.html + /public assets)
 * - Provides a small REST API for reservations, settings, and closed days/hours
 *
 * Run:
 *   npm install
 *   npm start
 *
 * Open:
 *   http://localhost:3000
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const { openDb, initDb, all, get, run, cryptoId } = require("./db");

const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const db = openDb();

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (!body) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function safePathJoin(base, reqPath) {
  const safePath = path.normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(base, safePath);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };
  return map[ext] || "application/octet-stream";
}

function serveStatic(req, res, pathname) {
  // root -> index.html
  if (pathname === "/" || pathname === "") pathname = "/index.html";

  // Only allow index.html at root and /public assets
  let filePath;
  if (pathname === "/index.html") {
    filePath = path.join(ROOT_DIR, "index.html");
  } else if (pathname.startsWith("/public/")) {
    filePath = safePathJoin(ROOT_DIR, pathname);
  } else {
    return sendText(res, 404, "Not found");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendText(res, 404, "Not found");
  }

  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { "Content-Type": mimeType(filePath), "Cache-Control": "no-store" });
  stream.pipe(res);
}

function validateReservation(input) {
  const errors = [];
  const out = {};

  out.id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : cryptoId();
  out.name = String(input.name || "").trim();
  out.phone = String(input.phone || "").trim();
  out.date = String(input.date || "").trim(); // YYYY-MM-DD
  out.time = String(input.time || "").trim(); // HH:MM
  // optional end time (supports camelCase and snake_case)
  const end = input.endTime ?? input.end_time ?? input.endtime;
  out.endTime = end ? String(end).trim() : null; // HH:MM or null
  out.guests = Number(input.guests || 0);
  out.status = String(input.status || "waiting").trim().toLowerCase();
  out.notes = String(input.notes || "").trim();

  if (!out.name) errors.push("name is required");
  if (!out.phone) errors.push("phone is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date)) errors.push("date must be YYYY-MM-DD");
  if (!/^\d{2}:\d{2}$/.test(out.time)) errors.push("time must be HH:MM");
  if (out.endTime && !/^\d{2}:\d{2}$/.test(out.endTime)) errors.push("endTime must be HH:MM");
  if (!Number.isFinite(out.guests) || out.guests < 1 || out.guests > 50) errors.push("guests must be between 1 and 50");
  if (!["waiting", "confirmed", "cancelled"].includes(out.status)) errors.push("status must be waiting|confirmed|cancelled");

  return { ok: errors.length === 0, errors, value: out };
}

async function getSettings() {
  const row = await get(db, 'SELECT json FROM kv WHERE key = ?', ['settings']);
  return row ? JSON.parse(row.json) : {};
}

async function setSettings(patch) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await run(db, 'INSERT INTO kv(key, json) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json', [
    'settings',
    JSON.stringify(next)
  ]);
  return next;
}

async function getClosed() {
  const row = await get(db, 'SELECT json FROM kv WHERE key = ?', ['closed']);
  return row ? JSON.parse(row.json) : {};
}

async function setClosed(patch) {
  const current = await getClosed();
  const next = { ...current, ...patch };
  await run(db, 'INSERT INTO kv(key, json) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json', [
    'closed',
    JSON.stringify(next)
  ]);
  return next;
}

async function isSlotClosedServer(dateIso, time) {
  const settings = await getSettings();
  const closed = await getClosed();

  // closed dates
  if (Array.isArray(closed.closedDates) && closed.closedDates.includes(dateIso)) return true;

  // weekly closed
  const d = new Date(dateIso + 'T00:00:00Z');
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const key = map[d.getUTCDay()];
  if (closed?.weeklyClosed?.[key]) return true;

  // opening hours
  const open = String(settings.openingHour || '11:00');
  const close = String(settings.closingHour || '23:00');
  const toMin = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const m = toMin(time);
  return m < toMin(open) || m > toMin(close);
}

async function isTimeSlotTaken(candidate) {
  const row = await get(
    db,
    `SELECT COUNT(*) as c FROM reservations
     WHERE id <> ? AND date = ? AND time = ? AND status <> 'cancelled'`,
    [candidate.id, candidate.date, candidate.time]
  );
  return (row?.c || 0) > 0;
}

// (legacy JSON helpers removed; SQLite is the source of truth)

async function handleApi(req, res, pathname) {
  const method = req.method || "GET";

  // Reservations
  if (pathname === "/api/reservations" && method === "GET") {
    const parsed = url.parse(req.url, true);
    const { from, to, status } = parsed.query || {};

    const where = [];
    const params = [];

    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
      where.push('date >= ?');
      params.push(from);
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
      where.push('date <= ?');
      params.push(to);
    }
    if (status && status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }

    const sql = `SELECT id,name,phone,date,time,end_time as endTime,guests,status,notes FROM reservations`
      + (where.length ? ` WHERE ${where.join(' AND ')}` : '')
      + ` ORDER BY date ASC, time ASC`;

    const rows = await all(db, sql, params);
    // Normalize property names to match front
    const data = rows.map(r => ({
      ...r,
      endTime: r.endTime ?? null
    }));
    return sendJson(res, 200, data);
  }

  if (pathname === "/api/reservations" && method === "POST") {
    try {
      const body = await parseBody(req) || {};
      const check = validateReservation(body);
      if (!check.ok) return sendJson(res, 400, { error: "validation_error", details: check.errors });

      if (await isSlotClosedServer(check.value.date, check.value.time)) {
        return sendJson(res, 409, { error: "slot_closed", message: "This time slot is closed." });
      }

      if (await isTimeSlotTaken(check.value)) {
        return sendJson(res, 409, { error: "time_slot_taken", message: "This time slot already has a reservation." });
      }

      const now = new Date().toISOString();
      await run(
        db,
        `INSERT INTO reservations(id,name,phone,date,time,end_time,guests,status,notes,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [
          check.value.id,
          check.value.name,
          check.value.phone,
          check.value.date,
          check.value.time,
          check.value.endTime || null,
          check.value.guests,
          check.value.status,
          check.value.notes,
          now,
          now
        ]
      );

      return sendJson(res, 201, check.value);
    } catch (e) {
      return sendJson(res, 400, { error: "bad_request", message: e.message });
    }
  }

  const resMatch = pathname.match(/^\/api\/reservations\/([^\/]+)$/);
  if (resMatch) {
    const id = decodeURIComponent(resMatch[1]);

    if (method === "PUT") {
      try {
        const body = await parseBody(req) || {};
        body.id = id;
        const check = validateReservation(body);
        if (!check.ok) return sendJson(res, 400, { error: "validation_error", details: check.errors });

        if (await isSlotClosedServer(check.value.date, check.value.time)) {
          return sendJson(res, 409, { error: "slot_closed", message: "This time slot is closed." });
        }

        const found = await get(db, 'SELECT id FROM reservations WHERE id = ?', [id]);
        if (!found) return sendJson(res, 404, { error: 'not_found' });

        if (await isTimeSlotTaken(check.value)) {
          return sendJson(res, 409, { error: "time_slot_taken", message: "This time slot already has a reservation." });
        }

        const now = new Date().toISOString();
        await run(
          db,
          `UPDATE reservations
           SET name=?, phone=?, date=?, time=?, end_time=?, guests=?, status=?, notes=?, updated_at=?
           WHERE id=?`,
          [
            check.value.name,
            check.value.phone,
            check.value.date,
            check.value.time,
            check.value.endTime || null,
            check.value.guests,
            check.value.status,
            check.value.notes,
            now,
            id
          ]
        );

        const row = await get(db, `SELECT id,name,phone,date,time,end_time as endTime,guests,status,notes FROM reservations WHERE id = ?`, [id]);
        const out = { ...row, endTime: row?.endTime ?? null };
        return sendJson(res, 200, out);
      } catch (e) {
        return sendJson(res, 400, { error: "bad_request", message: e.message });
      }
    }

    if (method === "DELETE") {
      const row = await get(db, `SELECT id,name,phone,date,time,end_time as endTime,guests,status,notes FROM reservations WHERE id = ?`, [id]);
      if (!row) return sendJson(res, 404, { error: 'not_found' });
      await run(db, 'DELETE FROM reservations WHERE id = ?', [id]);
      return sendJson(res, 200, { ok: true, removed: { ...row, endTime: row.endTime ?? null } });
    }

    if (method === "GET") {
      const row = await get(db, `SELECT id,name,phone,date,time,end_time as endTime,guests,status,notes FROM reservations WHERE id = ?`, [id]);
      if (!row) return sendJson(res, 404, { error: "not_found" });
      return sendJson(res, 200, { ...row, endTime: row.endTime ?? null });
    }
  }

  // Settings
  if (pathname === "/api/settings" && method === "GET") {
    const settings = await getSettings();
    return sendJson(res, 200, settings);
  }

  if (pathname === "/api/settings" && method === "PUT") {
    try {
      const body = await parseBody(req) || {};
      const next = await setSettings(body);
      return sendJson(res, 200, next);
    } catch (e) {
      return sendJson(res, 400, { error: "bad_request", message: e.message });
    }
  }

  // Closed days
  if (pathname === "/api/closed" && method === "GET") {
    const closed = await getClosed();
    return sendJson(res, 200, closed);
  }

  if (pathname === "/api/closed" && method === "PUT") {
    try {
      const body = await parseBody(req) || {};
      const next = await setClosed(body);
      return sendJson(res, 200, next);
    } catch (e) {
      return sendJson(res, 400, { error: "bad_request", message: e.message });
    }
  }

  return sendText(res, 404, "Not found");
}

// DB init happens before server starts

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname || "/";

  // CORS for local dev convenience
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, pathname);
  }

  return serveStatic(req, res, pathname);
});

(async () => {
  try {
    await initDb(db);
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`🗄️  SQLite DB: ${require('./db').DB_FILE}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
})();
