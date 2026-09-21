// ============================================================
// HAPHAK — Serveur Express
// Inscription publique + administration protégée.
// ============================================================

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const { query, initSchema, testConnection } = require('./db');
const { initAdmin, verifierIdentifiants, exigerAuth, exigerAuthPage } = require('./auth');
const { envoyerConfirmation } = require('./email');
const HAPHAK = require('./haphak');

const app = express();
const PORT = process.env.PORT || 3000;
const EN_PRODUCTION = process.env.NODE_ENV === 'production';

// Render place l'application derrière un proxy : nécessaire pour les
// cookies Secure et pour que le rate limiting voie la vraie IP.
app.set('trust proxy', 1);

// ------------------------------------------------------------
// Sécurité
// ------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

if (!process.env.SESSION_SECRET && EN_PRODUCTION) {
  throw new Error('SESSION_SECRET est obligatoire en production.');
}

app.use(session({
  name: 'haphak.sid',
  secret: process.env.SESSION_SECRET || 'secret_de_developpement',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: EN_PRODUCTION,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 heures
  },
}));

// Limites de débit
const limiteInscription = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans un moment.' },
});

const limiteConnexion = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

// ------------------------------------------------------------
// Pages d'administration : protégées AVANT express.static
// ------------------------------------------------------------
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));

// Connexion via URL unique : /adminNN à la racine (ex. /admin26)
app.get(/^\/admin(\d+)$/i, async (req, res) => {
  try {
    const n = Number.parseInt(req.params[0], 10);
    if (Number.isNaN(n)) return res.status(400).send('ID invalide');

    const { rows } = await query('SELECT id, email FROM admins WHERE id = $1', [n]);
    if (!rows.length) {
      console.log('[LOGIN] via adminNN failed', { ip: req.ip, id: n });
      return res.status(404).send('Identifiant administrateur introuvable.');
    }

    const admin = rows[0];
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    console.log('[LOGIN] via adminNN success', { ip: req.ip, admin: admin.email });
    return res.redirect('/admin/dashboard.html');
  } catch (err) {
    console.error('[LOGIN ADMINNN ERROR]', err && err.stack ? err.stack : err);
    return res.status(500).send('Erreur serveur.');
  }
});

// Connexion via URL unique : /admin/:token  (ex. token hex or adminNN under /admin/)
app.get('/admin/:token', async (req, res) => {
  try {
    const t = String(req.params.token || '').trim();
    if (!t) return res.status(400).send('Token manquant.');

    // Si format adminNN -> map vers id numérique
    const m = t.match(/^admin(\d+)$/i);
    let result;
    if (m) {
      const n = Number.parseInt(m[1], 10);
      result = await query('SELECT id, email FROM admins WHERE id = $1', [n]);
    } else {
      result = await query('SELECT id, email FROM admins WHERE admin_token = $1', [t]);
    }

    if (!result.rows.length) {
      console.log('[LOGIN] via url failed', { ip: req.ip, token: t });
      return res.status(404).send('Identifiant administrateur introuvable.');
    }

    const admin = result.rows[0];
    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;
    console.log('[LOGIN] via url success', { ip: req.ip, admin: admin.email });
    return res.redirect('/admin/dashboard.html');
  } catch (err) {
    console.error('[LOGIN URL ERROR]', err && err.stack ? err.stack : err);
    return res.status(500).send('Erreur serveur.');
  }
});

