/**
 * QR Code Check-in Scanner Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('admin_token');
  const form = document.getElementById('scanner-manual-form');
  const inputCode = document.getElementById('manual-code-input');
  const resultBox = document.getElementById('scan-result-box');
  const detailsBox = document.getElementById('scanned-participant-details');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = inputCode.value.trim();
    if (!code) return;

    verifyCheckIn(code);
  });

  async function verifyCheckIn(code) {
    resultBox.className = 'result-box';
    resultBox.style.display = 'none';
    detailsBox.style.display = 'none';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ registrationCode: code })
      });

      const data = await res.json();

      if (data.success) {
        const p = data.participant;

        if (data.alreadyCheckedIn) {
          resultBox.className = 'result-box warning';
          resultBox.innerHTML = `⚠️ DÉJÀ ACCEPTÉ<br><small style="font-weight:normal;">Ce ticket a déjà été validé à ${p.checkin_time || 'l\'entrée'}.</small>`;
        } else {
          resultBox.className = 'result-box success';
          resultBox.innerHTML = `✅ ACCÈS AUTORISÉ !<br><small style="font-weight:normal;">Présence enregistrée avec succès.</small>`;
        }

        if (p) {
          detailsBox.style.display = 'block';
          detailsBox.innerHTML = `
            <div style="font-weight:800; font-size:1.1rem; color:#d4af37; margin-bottom:0.5rem;">
              ${p.last_name} ${p.middle_name || ''} ${p.first_name}
            </div>
            <div><strong>N° Registration :</strong> ${p.registration_number}</div>
            <div><strong>Sexe :</strong> ${p.gender}</div>
            <div><strong>Téléphone :</strong> ${p.phone}</div>
            <div><strong>Ville :</strong> ${p.city}</div>
            <div><strong>Hébergement :</strong> ${p.accommodation_required === 'Oui' ? '🛌 ' + (p.accommodation_type || 'Oui') : 'Non'}</div>
            <div><strong>Accompagnants :</strong> ${p.coming_with_others === 'Oui' ? p.companions_count + ' pers.' : 'Seul'}</div>
          `;
        }

        inputCode.value = '';
        inputCode.focus();

      } else {
        resultBox.className = 'result-box danger';
        resultBox.textContent = data.message || 'Code non reconnu.';
      }

    } catch (err) {
      console.error('Erreur scanner:', err);
      resultBox.className = 'result-box danger';
      resultBox.textContent = 'Erreur réseau lors de la vérification.';
    }
  }
});
