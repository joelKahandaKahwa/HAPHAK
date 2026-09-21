/* ============================================================
   Utilitaires partagés du frontend HAPHAK.
   ============================================================ */

/** Appel JSON vers l'API. Lève une Error enrichie en cas d'échec. */
async function apiFetch(chemin, options = {}) {
  // Si l'utilisateur ouvre les fichiers localement (file://),
  // rediriger les appels API vers http://localhost:3000 par défaut.
  const base = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : '';

  let reponse;
  try {
    reponse = await fetch(base + chemin, {
      // Inclure les cookies pour permettre la session (utile en dev sur localhost).
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
  } catch (e) {
    throw new Error('Impossible de contacter le serveur. Vérifiez que le serveur est démarré et que vous accédez au site via http://localhost:3000');
  }

  let donnees;
  try {
    donnees = await reponse.json();
  } catch (e) {
    throw new Error('Réponse inattendue du serveur.');
  }

  if (!reponse.ok) {
    const erreur = new Error(donnees.message || 'Une erreur est survenue.');
    erreur.status = reponse.status;
    erreur.errors = donnees.errors || null;
    erreur.payload = donnees;
    throw erreur;
  }

  return donnees;
}

const API = {
  get: (chemin) => apiFetch(chemin),
  post: (chemin, corps) => apiFetch(chemin, { method: 'POST', body: JSON.stringify(corps || {}) }),
  put: (chemin, corps) => apiFetch(chemin, { method: 'PUT', body: JSON.stringify(corps || {}) }),
  del: (chemin) => apiFetch(chemin, { method: 'DELETE' }),
};

/** Échappe le HTML avant toute insertion dans le DOM. */
function esc(valeur) {
  return String(valeur ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Valeur affichable, avec tiret si vide. */
function ouTiret(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  return valeur;
}

function dateCourte(valeur) {
  if (!valeur) return '—';
  return new Date(valeur).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function dateLongue(valeur) {
  if (!valeur) return '—';
  return new Date(valeur).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const LIBELLES_EMAIL = { pending: 'En attente', sent: 'Envoyé', failed: 'Échec' };

function pastilleEmail(statut) {
  return `<span class="pastille pastille--${esc(statut)}">${esc(LIBELLES_EMAIL[statut] || statut)}</span>`;
}

function pastilleOuiNon(valeur) {
  return valeur
    ? '<span class="pastille pastille--oui">Oui</span>'
    : '<span class="pastille pastille--non">Non</span>';
}

/** Affiche un message dans la zone #alerte. */
function alerter(message, type = 'erreur') {
  const zone = document.getElementById('alerte');
  if (!zone) return;
  zone.className = `alerte alerte--${type}`;
  zone.textContent = message;
  zone.hidden = false;
  zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function masquerAlerte() {
  const zone = document.getElementById('alerte');
  if (zone) { zone.hidden = true; zone.textContent = ''; }
}
