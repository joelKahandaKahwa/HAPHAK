/* ============================================================
   Formulaire d'inscription HAPHAK.
   La validation ici sert au confort ; le serveur revalide tout.
   ============================================================ */

(() => {
  const TOTAL = 5;
  const NOMS = ['Identité', 'Contact', 'Participation', 'Hébergement', 'Vérification'];

  const form = document.getElementById('form');
  const etapes = Array.from(document.querySelectorAll('.etape'));
  const barre = document.getElementById('barre');
  const nomEtape = document.getElementById('nom-etape');
  const numEtape = document.getElementById('num-etape');
  const btnPrecedent = document.getElementById('precedent');
  const btnSuivant = document.getElementById('suivant');

  let courante = 1;
  let envoiEnCours = false;

  const REGEX_TEL = /^[0-9+()\s.-]{6,20}$/;
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------
  function afficher(n) {
    courante = n;
    etapes.forEach((e) => e.classList.toggle('active', Number(e.dataset.etape) === n));

    barre.style.width = `${(n / TOTAL) * 100}%`;
    barre.setAttribute('aria-valuenow', n);
    nomEtape.textContent = NOMS[n - 1];
    numEtape.textContent = n;

    btnPrecedent.style.visibility = n === 1 ? 'hidden' : 'visible';
    btnSuivant.textContent = n === TOTAL ? 'Confirmer mon inscription' : 'Continuer';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const titre = document.querySelector('.etape.active .etape__titre');
    if (titre) { titre.setAttribute('tabindex', '-1'); titre.focus({ preventScroll: true }); }
  }

  btnPrecedent.addEventListener('click', () => {
    masquerAlerte();
    if (courante > 1) afficher(courante - 1);
  });

  btnSuivant.addEventListener('click', async () => {
    masquerAlerte();

    if (!valider(courante)) {
      alerter('Veuillez corriger les champs signalés.');
      return;
    }

    if (courante === TOTAL) {
      await envoyer();
      return;
    }

    if (courante === 4) construireRecap();
    afficher(courante + 1);
  });

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      btnSuivant.click();
    }
  });

  // ----------------------------------------------------------
  // Blocs conditionnels
  // ----------------------------------------------------------
  function brancher(nom, valeurDeclenchante, idBloc) {
    const bloc = document.getElementById(idBloc);
    const majuscule = () => {
      const choisi = form.querySelector(`input[name="${nom}"]:checked`);
      bloc.classList.toggle('visible', !!choisi && choisi.value === valeurDeclenchante);
    };
    form.querySelectorAll(`input[name="${nom}"]`).forEach((r) => r.addEventListener('change', majuscule));
    majuscule();
  }

  brancher('needs_accommodation', 'true', 'bloc-nuits');
  brancher('comes_alone', 'false', 'bloc-accompagnateurs');

  // ----------------------------------------------------------
  // Lecture des champs
  // ----------------------------------------------------------
  function val(nom) {
    const champ = form.querySelector(`[name="${nom}"]`);
    if (!champ) return '';
    if (champ.type === 'radio') {
      const choisi = form.querySelector(`[name="${nom}"]:checked`);
      return choisi ? choisi.value : '';
    }
    if (champ.type === 'checkbox') return champ.checked;
    return champ.value.trim();
  }

  function poserErreur(nom, message) {
    const zone = document.querySelector(`[data-erreur="${nom}"]`);
    if (zone) zone.textContent = message || '';
    const champ = form.querySelector(`[name="${nom}"]`);
    if (champ && champ.type !== 'radio' && champ.type !== 'checkbox') {
      champ.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }

  function viderErreurs(section) {
    section.querySelectorAll('.erreur').forEach((e) => (e.textContent = ''));
    section.querySelectorAll('[aria-invalid]').forEach((e) => e.setAttribute('aria-invalid', 'false'));
  }

  form.addEventListener('input', (e) => {
    if (e.target.name) poserErreur(e.target.name, '');
  });
  form.addEventListener('change', (e) => {
    if (e.target.name) poserErreur(e.target.name, '');
  });

  // ----------------------------------------------------------
  // Règles par étape
  // ----------------------------------------------------------
  const REGLES = {
    1: () => {
      const e = {};
      if (!val('last_name')) e.last_name = 'Veuillez saisir votre nom.';
      if (!val('first_name')) e.first_name = 'Veuillez saisir votre prénom.';
      if (!val('gender')) e.gender = 'Veuillez sélectionner votre sexe.';
      if (!val('marital_status')) e.marital_status = 'Veuillez sélectionner votre état civil.';
      return e;
    },
    2: () => {
      const e = {};
      const tel = val('phone');
      if (!tel) e.phone = 'Veuillez saisir votre numéro de téléphone.';
      else if (!REGEX_TEL.test(tel)) e.phone = 'Veuillez saisir un numéro de téléphone valide.';

      const wa = val('whatsapp');
      if (wa && !REGEX_TEL.test(wa)) e.whatsapp = 'Veuillez saisir un numéro WhatsApp valide.';

      const mail = val('email');
      if (!mail) e.email = 'Veuillez saisir votre adresse e-mail.';
      else if (!REGEX_EMAIL.test(mail)) e.email = 'Veuillez saisir une adresse e-mail valide.';

      if (!val('city')) e.city = 'Veuillez saisir votre ville.';
      if (!val('country')) e.country = 'Veuillez saisir votre pays.';
      return e;
    },
    3: () => {
      const e = {};
      if (!val('origin_city')) e.origin_city = "Veuillez indiquer votre ville d'origine.";
      if (!val('how_heard')) e.how_heard = 'Veuillez indiquer comment vous avez connu HAPHAK.';
      if (!val('full_participation')) e.full_participation = 'Veuillez répondre à cette question.';
      return e;
    },
    4: () => {
      const e = {};
      if (val('needs_accommodation') === 'true') {
        const nuits = Number(val('number_of_nights'));
        if (!val('number_of_nights') || !Number.isInteger(nuits) || nuits < 1 || nuits > 30) {
          e.number_of_nights = 'Veuillez indiquer un nombre de nuits (entre 1 et 30).';
        }
      }
      if (val('comes_alone') === 'false') {
        const n = Number(val('companions'));
        if (!val('companions') || !Number.isInteger(n) || n < 1 || n > 50) {
          e.companions = "Veuillez indiquer le nombre d'accompagnateurs (entre 1 et 50).";
        }
      }
      return e;
    },
    5: () => {
      const e = {};
      if (!val('accuracy')) e.accuracy = "Vous devez confirmer l'exactitude des informations.";
      if (!val('consent')) e.consent = "Vous devez accepter l'utilisation de vos données.";
      return e;
    },
  };

  function valider(n) {
    const section = etapes.find((e) => Number(e.dataset.etape) === n);
    viderErreurs(section);

    const erreurs = REGLES[n] ? REGLES[n]() : {};
    Object.entries(erreurs).forEach(([nom, msg]) => poserErreur(nom, msg));

    if (Object.keys(erreurs).length) {
      const premier = section.querySelector('[aria-invalid="true"]');
      if (premier) premier.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return false;
    }
    return true;
  }

  // ----------------------------------------------------------
  // Collecte
  // ----------------------------------------------------------
  function collecter() {
    const hebergement = val('needs_accommodation') === 'true';
    const seul = val('comes_alone') !== 'false';

    return {
      last_name: val('last_name'),
      post_name: val('post_name'),
      first_name: val('first_name'),
      gender: val('gender'),
      marital_status: val('marital_status'),

      phone: val('phone'),
      whatsapp: val('whatsapp'),
      email: val('email'),
      address: val('address'),
      city: val('city'),
      district: val('district'),
      commune: val('commune'),
      province: val('province'),
      country: val('country'),

      origin_city: val('origin_city'),
      how_heard: val('how_heard'),
      full_participation: val('full_participation'),

      needs_accommodation: hebergement,
      number_of_nights: hebergement ? val('number_of_nights') : null,
      comes_alone: seul,
      companions: seul ? null : val('companions'),

      special_needs: val('special_needs'),
      comments: val('comments'),

      accuracy: val('accuracy'),
      consent: val('consent'),
    };
  }

  // ----------------------------------------------------------
  // Récapitulatif
  // ----------------------------------------------------------
  function construireRecap() {
    const d = collecter();

    const groupes = [
      ['Identité', [
        ['Nom', d.last_name], ['Postnom', d.post_name], ['Prénom', d.first_name],
        ['Sexe', d.gender], ['État civil', d.marital_status],
      ]],
      ['Contact', [
        ['Téléphone', d.phone], ['WhatsApp', d.whatsapp], ['E-mail', d.email],
        ['Adresse', d.address], ['Ville', d.city], ['Quartier', d.district],
        ['Commune', d.commune], ['Province', d.province], ['Pays', d.country],
      ]],
      ['Participation', [
        ["Ville d'origine", d.origin_city], ['Connu par', d.how_heard],
        ['Participation complète', d.full_participation],
      ]],
      ['Hébergement', [
        ['Hébergement', d.needs_accommodation ? 'Oui' : 'Non'],
        ['Nuits', d.needs_accommodation ? d.number_of_nights : ''],
        ['Vient seul(e)', d.comes_alone ? 'Oui' : 'Non'],
        ['Accompagnateurs', d.comes_alone ? '' : d.companions],
        ['Besoins particuliers', d.special_needs],
        ['Commentaires', d.comments],
      ]],
    ];

    document.getElementById('recap').innerHTML = groupes.map(([titre, lignes]) => {
      const visibles = lignes.filter(([, v]) => v !== '' && v !== null && v !== undefined);
      if (!visibles.length) return '';
      return `
        <div class="recap__groupe">
          <h3>${esc(titre)}</h3>
          <dl style="margin:0">
            ${visibles.map(([k, v]) => `
              <div class="recap__ligne"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>
            `).join('')}
          </dl>
        </div>`;
    }).join('');
  }

  // ----------------------------------------------------------
  // Envoi
  // ----------------------------------------------------------
  function etapeDuChamp(nom) {
    const champ = form.querySelector(`[name="${nom}"]`);
    if (!champ) return 1;
    const section = champ.closest('.etape');
    return section ? Number(section.dataset.etape) : 1;
  }

  async function envoyer() {
    if (envoiEnCours) return;
    envoiEnCours = true;
    btnSuivant.disabled = true;
    btnPrecedent.disabled = true;
    btnSuivant.textContent = 'Enregistrement…';

    try {
      const reponse = await API.post('/api/registrations', collecter());
      // Succès : on quitte la page vers la confirmation.
      window.location.href = `/confirmation.html?n=${encodeURIComponent(reponse.registration_number)}`;
      return;
    } catch (err) {
      envoiEnCours = false;
      btnSuivant.disabled = false;
      btnPrecedent.disabled = false;
      btnSuivant.textContent = 'Confirmer mon inscription';

      // Doublon détecté par le serveur
      if (err.status === 409) {
        alerter(err.message);
        return;
      }

      if (err.errors) {
        Object.entries(err.errors).forEach(([nom, msg]) => poserErreur(nom, msg));
        const premier = Object.keys(err.errors)[0];
        afficher(etapeDuChamp(premier));
        alerter('Veuillez corriger les champs signalés.');
        return;
      }

      alerter(err.message);
    }
  }

  afficher(1);
})();
