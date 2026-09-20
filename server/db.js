// ============================================================
// Connexion PostgreSQL (package `pg`).
// Toutes les requêtes passent par query() et sont paramétrées :
// aucune valeur n'est jamais concaténée dans du SQL.
// ============================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL absente. Voir .env.example');
}

// Render fournit un certificat que Node ne connaît pas par défaut :
// en production on active SSL sans rejeter le certificat.
const ssl = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
  ? false
  : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue du pool PostgreSQL :', err.message);
});

/**
 * Exécute une requête paramétrée.
 * @param {string} text  SQL avec des marqueurs $1, $2…
 * @param {Array} params Valeurs, jamais interpolées dans la chaîne SQL.
 */
function query(text, params) {
  return pool.query(text, params);
}

/** Applique database/schema.sql (idempotent) au démarrage. */
async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Schéma PostgreSQL vérifié.');
}

/** Vérifie que la base répond. */
async function testConnection() {
  const { rows } = await pool.query('SELECT NOW() AS maintenant');
  console.log(`✅ PostgreSQL connecté (${rows[0].maintenant.toISOString()}).`);
}

module.exports = { pool, query, initSchema, testConnection };
