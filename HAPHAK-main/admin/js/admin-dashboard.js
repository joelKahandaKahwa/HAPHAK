/**
 * Admin Dashboard Script - HAPHAK 2026
 */

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('admin_token');

  // Verify Auth Session
  verifyAuth();

  let currentPage = 1;
  const pageLimit = 15;

  // DOM Elements
  const tabItems = document.querySelectorAll('.sidebar-item[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');

  // Navigation Tab Switching
  tabItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.tab;

      tabItems.forEach(i => i.classList.remove('active'));
      tabContents.forEach(c => c.style.display = 'none');

      item.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.style.display = 'block';

      const adminTitle = document.getElementById('admin-view-title');
      const titles = {
        'tab-overview': 'Aperçu Général',
        'tab-participants': 'Participants',
        'tab-settings': 'Paramètres de la Retraite',
        'tab-backups': 'Sauvegardes Base de Données'
      };
      if (adminTitle) adminTitle.textContent = titles[targetId] || 'Aperçu Général';

      if (targetId === 'tab-overview') loadStats();
      if (targetId === 'tab-participants') loadParticipants();
      if (targetId === 'tab-settings') loadSettings();
    });
  });

  // Logout Handler
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    localStorage.removeItem('admin_token');
    window.location.href = 'login.html';
  });

  // Initial Data Load
  loadStats();

  // Verify Session Auth
  async function verifyAuth() {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/me', { headers });
      const data = await res.json();
      if (!data.success) {
        window.location.href = 'login.html';
      } else if (data.admin) {
        document.getElementById('admin-user-display').textContent = `Connecté en tant que ${data.admin.username}`;
      }
    } catch (err) {
      window.location.href = 'login.html';
    }
  }

  // Load Dashboard Statistics
  async function loadStats() {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/stats', { headers });
      const data = await res.json();

      if (data.success && data.stats) {
        const s = data.stats;
        document.getElementById('stat-total').textContent = s.total || 0;
        document.getElementById('stat-males').textContent = s.males || 0;
        document.getElementById('stat-females').textContent = s.females || 0;
        document.getElementById('stat-members').textContent = s.members || 0;
        document.getElementById('stat-accom').textContent = s.accommodationCount || 0;
        document.getElementById('stat-checkedin').textContent = s.checkedInCount || 0;
        document.getElementById('stat-today').textContent = s.todayCount || 0;
        document.getElementById('stat-week').textContent = s.weekCount || 0;

        // Render City breakdown
        const cityList = document.getElementById('cities-stat-list');
        if (cityList && s.cities) {
          cityList.innerHTML = s.cities.map(c => `
            <div style="background:#f8fafc; padding:0.75rem; border-radius:8px; border:1px solid #e2e8f0;">
              <div style="font-size:0.8rem; color:#64748b;">${c.city || 'Non spécifiée'}</div>
              <div style="font-size:1.2rem; font-weight:800; color:#0f172a;">${c.count} inscrit(s)</div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  }

  // Filter Listeners for Participants Table
  const filterSearch = document.getElementById('filter-search');
  const filterGender = document.getElementById('filter-gender');
  const filterAccom = document.getElementById('filter-accom');
  const filterChecked = document.getElementById('filter-checkedin');

  [filterSearch, filterGender, filterAccom, filterChecked].forEach(el => {
    if (el) {
      el.addEventListener('input', () => { currentPage = 1; loadParticipants(); });
      el.addEventListener('change', () => { currentPage = 1; loadParticipants(); });
    }
  });

  // Pagination Handlers
  document.getElementById('btn-page-prev').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; loadParticipants(); }
  });
  document.getElementById('btn-page-next').addEventListener('click', () => {
    currentPage++; loadParticipants();
  });

  // Load Participants Table
  async function loadParticipants() {
    try {
      const search = filterSearch ? filterSearch.value : '';
      const gender = filterGender ? filterGender.value : '';
      const accom = filterAccom ? filterAccom.value : '';
      const checkedin = filterChecked ? filterChecked.value : '';

      const query = new URLSearchParams({
        page: currentPage,
        limit: pageLimit,
        search,
        gender,
        accommodation: accom,
        checked_in: checkedin
      });

      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/registrations?${query}`, { headers });
      const data = await res.json();

      const tbody = document.getElementById('participants-table-body');
      tbody.innerHTML = '';

      if (data.success && data.data) {
        if (data.data.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:2rem;">Aucun participant trouvé.</td></tr>`;
        } else {
          data.data.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${p.registration_number}</strong></td>
              <td>${p.last_name} ${p.first_name}</td>
              <td>${p.gender === 'Homme' ? '👨 Homme' : '👩 Femme'}</td>
              <td>${p.phone}</td>
              <td>${p.city}</td>
              <td>${p.accommodation_required === 'Oui' ? '<span class="badge badge-gold">Hébergement</span>' : '<span class="badge badge-gray">Non</span>'}</td>
              <td>${p.checked_in ? '<span class="badge badge-green">✓ Présent</span>' : '<span class="badge badge-gray">Non scanné</span>'}</td>
              <td>
                <button class="btn btn-secondary btn-sm" onclick="viewParticipant(${p.id})">🔍 Voir</button>
                <button class="btn btn-outline btn-sm" style="color:#ef4444; border-color:#ef4444;" onclick="deleteParticipant(${p.id}, '${p.registration_number}')">🗑</button>
              </td>
            `;
            tbody.appendChild(tr);
          });
        }

        // Pagination Info
        const p = data.pagination;
        document.getElementById('pagination-info').textContent = `Affichage ${data.data.length} sur ${p.total} participants (Page ${p.page} / ${p.totalPages || 1})`;
      }
    } catch (err) {
      console.error('Erreur chargement participants:', err);
    }
  }

  // View Participant Detail Modal
  window.viewParticipant = async function(id) {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/registrations/${id}`, { headers });
      const data = await res.json();

      if (data.success && data.participant) {
        const p = data.participant;
        const modal = document.getElementById('modal-participant-detail');
        const modalBody = document.getElementById('modal-participant-body');
        document.getElementById('modal-participant-title').textContent = `Participant : ${p.registration_number}`;

        modalBody.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; font-size:0.9rem;">
            <div><strong>Nom complet :</strong> ${p.last_name} ${p.middle_name || ''} ${p.first_name}</div>
            <div><strong>Sexe / État Civil :</strong> ${p.gender} (${p.marital_status})</div>
            <div><strong>Téléphone :</strong> ${p.phone}</div>
            <div><strong>WhatsApp :</strong> ${p.whatsapp || '—'}</div>
            <div><strong>E-mail :</strong> ${p.email}</div>
            <div><strong>Ville / Pays :</strong> ${p.city}, ${p.country}</div>
            <div><strong>Quartier / Commune :</strong> ${p.neighborhood || '—'} / ${p.commune || '—'}</div>
            <div><strong>Contact d'urgence :</strong> ${p.emergency_contact_name} (${p.emergency_contact_phone}) — ${p.emergency_contact_relationship}</div>
            <div><strong>Membre Organisation :</strong> ${p.organization_member} ${p.department ? '('+p.department+')' : ''}</div>
            <div><strong>Hébergement :</strong> ${p.accommodation_required} ${p.accommodation_type ? '('+p.accommodation_type+')' : ''}</div>
            <div><strong>Date arrivée / départ :</strong> ${p.arrival_date || '—'} au ${p.departure_date || '—'}</div>
            <div><strong>Accompagnants :</strong> ${p.coming_with_others === 'Oui' ? p.companions_count + ' pers.' : 'Seul'}</div>
            <div style="grid-column:1/-1;"><strong>Remarques particulières :</strong> ${p.special_needs || 'Aucune'}</div>
            <div style="grid-column:1/-1;"><strong>Statut Présence :</strong> ${p.checked_in ? '✅ Validé le ' + p.checkin_time : '⏳ Pas encore scanné à l’entrée'}</div>
          </div>
          
          <div style="margin-top:1.5rem; text-align:right; border-top:1px solid #e2e8f0; padding-top:1rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.print();">🖨 Imprimer Fiche</button>
          </div>
        `;

        modal.classList.add('active');
      }
    } catch (err) {
      alert('Impossible d’afficher les détails.');
    }
  };

  // Close Modal Handler
  document.getElementById('btn-close-participant-modal').addEventListener('click', () => {
    document.getElementById('modal-participant-detail').classList.remove('active');
  });

  // Delete Participant
  window.deleteParticipant = async function(id, regNum) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le participant ${regNum} ?`)) return;

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      alert(data.message);
      loadParticipants();
      loadStats();
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  // CSV Export Trigger
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    const search = filterSearch ? filterSearch.value : '';
    const gender = filterGender ? filterGender.value : '';
    window.location.href = `/api/admin/export/csv?search=${encodeURIComponent(search)}&gender=${encodeURIComponent(gender)}`;
  });

  // Load Settings
  async function loadSettings() {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/settings', { headers });
      const data = await res.json();

      if (data.success && data.settings) {
        const s = data.settings;
        if (s.name) document.getElementById('setting_name').value = s.name;
        if (s.theme) document.getElementById('setting_theme').value = s.theme;
        if (s.start_date) document.getElementById('setting_start_date').value = s.start_date;
        if (s.end_date) document.getElementById('setting_end_date').value = s.end_date;
        if (s.location) document.getElementById('setting_location').value = s.location;
        if (s.contact_phone) document.getElementById('setting_contact_phone').value = s.contact_phone;
        if (s.registration_open) document.getElementById('setting_registration_open').value = s.registration_open;
      }
    } catch (err) {
      console.error('Erreur chargement settings:', err);
    }
  }

  // Update Settings Form
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {};
    fd.forEach((v, k) => payload[k] = v);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert('Erreur enregistrement paramètres.');
    }
  });

  // Trigger Database Backup
  document.getElementById('btn-trigger-backup').addEventListener('click', async () => {
    const msgBox = document.getElementById('backup-result-msg');
    msgBox.textContent = 'Création de la sauvegarde... ⏳';

    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/backup', { method: 'POST', headers });
      const data = await res.json();

      if (data.success) {
        msgBox.style.color = '#10b981';
        msgBox.textContent = `✅ ${data.message}`;
      } else {
        msgBox.style.color = '#ef4444';
        msgBox.textContent = `❌ ${data.message}`;
      }
    } catch (err) {
      msgBox.style.color = '#ef4444';
      msgBox.textContent = 'Erreur lors de la création de la sauvegarde.';
    }
  });

});
