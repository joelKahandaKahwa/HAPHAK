/**
 * HAPHAK 2026 - Main Frontend App Logic
 */

const DEFAULT_PUBLIC_SETTINGS = {
  name: 'HAPHAK — « transforme »',
  theme: 'Marche devant ma face',
  start_date: '2026-09-23',
  end_date: '2026-09-25',
  location: 'Centre de retraite HAPHAK — Kinshasa',
  description: 'HAPHAK — « transforme » — thème : Marche devant ma face.',
  contact_phone: '+243 972 000 000',
  contact_whatsapp: '+243 972 000 000',
  registration_open: '1'
};

function normalizePublicSettings(settings = {}) {
  const merged = { ...DEFAULT_PUBLIC_SETTINGS, ...settings };

  Object.keys(merged).forEach((key) => {
    const value = merged[key];
    const text = typeof value === 'string' ? value.trim() : value;

    if (
      value === null ||
      value === undefined ||
      text === '' ||
      text === 'À préciser' ||
      text === 'A préciser'
    ) {
      merged[key] = DEFAULT_PUBLIC_SETTINGS[key];
    }
  });

  return merged;
}

document.addEventListener('DOMContentLoaded', () => {
  initCountdown(DEFAULT_PUBLIC_SETTINGS);
  fetchPublicSettings();
  initModal();
});

// Fetch dynamic retreat settings from backend
async function fetchPublicSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const settings = data.success && data.settings ? data.settings : DEFAULT_PUBLIC_SETTINGS;
    applyPublicSettings(settings);
  } catch (err) {
    console.warn('Impossible de charger les paramètres réseau:', err.message);
    applyPublicSettings(DEFAULT_PUBLIC_SETTINGS);
  }
}

function applyPublicSettings(settings) {
  const s = normalizePublicSettings(settings);

  const nameElem = document.getElementById('retreat-name');
  if (nameElem && s.name) nameElem.textContent = `✝ ${s.name}`;

  const titleText = document.getElementById('retreat-title-text');
  if (titleText && s.name) {
    const nameParts = s.name.split('—');
    titleText.textContent = (nameParts[0] || s.name).trim();
  }

  const titleAccent = document.getElementById('retreat-title-accent');
  if (titleAccent && s.name) {
    const nameParts = s.name.split('—');
    const accent = nameParts[1] ? nameParts[1].trim() : 'transforme';
    titleAccent.textContent = accent.replace(/^[«\s]+|[»\s]+$/g, '');
  }

  const themeElem = document.getElementById('retreat-theme-text');
  if (themeElem && s.theme) themeElem.textContent = `« ${s.theme} »`;

  const descriptionElem = document.getElementById('retreat-description');
  if (descriptionElem && s.description) {
    descriptionElem.innerHTML = s.description;
  }

  const datesElem = document.getElementById('retreat-dates');
  if (datesElem && s.start_date && s.end_date) {
    datesElem.textContent = `Du ${formatDateFr(s.start_date)} au ${formatDateFr(s.end_date)}`;
  }

  const startDateElem = document.getElementById('retreat-start-date');
  if (startDateElem && s.start_date) {
    startDateElem.textContent = `À 17h le ${formatDateFr(s.start_date)}`;
  }

  const locElem = document.getElementById('retreat-location');
  if (locElem && s.location) locElem.textContent = s.location;

  const contactValue = s.contact_phone || s.contact_whatsapp || '+243 972 000 000';
  const contactElem = document.getElementById('retreat-contact');
  if (contactElem) contactElem.textContent = contactValue;

  const modalDates = document.getElementById('modal-dates');
  if (modalDates && s.start_date && s.end_date) {
    modalDates.textContent = `Du ${formatDateFr(s.start_date)} au ${formatDateFr(s.end_date)}.`;
  }

  const modalStartDate = document.getElementById('modal-start-date');
  if (modalStartDate && s.start_date) {
    modalStartDate.textContent = `${formatDateFr(s.start_date)} à 17h00.`;
  }

  const modalLocation = document.getElementById('modal-location');
  if (modalLocation && s.location) modalLocation.textContent = s.location;

  const modalContact = document.getElementById('modal-contact-num');
  if (modalContact) modalContact.textContent = contactValue;

  if (document.title) {
    document.title = s.name || document.title;
  }

  initCountdown(s);
}

// Countdown timer to the start date at 17:00
let countdownTimer = null;

function initCountdown(settings = DEFAULT_PUBLIC_SETTINGS) {
  const startDate = settings.start_date ? `${settings.start_date}T17:00:00` : '2026-09-23T17:00:00';
  const targetDate = new Date(startDate).getTime();

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      document.getElementById('cd-days').textContent = '00';
      document.getElementById('cd-hours').textContent = '00';
      document.getElementById('cd-mins').textContent = '00';
      document.getElementById('cd-secs').textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    if (document.getElementById('cd-days')) document.getElementById('cd-days').textContent = pad(days);
    if (document.getElementById('cd-hours')) document.getElementById('cd-hours').textContent = pad(hours);
    if (document.getElementById('cd-mins')) document.getElementById('cd-mins').textContent = pad(mins);
    if (document.getElementById('cd-secs')) document.getElementById('cd-secs').textContent = pad(secs);
  }

  update();
  countdownTimer = setInterval(update, 1000);
}

// Practical Info Modal Handler
function initModal() {
  const btnOpen = document.getElementById('btn-open-modal');
  const btnClose = document.getElementById('btn-close-modal');
  const modal = document.getElementById('modal-info');

  if (btnOpen && modal) {
    btnOpen.addEventListener('click', () => modal.classList.add('active'));
  }
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
