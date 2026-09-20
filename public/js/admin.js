/* ============================================================
   Administration HAPHAK — tableau de bord.
   ============================================================ */

(() => {
  let page = 1;
  let totalPages = 1;
  let participantCourant = null;

  // ----------------------------------------------------------
  // Session
  // ----------------------------------------------------------
  function versConnexion() {
    window.location.href = '/admin/login.html';
  }

  async function appel(promesse) {
    try {
      return await promesse;
    } catch (err) {
      if (err.status === 401) { versConnexion(); return null; }
      throw err;
    }
  }

  document.getElementById('deconnexion').addEventListener('click', async () => {
    try { await API.post('/api/admin/logout'); } catch (e) { /* on sort quand même */ }
    versConnexion();
  });

  // ----------------------------------------------------------
  // Filtres
  // ----------------------------------------------------------
  function parametres() {
    const p = new URLSearchParams();
    const mettre = (cle, valeur) => { if (valeur) p.set(cle, valeur); };

    mettre('search', document.getElementById('f-search').value.trim());
    mettre('gender', document.getElementById('f-gender').value);
    mettre('city', document.getElementById('f-city').value);
    mettre('accommodation', document.getElementById('f-accommodation').value);
    mettre('participation', document.getElementById('f-participation').value);
    mettre('email_status', document.getElementById('f-email').value);
    return p;
  }

  // ----------------------------------------------------------
  // Statistiques
  // ----------------------------------------------------------
  async function chargerStats() {
    const reponse = await appel(API.get('/api/admin/stats'));
    if (!reponse) return;
    const s = reponse.data;

    const cartes = [
      ['Total inscrits', s.total, true],
      ['Hommes', s.hommes],
      ['Femmes', s.femmes],
      ['Avec hébergement', s.avec_hebergement],
      ['Sans hébergement', s.sans_hebergement],
    ];

    if (s.emails_echoues > 0) cartes.push(['E-mails en échec', s.emails_echoues]);

    document.getElementById('stats').innerHTML = cartes.map(([libelle, valeur, accent]) => `
      <div class="stat ${accent ? 'stat--accent' : ''}">
        <div class="stat__valeur">${valeur}</div>
        <div class="stat__libelle">${esc(libelle)}</div>
      </div>`).join('');
  }

  // ----------------------------------------------------------
  // Villes (filtre)
  // ----------------------------------------------------------
  async function chargerVilles() {
    const reponse = await appel(API.get('/api/admin/cities'));
    if (!reponse) return;
    const select = document.getElementById('f-city');
    const choisie = select.value;
    select.innerHTML = '<option value="">Toutes</option>'
      + reponse.data.map((v) => `<option value="${esc(v.city)}">${esc(v.city)} (${v.n})</option>`).join('');
    select.value = choisie;
  }

  // ----------------------------------------------------------
  // Liste
  // ----------------------------------------------------------
  async function chargerListe() {
    const p = parametres();
    p.set('page', page);
    p.set('per_page', 25);

    const reponse = await appel(API.get(`/api/admin/registrations?${p.toString()}`));
    if (!reponse) return;

    const { data, pagination } = reponse;
    totalPages = pagination.total_pages;

    document.getElementById('compteur').textContent =
      `${pagination.total} inscription${pagination.total > 1 ? 's' : ''} correspondant aux critères.`;

    const corps = document.getElementById('corps');
    const cartes = document.getElementById('cartes');
    const vide = document.getElementById('vide');

    if (!data.length) {
      corps.innerHTML = '';
      cartes.innerHTML = '';
      vide.innerHTML = `
        <div class="vide">
          <h2>Aucune inscription</h2>
          <p>Aucun participant ne correspond à ces critères.</p>
        </div>`;
      document.getElementById('pagination').hidden = true;
      return;
    }

    vide.innerHTML = '';

    corps.innerHTML = data.map((r) => `
      <tr>
        <td>${esc(r.registration_number)}</td>
        <td>${esc(r.last_name)}</td>
        <td>${esc(ouTiret(r.post_name))}</td>
        <td>${esc(r.first_name)}</td>
        <td>${esc(r.phone)}</td>
        <td>${esc(r.email)}</td>
        <td>${esc(r.city)}</td>
        <td>${pastilleOuiNon(r.needs_accommodation)}</td>
        <td>${dateCourte(r.created_at)}</td>
        <td>${pastilleEmail(r.email_status)}</td>
        <td><button type="button" class="bouton bouton--petit bouton--discret" data-id="${r.id}">Ouvrir</button></td>
      </tr>`).join('');

    cartes.innerHTML = data.map((r) => `
      <article class="carte">
        <div class="carte__entete">
          <span class="carte__nom">${esc(r.first_name)} ${esc(r.last_name)}</span>
          <span class="carte__num">${esc(r.registration_number)}</span>
        </div>
        <div class="carte__ligne"><span>Téléphone</span><span>${esc(r.phone)}</span></div>
        <div class="carte__ligne"><span>E-mail</span><span>${esc(r.email)}</span></div>
        <div class="carte__ligne"><span>Ville</span><span>${esc(r.city)}</span></div>
        <div class="carte__ligne"><span>Hébergement</span><span>${pastilleOuiNon(r.needs_accommodation)}</span></div>
        <div class="carte__ligne"><span>Inscrit le</span><span>${dateCourte(r.created_at)}</span></div>
        <div class="carte__ligne"><span>E-mail</span><span>${pastilleEmail(r.email_status)}</span></div>
        <div class="carte__actions">
          <button type="button" class="bouton bouton--petit bouton--secondaire" data-id="${r.id}">Voir la fiche</button>
        </div>
      </article>`).join('');

    document.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => ouvrirFiche(btn.dataset.id));
    });

    document.getElementById('pagination').hidden = totalPages <= 1;
    document.getElementById('info-page').textContent = `Page ${pagination.page} sur ${totalPages}`;
    document.getElementById('prec').disabled = pagination.page <= 1;
    document.getElementById('suiv').disabled = pagination.page >= totalPages;
  }

  async function tout() {
    masquerAlerte();
    try {
      const moi = await appel(API.get('/api/admin/me'));
      if (moi) document.getElementById('admin-email').textContent = moi.data.email;
      await chargerStats();
      await chargerVilles();
      await chargerListe();
    } catch (err) {
      alerter(err.message);
    }
  }

  // ----------------------------------------------------------
  // Commandes
  // ----------------------------------------------------------
  document.getElementById('appliquer').addEventListener('click', () => { page = 1; tout(); });
  document.getElementById('f-search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { page = 1; tout(); }
  });
  document.getElementById('reinitialiser').addEventListener('click', () => {
    document.getElementById('outils').reset();
    page = 1;
    tout();
  });
  document.getElementById('prec').addEventListener('click', () => { if (page > 1) { page -= 1; chargerListe(); } });
  document.getElementById('suiv').addEventListener('click', () => { if (page < totalPages) { page += 1; chargerListe(); } });

  document.getElementById('exporter').addEventListener('click', () => {
    window.location.href = `/api/admin/export.csv?${parametres().toString()}`;
  });

  // ----------------------------------------------------------
  // Fiche participant
  // ----------------------------------------------------------
  const panneau = document.getElementById('panneau');
  const voile = document.getElementById('voile');

  const GROUPES = [
    ['Identité', [
      ['registration_number', "Numéro d'inscription"],
      ['last_name', 'Nom'], ['post_name', 'Postnom'], ['first_name', 'Prénom'],
      ['gender', 'Sexe'], ['marital_status', 'État civil'],
    ]],
    ['Contact', [
      ['phone', 'Téléphone'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'],
      ['address', 'Adresse'], ['city', 'Ville'], ['district', 'Quartier'],
      ['commune', 'Commune'], ['province', 'Province'], ['country', 'Pays'],
    ]],
    ['Participation', [
      ['origin_city', "Ville d'origine"], ['how_heard', 'Connu par'],
      ['full_participation', 'Participation complète'],
    ]],
    ['Hébergement', [
      ['needs_accommodation', 'Hébergement', 'bool'],
      ['number_of_nights', 'Nuits'],
      ['comes_alone', 'Vient seul(e)', 'bool'],
      ['companions', 'Accompagnateurs'],
      ['special_needs', 'Besoins particuliers'],
      ['comments', 'Commentaires'],
    ]],
    ['Suivi', [
      ['email_status', 'Statut e-mail', 'email'],
      ['email_sent_at', 'E-mail envoyé le', 'datetime'],
      ['email_error', 'Dernière erreur'],
      ['created_at', 'Inscrit le', 'datetime'],
      ['updated_at', 'Modifié le', 'datetime'],
    ]],
  ];

  function rendu(valeur, type) {
    if (type === 'bool') return valeur ? 'Oui' : 'Non';
    if (type === 'datetime') return dateLongue(valeur);
    if (type === 'email') return LIBELLES_EMAIL[valeur] || valeur;
    return ouTiret(valeur);
  }

  function alerterPanneau(message, type = 'erreur') {
    const zone = document.getElementById('panneau-alerte');
    zone.className = `alerte alerte--${type}`;
    zone.textContent = message;
    zone.hidden = false;
  }

  async function ouvrirFiche(id) {
    try {
      const reponse = await appel(API.get(`/api/admin/registrations/${encodeURIComponent(id)}`));
      if (!reponse) return;
      participantCourant = reponse.data;

      document.getElementById('panneau-titre').textContent =
        `${participantCourant.first_name} ${participantCourant.last_name}`;
      document.getElementById('panneau-num').textContent = participantCourant.registration_number;

      document.getElementById('fiche').innerHTML = GROUPES.map(([titre, champs]) => `
        <div class="recap__groupe">
          <h3>${esc(titre)}</h3>
          <dl style="margin:0">
            ${champs.map(([cle, libelle, type]) => `
              <div class="recap__ligne">
                <dt>${esc(libelle)}</dt>
                <dd>${esc(rendu(participantCourant[cle], type))}</dd>
              </div>`).join('')}
          </dl>
        </div>`).join('');

      document.getElementById('fiche').hidden = false;
      document.getElementById('form-edition').hidden = true;
      document.getElementById('panneau-alerte').hidden = true;

      panneau.hidden = false;
      requestAnimationFrame(() => {
        panneau.classList.add('ouvert');
        voile.classList.add('ouvert');
      });
      document.getElementById('fermer').focus();
    } catch (err) {
      alerter(err.message);
    }
  }

  function fermerFiche() {
    panneau.classList.remove('ouvert');
    voile.classList.remove('ouvert');
    setTimeout(() => { panneau.hidden = true; }, 260);
    participantCourant = null;
  }

  document.getElementById('fermer').addEventListener('click', fermerFiche);
  voile.addEventListener('click', fermerFiche);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panneau.hidden) fermerFiche();
  });

  // ----------------------------------------------------------
  // Modification
  // ----------------------------------------------------------
  const CHAMPS_EDITION = [
    ['last_name', 'Nom', 'text'],
    ['post_name', 'Postnom', 'text'],
    ['first_name', 'Prénom', 'text'],
    ['gender', 'Sexe', 'select', ['Homme', 'Femme']],
    ['marital_status', 'État civil', 'select', ['Célibataire', 'Marié(e)']],
    ['phone', 'Téléphone', 'tel'],
    ['whatsapp', 'WhatsApp', 'tel'],
    ['email', 'E-mail', 'email'],
    ['address', 'Adresse', 'text'],
    ['city', 'Ville', 'text'],
    ['district', 'Quartier', 'text'],
    ['commune', 'Commune', 'text'],
    ['province', 'Province', 'text'],
    ['country', 'Pays', 'text'],
    ['origin_city', "Ville d'origine", 'text'],
    ['how_heard', 'Connu par', 'select',
      ['Église', 'Ami(e)', 'WhatsApp', 'Facebook', 'Instagram', 'Annonce', 'Autre']],
    ['full_participation', 'Participation complète', 'select', ['Oui', 'Non', 'Pas encore sûr']],
    ['needs_accommodation', 'Hébergement', 'select', ['Non', 'Oui']],
    ['number_of_nights', 'Nuits', 'number'],
    ['comes_alone', 'Vient seul(e)', 'select', ['Oui', 'Non']],
    ['companions', 'Accompagnateurs', 'number'],
    ['special_needs', 'Besoins particuliers', 'textarea'],
    ['comments', 'Commentaires', 'textarea'],
  ];

  document.getElementById('btn-modifier').addEventListener('click', () => {
    if (!participantCourant) return;
    const p = participantCourant;

    document.getElementById('champs-edition').innerHTML = CHAMPS_EDITION.map(([cle, libelle, type, options]) => {
      let valeur = p[cle];
      if (cle === 'needs_accommodation') valeur = p[cle] ? 'Oui' : 'Non';
      if (cle === 'comes_alone') valeur = p[cle] ? 'Oui' : 'Non';
      valeur = valeur ?? '';

      if (type === 'select') {
        return `<div class="champ">
          <label class="champ__label" for="e-${cle}">${esc(libelle)}</label>
          <select id="e-${cle}">
            ${options.map((o) => `<option value="${esc(o)}"${o === valeur ? ' selected' : ''}>${esc(o)}</option>`).join('')}
          </select>
          <span class="erreur" data-erreur-edit="${cle}"></span>
        </div>`;
      }
      if (type === 'textarea') {
        return `<div class="champ">
          <label class="champ__label" for="e-${cle}">${esc(libelle)}</label>
          <textarea id="e-${cle}">${esc(valeur)}</textarea>
          <span class="erreur" data-erreur-edit="${cle}"></span>
        </div>`;
      }
      return `<div class="champ">
        <label class="champ__label" for="e-${cle}">${esc(libelle)}</label>
        <input type="${type}" id="e-${cle}" value="${esc(valeur)}" />
        <span class="erreur" data-erreur-edit="${cle}"></span>
      </div>`;
    }).join('');

    document.getElementById('fiche').hidden = true;
    document.getElementById('form-edition').hidden = false;
  });

  document.getElementById('btn-annuler').addEventListener('click', () => {
    document.getElementById('form-edition').hidden = true;
    document.getElementById('fiche').hidden = false;
  });

  document.getElementById('form-edition').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!participantCourant) return;

    document.querySelectorAll('[data-erreur-edit]').forEach((z) => (z.textContent = ''));

    const corps = {};
    CHAMPS_EDITION.forEach(([cle, , type]) => {
      const champ = document.getElementById(`e-${cle}`);
      if (!champ) return;
      let v = champ.value.trim();
      if (cle === 'needs_accommodation' || cle === 'comes_alone') v = v === 'Oui';
      else if (type === 'number') v = v === '' ? null : Number(v);
      corps[cle] = v;
    });

    try {
      const reponse = await appel(API.put(
        `/api/admin/registrations/${encodeURIComponent(participantCourant.id)}`,
        corps
      ));
      if (!reponse) return;

      participantCourant = reponse.data;
      alerterPanneau('Modifications enregistrées.', 'succes');
      await ouvrirFiche(participantCourant.id);
      await tout();
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([cle, msg]) => {
          const zone = document.querySelector(`[data-erreur-edit="${cle}"]`);
          if (zone) zone.textContent = msg;
        });
        alerterPanneau('Veuillez corriger les champs signalés.');
        return;
      }
      alerterPanneau(err.message);
    }
  });

  // ----------------------------------------------------------
  // Suppression
  // ----------------------------------------------------------
  document.getElementById('btn-supprimer').addEventListener('click', async () => {
    if (!participantCourant) return;

    const confirme = window.confirm(
      `Supprimer définitivement l'inscription ${participantCourant.registration_number} `
      + `(${participantCourant.first_name} ${participantCourant.last_name}) ?\n\n`
      + 'Cette action est irréversible.'
    );
    if (!confirme) return;

    try {
      const reponse = await appel(API.del(`/api/admin/registrations/${encodeURIComponent(participantCourant.id)}`));
      if (!reponse) return;
      fermerFiche();
      await tout();
    } catch (err) {
      alerterPanneau(err.message);
    }
  });

  // ----------------------------------------------------------
  // Renvoi de l'e-mail
  // ----------------------------------------------------------
  document.getElementById('btn-renvoyer').addEventListener('click', async () => {
    if (!participantCourant) return;
    const bouton = document.getElementById('btn-renvoyer');
    bouton.disabled = true;
    bouton.textContent = 'Envoi…';

    try {
      await appel(API.post(`/api/admin/registrations/${encodeURIComponent(participantCourant.id)}/resend`));
      alerterPanneau(`E-mail renvoyé à ${participantCourant.email}.`, 'succes');
      await ouvrirFiche(participantCourant.id);
      await chargerListe();
    } catch (err) {
      alerterPanneau(err.message);
    } finally {
      bouton.disabled = false;
      bouton.textContent = "Renvoyer l'e-mail";
    }
  });

  document.getElementById('btn-imprimer').addEventListener('click', () => window.print());

  // ----------------------------------------------------------
  // Démarrage
  // ----------------------------------------------------------
  tout();
})();
