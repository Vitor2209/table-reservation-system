const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'app.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function openDb() {
  ensureDataDir();
  // OPEN_READWRITE | OPEN_CREATE by default
  return new sqlite3.Database(DB_FILE);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initDb(db) {
  // Tables
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      end_time TEXT,
      guests INTEGER NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      json TEXT NOT NULL
    );`
  );

  // Seed settings / closed
  const settings = await get(db, 'SELECT json FROM kv WHERE key = ?', ['settings']);
  if (!settings) {
    const seedSettings = {
      restaurantName: 'RestBurger',
      supportWhatsApp: '+447785314195',
      supportMessage: 'Hi! I need help with the reservation system.',
      timezone: 'Europe/London',
      openingHour: '11:00',
      closingHour: '23:00',
      slotMinutes: 30,
      maxPerSlot: 1
    };
    await run(db, 'INSERT INTO kv(key, json) VALUES(?, ?)', ['settings', JSON.stringify(seedSettings)]);
  }

  const closed = await get(db, 'SELECT json FROM kv WHERE key = ?', ['closed']);
  if (!closed) {
    const seedClosed = {
      closedDates: [],
      weeklyClosed: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      }
    };
    await run(db, 'INSERT INTO kv(key, json) VALUES(?, ?)', ['closed', JSON.stringify(seedClosed)]);
  }

  // Seed reservations if empty
  const countRow = await get(db, 'SELECT COUNT(*) as c FROM reservations');
  if ((countRow?.c || 0) === 0) {
    const now = new Date().toISOString();
    const seed = [
      { id: cryptoId(), name: 'Anwar Charles', phone: '+44 7700 900111', date: '2024-12-09', time: '15:00', end_time: null, guests: 3, status: 'waiting', notes: '' },
      { id: cryptoId(), name: 'Jai Schwartz', phone: '+44 7700 900222', date: '2024-12-11', time: '15:00', end_time: null, guests: 4, status: 'confirmed', notes: '' },
      { id: cryptoId(), name: 'Woody Mason', phone: '+44 7700 900333', date: '2024-12-12', time: '15:00', end_time: null, guests: 5, status: 'confirmed', notes: '' },
      { id: cryptoId(), name: 'Jayne Peters', phone: '+44 7700 900444', date: '2024-12-09', time: '19:30', end_time: null, guests: 4, status: 'waiting', notes: '' },
      { id: cryptoId(), name: 'Mathilde Castro', phone: '+44 7700 900555', date: '2024-12-09', time: '20:00', end_time: null, guests: 2, status: 'confirmed', notes: '' },
      { id: cryptoId(), name: 'Sianna Bonilla', phone: '+44 7700 900666', date: '2024-12-11', time: '20:30', end_time: null, guests: 2, status: 'cancelled', notes: 'Customer cancelled' }
    ];
    for (const r of seed) {
      await run(
        db,
        `INSERT INTO reservations(id,name,phone,date,time,end_time,guests,status,notes,created_at,updated_at)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [r.id, r.name, r.phone, r.date, r.time, r.end_time, r.guests, r.status, r.notes, now, now]
      );
    }
  }
}

function cryptoId() {
  try {
    return globalThis.crypto?.randomUUID?.() || require('crypto').randomUUID();
  } catch {
    return 'r_' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

module.exports = {
  DB_FILE,
  openDb,
  initDb,
  run,
  get,
  all,
  cryptoId
};
