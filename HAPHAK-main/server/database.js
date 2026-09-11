const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { DEFAULT_PUBLIC_SETTINGS } = require('./publicSettings');

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur de connexion à SQLite:', err.message);
  } else {
    console.log('✅ Connexion SQLite réussie:', config.dbPath);
  }
});

// Promisify database methods for clean async/await repository usage
const dbAsync = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize database schema and tables
async function initDatabase() {
  try {
    // 1. Table registrations
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_number VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        gender VARCHAR(20) NOT NULL,
        marital_status VARCHAR(50) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50),
        email VARCHAR(150) NOT NULL,
        address TEXT,
        city VARCHAR(100) NOT NULL,
        neighborhood VARCHAR(100),
        commune VARCHAR(100),
        province VARCHAR(100),
        country VARCHAR(100) NOT NULL,
        family_status VARCHAR(100),
        family_size INTEGER DEFAULT 1,
        children_count INTEGER DEFAULT 0,
        emergency_contact_name VARCHAR(150) NOT NULL,
        emergency_contact_phone VARCHAR(50) NOT NULL,
        emergency_contact_relationship VARCHAR(100) NOT NULL,
        source VARCHAR(100),
        arrival_city VARCHAR(100),
        transport_method VARCHAR(100),
        full_retreat VARCHAR(20),
        arrival_date VARCHAR(50),
        departure_date VARCHAR(50),
        organization_member VARCHAR(10),
        department VARCHAR(100),
        accommodation_required VARCHAR(10),
        nights INTEGER DEFAULT 0,
        accommodation_type VARCHAR(50),
        coming_with_others VARCHAR(10),
        companions_count INTEGER DEFAULT 0,
        special_needs TEXT,
        comments TEXT,
        consent INTEGER DEFAULT 1,
        confirmed INTEGER DEFAULT 1,
        checked_in INTEGER DEFAULT 0,
        checkin_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for fast administrative searching & stats
    await dbAsync.run(`CREATE INDEX IF NOT EXISTS idx_reg_number ON registrations(registration_number)`);
    await dbAsync.run(`CREATE INDEX IF NOT EXISTS idx_city ON registrations(city)`);
    await dbAsync.run(`CREATE INDEX IF NOT EXISTS idx_gender ON registrations(gender)`);
    await dbAsync.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON registrations(created_at)`);

    // 2. Table admin_users
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Table retreat_settings
    await dbAsync.run(`
      CREATE TABLE IF NOT EXISTS retreat_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(50) UNIQUE NOT NULL,
        value TEXT NOT NULL
      )
    `);

    // Seed Admin User if none exists
    const adminExist = await dbAsync.get(`SELECT id FROM admin_users WHERE username = ?`, [config.adminUsername]);
    if (!adminExist) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(config.adminPassword, salt);
      await dbAsync.run(
        `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)`,
        [config.adminUsername, hash]
      );
      console.log(`🔐 Compte Admin initial créé: ${config.adminUsername}`);
    }

    // Seed default settings if missing
    const defaultSettings = [
      { key: 'name', value: DEFAULT_PUBLIC_SETTINGS.name },
      { key: 'theme', value: DEFAULT_PUBLIC_SETTINGS.theme },
      { key: 'start_date', value: DEFAULT_PUBLIC_SETTINGS.start_date },
      { key: 'end_date', value: DEFAULT_PUBLIC_SETTINGS.end_date },
      { key: 'location', value: DEFAULT_PUBLIC_SETTINGS.location },
      { key: 'description', value: DEFAULT_PUBLIC_SETTINGS.description },
      { key: 'contact_phone', value: DEFAULT_PUBLIC_SETTINGS.contact_phone },
      { key: 'contact_whatsapp', value: DEFAULT_PUBLIC_SETTINGS.contact_whatsapp },
      { key: 'registration_open', value: DEFAULT_PUBLIC_SETTINGS.registration_open }
    ];

    for (const setting of defaultSettings) {
      const exist = await dbAsync.get(`SELECT id FROM retreat_settings WHERE key = ?`, [setting.key]);
      if (!exist) {
        await dbAsync.run(
          `INSERT INTO retreat_settings (key, value) VALUES (?, ?)`,
          [setting.key, setting.value]
        );
      }
    }

    console.log('✅ Base de données SQLite et schéma initialisés avec succès.');
  } catch (error) {
    console.error('❌ Erreur lors de l’initialisation de la base de données:', error);
  }
}

module.exports = {
  db,
  dbAsync,
  initDatabase
};