// Générer/obtenir un token pour un administrateur (sécurisé).
// Utilisation : POST /admin/setup-token  { "email": "admin@example.com" }
// Doit fournir l'en-tête `x-setup-key` égal à process.env.ADMIN_SETUP_KEY.
app.post('/admin/setup-token', express.json(), async (req, res) => {
  try {
    const key = req.get('x-setup-key') || req.query.key;
    if (!process.env.ADMIN_SETUP_KEY || !key || key !== process.env.ADMIN_SETUP_KEY) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const email = String((req.body && req.body.email) || req.query.email || '').trim();
    if (!email) return res.status(400).json({ success: false, message: 'Email manquant.' });

    const { rows } = await query('SELECT id, email FROM admins WHERE LOWER(email) = LOWER($1)', [email.toLowerCase()]);
    if (!rows.length) {
      // Crée un administrateur sans mot de passe si absent (token obligatoire).
      const token = require('crypto').randomBytes(16).toString('hex');
      await query('INSERT INTO admins (email, password_hash, admin_token) VALUES ($1, $2, $3)', [email, 'nopass', token]);
      return res.json({ success: true, email, token, url: `/admin/${token}` });
    }

    // Si présent, génère et met à jour un token
    const token = require('crypto').randomBytes(16).toString('hex');
    await query('UPDATE admins SET admin_token = $1 WHERE id = $2', [token, rows[0].id]);
    return res.json({ success: true, email: rows[0].email, token, url: `/admin/${token}` });
  } catch (err) {
    console.error('[SETUP TOKEN ERROR]', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

app.get('/admin/dashboard.html', exigerAuthPage, (req, res) => {
  // Le dashboard est stocké dans `public/dashboard.html`.
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// ------------------------------------------------------------
// Fichiers statiques
// ------------------------------------------------------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// ============================================================
// VALIDATION SERVEUR
// On ne fait jamais confiance aux données du navigateur.
// ============================================================

const SEXES = ['Homme', 'Femme'];
const ETATS_CIVILS = ['Célibataire', 'Marié(e)'];
const PARTICIPATIONS = ['Oui', 'Non', 'Pas encore sûr'];
const SOURCES = ['Église', 'Ami(e)', 'WhatsApp', 'Facebook', 'Instagram', 'Annonce', 'Autre'];

const REGEX_TEL = /^[0-9+()\s.-]{6,20}$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Nettoie une chaîne : trim, suppression des caractères de contrôle, longueur max. */
function nettoyer(valeur, max = 255) {
  if (valeur === null || valeur === undefined) return '';
  return String(valeur)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

function versEntier(valeur, min, max) {
  if (valeur === '' || valeur === null || valeur === undefined) return null;
  const n = Number.parseInt(valeur, 10);
  if (Number.isNaN(n) || n < min || n > max) return null;
  return n;
}

function validerInscription(corps) {
  const erreurs = {};
  const d = {};

  // --- Identité ---
  d.last_name = nettoyer(corps.last_name, 100);
  if (!d.last_name) erreurs.last_name = 'Veuillez saisir votre nom.';

  d.post_name = nettoyer(corps.post_name, 100) || null;

  d.first_name = nettoyer(corps.first_name, 100);
  if (!d.first_name) erreurs.first_name = 'Veuillez saisir votre prénom.';

  d.gender = nettoyer(corps.gender, 20);
  if (!SEXES.includes(d.gender)) erreurs.gender = 'Veuillez sélectionner votre sexe.';

  d.marital_status = nettoyer(corps.marital_status, 20);
  if (!ETATS_CIVILS.includes(d.marital_status)) {
    erreurs.marital_status = 'Veuillez sélectionner votre état civil.';
  }

  // --- Contact ---
  d.phone = nettoyer(corps.phone, 20);
  if (!d.phone) erreurs.phone = 'Veuillez saisir votre numéro de téléphone.';
  else if (!REGEX_TEL.test(d.phone)) erreurs.phone = 'Veuillez saisir un numéro de téléphone valide.';

  d.whatsapp = nettoyer(corps.whatsapp, 20) || null;
  if (d.whatsapp && !REGEX_TEL.test(d.whatsapp)) {
    erreurs.whatsapp = 'Veuillez saisir un numéro WhatsApp valide.';
  }

  d.email = nettoyer(corps.email, 150).toLowerCase();
  if (!d.email) erreurs.email = 'Veuillez saisir votre adresse e-mail.';
  else if (!REGEX_EMAIL.test(d.email)) erreurs.email = 'Veuillez saisir une adresse e-mail valide.';

  // --- Localisation ---
  d.address = nettoyer(corps.address, 200) || null;

  d.city = nettoyer(corps.city, 100);
  if (!d.city) erreurs.city = 'Veuillez saisir votre ville.';

  d.district = nettoyer(corps.district, 100) || null;
  d.commune = nettoyer(corps.commune, 100) || null;
  d.province = nettoyer(corps.province, 100) || null;

  d.country = nettoyer(corps.country, 100);
  if (!d.country) erreurs.country = 'Veuillez saisir votre pays.';

  // --- Participation ---
  d.origin_city = nettoyer(corps.origin_city, 100);
  if (!d.origin_city) erreurs.origin_city = "Veuillez indiquer votre ville d'origine.";

  d.how_heard = nettoyer(corps.how_heard, 50);
  if (!SOURCES.includes(d.how_heard)) {
    erreurs.how_heard = 'Veuillez indiquer comment vous avez connu HAPHAK.';
  }

  d.full_participation = nettoyer(corps.full_participation, 20);
  if (!PARTICIPATIONS.includes(d.full_participation)) {
    erreurs.full_participation = 'Veuillez répondre à cette question.';
  }

  // --- Hébergement ---
  d.needs_accommodation = corps.needs_accommodation === true || corps.needs_accommodation === 'true';
  d.number_of_nights = d.needs_accommodation ? versEntier(corps.number_of_nights, 1, 30) : null;
  if (d.needs_accommodation && d.number_of_nights === null) {
    erreurs.number_of_nights = 'Veuillez indiquer un nombre de nuits (entre 1 et 30).';
  }

  d.comes_alone = !(corps.comes_alone === false || corps.comes_alone === 'false');
  d.companions = d.comes_alone ? null : versEntier(corps.companions, 1, 50);
  if (!d.comes_alone && d.companions === null) {
    erreurs.companions = "Veuillez indiquer le nombre d'accompagnateurs (entre 1 et 50).";
  }

  // --- Compléments ---
  d.special_needs = nettoyer(corps.special_needs, 1000) || null;
  d.comments = nettoyer(corps.comments, 1000) || null;

  // --- Confirmation ---
  if (corps.accuracy !== true && corps.accuracy !== 'true') {
    erreurs.accuracy = "Vous devez confirmer l'exactitude des informations.";
  }
  if (corps.consent !== true && corps.consent !== 'true') {
    erreurs.consent = "Vous devez accepter l'utilisation de vos données.";
  }

  return { erreurs, donnees: d };
}

// ============================================================
// API PUBLIQUE
// ============================================================

// Informations officielles (alimentent la page d'accueil)
app.get('/api/haphak', (req, res) => {
  res.json({ success: true, data: HAPHAK });
});

// --- Création d'une inscription ---
app.post('/api/registrations', limiteInscription, async (req, res, next) => {
  try {
    const { erreurs, donnees } = validerInscription(req.body || {});

    if (Object.keys(erreurs).length) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez corriger les champs signalés.',
        errors: erreurs,
      });
    }

    // --- Détection de doublon (e-mail ou téléphone) ---
    const doublon = await query(
      `SELECT registration_number
         FROM registrations
        WHERE LOWER(email) = LOWER($1) OR phone = $2
        LIMIT 1`,
      [donnees.email, donnees.phone]
    );

    if (doublon.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'Une inscription existe déjà avec ces informations.',
        registration_number: doublon.rows[0].registration_number,
      });
    }

    // --- Numéro d'inscription unique, généré côté serveur ---
    const seq = await query("SELECT nextval('registration_number_seq') AS n");
    const numero = `HAP-${String(seq.rows[0].n).padStart(6, '0')}`;

    const insertion = await query(
      `INSERT INTO registrations (
         registration_number, first_name, last_name, post_name, gender, marital_status,
         phone, whatsapp, email, address, city, district, commune, province, country,
         origin_city, how_heard, full_participation,
         needs_accommodation, number_of_nights, comes_alone, companions,
         special_needs, comments
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
       )
       RETURNING *`,
      [
        numero, donnees.first_name, donnees.last_name, donnees.post_name,
        donnees.gender, donnees.marital_status, donnees.phone, donnees.whatsapp,
        donnees.email, donnees.address, donnees.city, donnees.district,
        donnees.commune, donnees.province, donnees.country, donnees.origin_city,
        donnees.how_heard, donnees.full_participation, donnees.needs_accommodation,
        donnees.number_of_nights, donnees.comes_alone, donnees.companions,
        donnees.special_needs, donnees.comments,
      ]
    );

    const inscription = insertion.rows[0];

    // L'e-mail part après l'enregistrement : un échec ne détruit rien.
    const resultatEmail = await envoyerConfirmation(inscription);

    res.status(201).json({
      success: true,
      registration_number: inscription.registration_number,
      email_status: resultatEmail.statut,
    });
  } catch (err) {
    next(err);
  }
});

// --- Confirmation (consultable avec le numéro d'inscription) ---
app.get('/api/registrations/:numero', async (req, res, next) => {
  try {
    const numero = nettoyer(req.params.numero, 20);

    const { rows } = await query(
      `SELECT registration_number, first_name, last_name, post_name,
              city, needs_accommodation, email_status, created_at
         FROM registrations
        WHERE registration_number = $1`,
      [numero]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Inscription introuvable.' });
    }

    res.json({ success: true, data: rows[0], haphak: HAPHAK });
  } catch (err) {
    next(err);
  }
});

// ============================================================
// API ADMINISTRATION
// ============================================================

app.post('/api/admin/login', limiteConnexion, async (req, res, next) => {
  try {
    console.log('[LOGIN] incoming', { ip: req.ip, url: req.originalUrl, body: req.body });

    const { token, id } = req.body || {};

    let admin = null;

    if (token && String(token).trim() !== '') {
      const t = String(token).trim();
      // Si format adminNN, utiliser l'ID numérique correspondant (ex. admin26 -> id=26)
      const m = t.match(/^admin(\d+)$/i);
      if (m) {
        const n = Number.parseInt(m[1], 10);
        const { rows } = await query('SELECT id, email FROM admins WHERE id = $1', [n]);
        if (!rows.length) {
          console.log('[LOGIN] failed adminNN', { ip: req.ip, token: t });
          return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
        }
        admin = { id: rows[0].id, email: rows[0].email };
      } else {
        // Auth via token unique stocké dans admin_token
        const { rows } = await query('SELECT id, email FROM admins WHERE admin_token = $1', [t]);
        if (!rows.length) {
          console.log('[LOGIN] failed token', { ip: req.ip, token: t });
          return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
        }
        admin = { id: rows[0].id, email: rows[0].email };
      }
    } else if (id !== undefined && id !== null && String(id).trim() !== '') {
      // Backward compat: numeric id
      const n = Number.parseInt(String(id).trim(), 10);
      if (Number.isNaN(n)) {
        console.log('[LOGIN] invalid id', { ip: req.ip, id });
        return res.status(400).json({ success: false, message: 'ID administrateur invalide.' });
      }

      const { rows } = await query('SELECT id, email FROM admins WHERE id = $1', [n]);
      if (!rows.length) {
        console.log('[LOGIN] failed id', { ip: req.ip, id: n });
        return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
      }
      admin = { id: rows[0].id, email: rows[0].email };
    } else {
      // Fallback : ancienne méthode basée sur email+mot de passe
      const adminCred = await verifierIdentifiants(req.body?.email, req.body?.password);
      if (!adminCred) {
        console.log('[LOGIN] failed credentials', { ip: req.ip, email: req.body?.email });
        return res.status(401).json({ success: false, message: 'Identifiants incorrects.' });
      }
      admin = adminCred;
    }

    req.session.adminId = admin.id;
    req.session.adminEmail = admin.email;

    console.log('[LOGIN] success', { ip: req.ip, admin: admin.email });

    res.json({ success: true, data: { email: admin.email } });
  } catch (err) {
    console.error('[LOGIN ERROR]', err && err.stack ? err.stack : err);
    next(err);
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('haphak.sid');
    res.json({ success: true });
  });
});

// --- Identité de l'administrateur connecté ---
app.get('/api/admin/me', exigerAuth, (req, res) => {
  res.json({ success: true, data: { email: req.session.adminEmail } });
});

// --- Statistiques ---
app.get('/api/admin/stats', exigerAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*)::int                                                   AS total,
        COUNT(*) FILTER (WHERE gender = 'Homme')::int                   AS hommes,
        COUNT(*) FILTER (WHERE gender = 'Femme')::int                   AS femmes,
        COUNT(*) FILTER (WHERE needs_accommodation)::int                AS avec_hebergement,
        COUNT(*) FILTER (WHERE NOT needs_accommodation)::int            AS sans_hebergement,
        COUNT(*) FILTER (WHERE email_status = 'failed')::int            AS emails_echoues
      FROM registrations
    `);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * Construit la clause WHERE de la recherche et des filtres.
 * Toutes les valeurs sont passées en paramètres ($1, $2…).
 */
function construireFiltres(q) {
  const conditions = [];
  const valeurs = [];
  const ajouter = (sql, valeur) => {
    valeurs.push(valeur);
    conditions.push(sql.replace('?', `$${valeurs.length}`));
  };

  const recherche = nettoyer(q.search, 100);
  if (recherche) {
    valeurs.push(`%${recherche.toLowerCase()}%`);
    const p = `$${valeurs.length}`;
    conditions.push(`(
      LOWER(last_name) LIKE ${p} OR
      LOWER(post_name) LIKE ${p} OR
      LOWER(first_name) LIKE ${p} OR
      LOWER(email) LIKE ${p} OR
      LOWER(city) LIKE ${p} OR
      LOWER(registration_number) LIKE ${p} OR
      phone LIKE ${p}
    )`);
  }

  const genre = nettoyer(q.gender, 20);
  if (SEXES.includes(genre)) ajouter('gender = ?', genre);

  const ville = nettoyer(q.city, 100);
  if (ville) ajouter('LOWER(city) = LOWER(?)', ville);

  if (q.accommodation === 'true' || q.accommodation === 'false') {
    ajouter('needs_accommodation = ?', q.accommodation === 'true');
  }

  const participation = nettoyer(q.participation, 20);
  if (PARTICIPATIONS.includes(participation)) ajouter('full_participation = ?', participation);

  const statutEmail = nettoyer(q.email_status, 20);
  if (['pending', 'sent', 'failed'].includes(statutEmail)) ajouter('email_status = ?', statutEmail);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, valeurs };
}

// --- Liste paginée ---
app.get('/api/admin/registrations', exigerAuth, async (req, res, next) => {
  try {
    const { where, valeurs } = construireFiltres(req.query);

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const parPage = Math.min(Math.max(parseInt(req.query.per_page, 10) || 25, 1), 100);
    const decalage = (page - 1) * parPage;

    const total = await query(`SELECT COUNT(*)::int AS n FROM registrations ${where}`, valeurs);

    const resultats = await query(
      `SELECT id, registration_number, first_name, last_name, post_name, phone, email,
              city, needs_accommodation, email_status, created_at
         FROM registrations
         ${where}
        ORDER BY created_at DESC
        LIMIT $${valeurs.length + 1} OFFSET $${valeurs.length + 2}`,
      [...valeurs, parPage, decalage]
    );

    res.json({
      success: true,
      data: resultats.rows,
      pagination: {
        page,
        per_page: parPage,
        total: total.rows[0].n,
        total_pages: Math.max(Math.ceil(total.rows[0].n / parPage), 1),
      },
    });
  } catch (err) {
    next(err);
  }
});

// --- Villes disponibles (pour le filtre) ---
app.get('/api/admin/cities', exigerAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT city, COUNT(*)::int AS n FROM registrations GROUP BY city ORDER BY n DESC, city ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// --- Fiche participant ---
app.get('/api/admin/registrations/:id', exigerAuth, async (req, res, next) => {
  try {
    const id = versEntier(req.params.id, 1, 2147483647);
    if (id === null) return res.status(400).json({ success: false, message: 'Identifiant invalide.' });

    const { rows } = await query('SELECT * FROM registrations WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Participant introuvable.' });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// --- Modification ---
app.put('/api/admin/registrations/:id', exigerAuth, async (req, res, next) => {
  try {
    const id = versEntier(req.params.id, 1, 2147483647);
    if (id === null) return res.status(400).json({ success: false, message: 'Identifiant invalide.' });

    const existant = await query('SELECT id FROM registrations WHERE id = $1', [id]);
    if (!existant.rows.length) {
      return res.status(404).json({ success: false, message: 'Participant introuvable.' });
    }

    const { erreurs, donnees } = validerInscription({
      ...req.body,
      accuracy: 'true',  // ces deux cases ne concernent que le formulaire public
      consent: 'true',
    });

    if (Object.keys(erreurs).length) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez corriger les champs signalés.',
        errors: erreurs,
      });
    }

    // Un autre participant utilise-t-il déjà cet e-mail ou ce téléphone ?
    const conflit = await query(
      `SELECT registration_number FROM registrations
        WHERE (LOWER(email) = LOWER($1) OR phone = $2) AND id <> $3 LIMIT 1`,
      [donnees.email, donnees.phone, id]
    );

    if (conflit.rows.length) {
      return res.status(409).json({
        success: false,
        message: `Ces coordonnées sont déjà utilisées par l'inscription ${conflit.rows[0].registration_number}.`,
      });
    }

    const { rows } = await query(
      `UPDATE registrations SET
         first_name = $1, last_name = $2, post_name = $3, gender = $4, marital_status = $5,
         phone = $6, whatsapp = $7, email = $8, address = $9, city = $10, district = $11,
         commune = $12, province = $13, country = $14, origin_city = $15, how_heard = $16,
         full_participation = $17, needs_accommodation = $18, number_of_nights = $19,
         comes_alone = $20, companions = $21, special_needs = $22, comments = $23
       WHERE id = $24
       RETURNING *`,
      [
        donnees.first_name, donnees.last_name, donnees.post_name, donnees.gender,
        donnees.marital_status, donnees.phone, donnees.whatsapp, donnees.email,
        donnees.address, donnees.city, donnees.district, donnees.commune,
        donnees.province, donnees.country, donnees.origin_city, donnees.how_heard,
        donnees.full_participation, donnees.needs_accommodation, donnees.number_of_nights,
        donnees.comes_alone, donnees.companions, donnees.special_needs, donnees.comments,
        id,
      ]
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// --- Suppression ---
app.delete('/api/admin/registrations/:id', exigerAuth, async (req, res, next) => {
  try {
    const id = versEntier(req.params.id, 1, 2147483647);
    if (id === null) return res.status(400).json({ success: false, message: 'Identifiant invalide.' });

    const { rowCount } = await query('DELETE FROM registrations WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Participant introuvable.' });

    res.json({ success: true, message: 'Inscription supprimée.' });
  } catch (err) {
    next(err);
  }
});

