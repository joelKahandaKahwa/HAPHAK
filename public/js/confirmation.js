/* ============================================================
   Page de confirmation.
   Récupère l'inscription à partir du numéro présent dans l'URL.
   ============================================================ */

(async () => {
  const numero = new URLSearchParams(window.location.search).get('n');

  if (!numero) {
    alerter("Aucun numéro d'inscription fourni.");
    return;
  }

  try {
    const reponse = await API.get(`/api/registrations/${encodeURIComponent(numero)}`);
    const d = reponse.data;
    const h = reponse.haphak;

    document.getElementById('numero').textContent = d.registration_number;

    const nomComplet = [d.first_name, d.post_name, d.last_name].filter(Boolean).join(' ');

    const lignes = [
      ['Nom complet', nomComplet],
      ['Ville', d.city],
      ['Hébergement', d.needs_accommodation ? 'Demandé' : 'Non demandé'],
      ["Date d'inscription", dateLongue(d.created_at)],
    ];

    const infosRetraite = [
      ['Thème', `« ${h.theme} » — ${h.verset}`],
      ['Dates', h.dates],
      ['Début', h.debut],
      ['Lieu', h.lieu],
      ['Contact', h.contact],
    ];

    const groupe = (titre, paires) => `
      <div class="recap__groupe">
        <h3>${esc(titre)}</h3>
        <dl style="margin:0">
          ${paires.map(([k, v]) => `
            <div class="recap__ligne"><dt>${esc(k)}</dt><dd>${esc(ouTiret(v))}</dd></div>
          `).join('')}
        </dl>
      </div>`;

    document.getElementById('details').innerHTML =
      groupe('Votre inscription', lignes) + groupe('La retraite', infosRetraite);

    // Statut de l'e-mail de confirmation
    const zoneStatut = document.getElementById('statut-email');
    if (d.email_status === 'sent') {
      zoneStatut.className = 'alerte alerte--succes';
      zoneStatut.textContent = "Un e-mail de confirmation vous a été envoyé.";
    } else {
      zoneStatut.className = 'alerte alerte--info';
      zoneStatut.textContent =
        "L'e-mail de confirmation n'a pas pu être envoyé pour le moment. "
        + "Votre inscription est bien enregistrée : conservez votre numéro "
        + "et l'organisation pourra vous renvoyer l'e-mail.";
    }
    zoneStatut.hidden = false;

    document.getElementById('contenu').hidden = false;

    document.getElementById('imprimer').addEventListener('click', () => window.print());
  } catch (err) {
    alerter(
      err.status === 404
        ? "Aucune inscription ne correspond à ce numéro."
        : err.message
    );
  }
})();
