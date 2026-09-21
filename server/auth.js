// ============================================================
// Authentification administrateur.
// Le mot de passe n'est jamais stocké en clair : bcrypt uniquement.
// ============================================================

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('./db');

const TOURS_BCRYPT = 12;

function genererToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Crée le compte administrateur au démarrage à partir des variables
 * d'environnement, s'il n'existe pas déjà.
 */
async function initAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const motDePasse = process.env.ADMIN_PASSWORD || '';

  if (!email || !motDePasse) {
    console.warn('⚠️  ADMIN_EMAIL ou ADMIN_PASSWORD absent : aucun administrateur créé.');
    return;
  }

  const { rows } = await query('SELECT id FROM admins WHERE LOWER(email) = LOWER($1)', [email]);

  if (rows.length) {
    console.log(`✅ Administrateur existant : ${email}`);
    // Veiller à ce que chaque administrateur ait un token unique
    await assurerTokensAdmins();
    return;
  }

  const hash = await bcrypt.hash(motDePasse, TOURS_BCRYPT);
  const token = genererToken();
  await query('INSERT INTO admins (email, password_hash, admin_token) VALUES ($1, $2, $3)', [email, hash, token]);
  console.log(`✅ Administrateur créé : ${email}`);
  console.log(`[ADMIN TOKEN] ${email}: ${token}`);
}

/** Génère et assigne des tokens aux admins qui n'en ont pas encore. */
async function assurerTokensAdmins() {
  const { rows } = await query('SELECT id, email FROM admins WHERE admin_token IS NULL');
  for (const r of rows) {
    const token = genererToken();
    await query('UPDATE admins SET admin_token = $1 WHERE id = $2', [token, r.id]);
    console.log(`[ADMIN TOKEN] ${r.email}: ${token}`);
  }
}

/** Vérifie les identifiants. Retourne l'admin ou null. */
async function verifierIdentifiants(email, motDePasse) {
  if (!email || !motDePasse) return null;

  const { rows } = await query(
    'SELECT id, email, password_hash FROM admins WHERE LOWER(email) = LOWER($1)',
    [String(email).trim()]
  );

  if (!rows.length) return null;

  const valide = await bcrypt.compare(String(motDePasse), rows[0].password_hash);
  if (!valide) return null;

  return { id: rows[0].id, email: rows[0].email };
}

/** Middleware : protège les routes /api/admin/*. */
function exigerAuth(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.status(401).json({
    success: false,
    message: 'Session expirée. Veuillez vous reconnecter.',
  });
}

/** Middleware : protège les pages HTML d'administration. */
function exigerAuthPage(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/');
}

module.exports = { initAdmin, verifierIdentifiants, exigerAuth, exigerAuthPage };
