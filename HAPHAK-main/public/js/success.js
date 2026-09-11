/**
 * Success Page JS - Ticket Pass Loader
 */

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const regNumber = urlParams.get('reg');

  if (!regNumber) {
    alert('Numéro d’inscription introuvable.');
    window.location.href = 'index.html';
    return;
  }

  try {
    const res = await fetch(`/api/registrations/${encodeURIComponent(regNumber)}`);
    const data = await res.json();

    if (!data.success || !data.registration) {
      alert(data.message || 'Impossible de récupérer la fiche d’inscription.');
      return;
    }

    const reg = data.registration;

    document.getElementById('pass-reg-num').textContent = reg.registration_number;
    document.getElementById('pass-full-name').textContent = `${reg.last_name} ${reg.middle_name || ''} ${reg.first_name}`.trim();
    document.getElementById('pass-phone').textContent = reg.phone;
    document.getElementById('pass-email').textContent = reg.email;
    document.getElementById('pass-city').textContent = `${reg.city}, ${reg.country}`;

    if (reg.accommodation_required === 'Oui') {
      const accomBadge = document.getElementById('pass-accom-badge');
      if (accomBadge) {
        accomBadge.style.display = 'flex';
        document.getElementById('pass-accom-text').textContent = `Hébergement demandé (${reg.accommodation_type || 'Général'})`;
      }
    }

    if (data.qrDataUrl) {
      const qrImg = document.getElementById('pass-qr-img');
      qrImg.src = data.qrDataUrl;

      const btnDownload = document.getElementById('btn-download-pass');
      btnDownload.href = data.qrDataUrl;
      btnDownload.download = `pass_haphak_${reg.registration_number}.png`;
    }

  } catch (err) {
    console.error('Erreur chargement ticket:', err);
  }
});