// --- Renvoi de l'e-mail de confirmation ---
app.post('/api/admin/registrations/:id/resend', exigerAuth, async (req, res, next) => {
  try {
    const id = versEntier(req.params.id, 1, 2147483647);
    if (id === null) return res.status(400).json({ success: false, message: 'Identifiant invalide.' });

    const { rows } = await query('SELECT * FROM registrations WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Participant introuvable.' });

    const resultat = await envoyerConfirmation(rows[0]);

    if (resultat.statut === 'sent') {
      return res.json({ success: true, message: 'E-mail renvoyé.', email_status: 'sent' });
    }

    res.status(502).json({
      success: false,
      message: "L'envoi a échoué. Vérifiez la configuration SMTP.",
      email_status: 'failed',
    });
  } catch (err) {
    next(err);
  }
});

// --- Export CSV (respecte les filtres appliqués) ---
app.get('/api/admin/export.csv', exigerAuth, async (req, res, next) => {
  try {
    const { where, valeurs } = construireFiltres(req.query);

    const { rows } = await query(
      `SELECT registration_number, last_name, post_name, first_name, gender, marital_status,
              phone, whatsapp, email, address, city, district, commune, province, country,
              origin_city, how_heard, full_participation, needs_accommodation,
              number_of_nights, comes_alone, companions, special_needs, comments,
              email_status, created_at
         FROM registrations
         ${where}
        ORDER BY created_at DESC`,
      valeurs
    );

    const entetes = [
      "Numéro", 'Nom', 'Postnom', 'Prénom', 'Sexe', 'État civil',
      'Téléphone', 'WhatsApp', 'E-mail', 'Adresse', 'Ville', 'Quartier', 'Commune',
      'Province', 'Pays', "Ville d'origine", 'Connu par', 'Participation complète',
      'Hébergement', 'Nuits', 'Vient seul', 'Accompagnateurs',
      'Besoins particuliers', 'Commentaires', 'Statut e-mail', "Date d'inscription",
    ];

    // Échappement CSV : guillemets doublés, et préfixe de sécurité contre
    // l'injection de formules dans Excel.
    const cellule = (v) => {
      if (v === null || v === undefined) return '""';
      let s = String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lignes = rows.map((r) => [
      r.registration_number, r.last_name, r.post_name, r.first_name, r.gender, r.marital_status,
      r.phone, r.whatsapp, r.email, r.address, r.city, r.district, r.commune,
      r.province, r.country, r.origin_city, r.how_heard, r.full_participation,
      r.needs_accommodation ? 'Oui' : 'Non', r.number_of_nights,
      r.comes_alone ? 'Oui' : 'Non', r.companions,
      r.special_needs, r.comments, r.email_status,
      r.created_at ? new Date(r.created_at).toISOString() : '',
    ].map(cellule).join(','));

    const csv = [entetes.map(cellule).join(','), ...lignes].join('\r\n');
    const nomFichier = `haphak-inscriptions-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomFichier}"`);
    res.send('\uFEFF' + csv); // BOM : accents corrects dans Excel
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// Santé
// ------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ success: true, status: 'ok' });
  } catch (err) {
    res.status(503).json({ success: false, status: 'base de données indisponible' });
  }
});

// ------------------------------------------------------------
// Erreurs
// ------------------------------------------------------------
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Ressource introuvable.' });
  }
  res.status(404).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Les détails restent dans les logs du serveur, jamais chez le client.
  console.error(`[${new Date().toISOString()}]`, err.message);
  res.status(500).json({ success: false, message: 'Une erreur est survenue. Veuillez réessayer.' });
});

// ------------------------------------------------------------
// Démarrage
// ------------------------------------------------------------
async function demarrer() {
  try {
    await testConnection();
    await initSchema();
    await initAdmin();
  } catch (err) {
    console.error('❌ Échec de préparation de la base de données :', err.message);
    if (EN_PRODUCTION) process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  HAPHAK — serveur démarré sur le port ${PORT}`);
    console.log(`  Site           : ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`  Administration : ${process.env.APP_URL || `http://localhost:${PORT}`}/admin/<token>  (connexion via URL unique)`);
  });
}

demarrer();

module.exports = app;
