/**
 * Multi-Step Form Logic for HAPHAK 2026 Registration
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const totalSteps = 7;

  const form = document.getElementById('retreat-registration-form');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit');
  const progressFill = document.getElementById('progress-fill');
  const globalErrorBanner = document.getElementById('global-error-banner');

  // Conditional field toggle logic
  initConditionalFields();

  // Next Step Click
  btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        currentStep++;
        updateWizardUI();
      }
    }
  });

  // Prev Step Click
  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateWizardUI();
    }
  });

  // Jump to step via recap edit buttons
  window.jumpToStep = function(stepNum) {
    if (stepNum >= 1 && stepNum <= totalSteps) {
      currentStep = stepNum;
      updateWizardUI();
    }
  };

  // Update Wizard UI View
  function updateWizardUI() {
    // Hide global error banner
    globalErrorBanner.classList.remove('active');
    globalErrorBanner.textContent = '';

    // Update Panels
    document.querySelectorAll('.form-step-panel').forEach(panel => {
      panel.classList.remove('active');
      if (parseInt(panel.dataset.panel, 10) === currentStep) {
        panel.classList.add('active');
      }
    });

    // Update Step Indicators
    document.querySelectorAll('.step-item').forEach(item => {
      const step = parseInt(item.dataset.step, 10);
      item.classList.remove('active', 'completed');
      if (step === currentStep) {
        item.classList.add('active');
      } else if (step < currentStep) {
        item.classList.add('completed');
      }
    });

    // Update Progress Bar %
    const fillPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${fillPercent}%`;

    // Button States
    btnPrev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

    if (currentStep === totalSteps) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'inline-flex';
      renderStepRecap();
    } else {
      btnNext.style.display = 'inline-flex';
      btnSubmit.style.display = 'none';
    }

    // Scroll top of wizard card smoothly
    document.querySelector('.wizard-header').scrollIntoView({ behavior: 'smooth' });
  }

  // Conditional Fields Toggles
  function initConditionalFields() {
    // Member department toggle
    const memberYes = document.getElementById('member-yes');
    const memberNo = document.getElementById('member-no');
    const deptWrapper = document.getElementById('department-field-wrapper');
    if (memberYes && memberNo && deptWrapper) {
      const toggleDept = () => {
        deptWrapper.style.display = memberYes.checked ? 'block' : 'none';
      };
      memberYes.addEventListener('change', toggleDept);
      memberNo.addEventListener('change', toggleDept);
    }

    // Accommodation subfields toggle
    const accomYes = document.getElementById('accom-yes');
    const accomNo = document.getElementById('accom-no');
    const accomSub = document.getElementById('accom-subfields');
    if (accomYes && accomNo && accomSub) {
      const toggleAccom = () => {
        accomSub.style.display = accomYes.checked ? 'grid' : 'none';
      };
      accomYes.addEventListener('change', toggleAccom);
      accomNo.addEventListener('change', toggleAccom);
    }

    // Alone / Companions toggle
    const aloneYes = document.getElementById('alone-yes');
    const aloneNo = document.getElementById('alone-no');
    const compWrapper = document.getElementById('companions-wrapper');
    if (aloneYes && aloneNo && compWrapper) {
      const toggleComp = () => {
        compWrapper.style.display = aloneNo.checked ? 'block' : 'none';
      };
      aloneYes.addEventListener('change', toggleComp);
      aloneNo.addEventListener('change', toggleComp);
    }
  }

  // Step Validation Logic
  function validateStep(step) {
    let isValid = true;
    const currentPanel = document.querySelector(`.form-step-panel[data-panel="${step}"]`);
    if (!currentPanel) return true;

    // Reset current errors
    currentPanel.querySelectorAll('.form-group').forEach(grp => grp.classList.remove('has-error'));

    if (step === 1) {
      const lastName = form.last_name.value.trim();
      const firstName = form.first_name.value.trim();
      const gender = form.gender.value;
      const marital = form.marital_status.value;

      if (!lastName) { showError(form.last_name); isValid = false; }
      if (!firstName) { showError(form.first_name); isValid = false; }
      if (!gender) { showError(form.gender); isValid = false; }
      if (!marital) { showError(form.marital_status); isValid = false; }
    }

    else if (step === 2) {
      const phone = form.phone.value.trim();
      const email = form.email.value.trim();
      const city = form.city.value.trim();
      const country = form.country.value.trim();

      const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!phone || !phoneRegex.test(phone)) { showError(form.phone); isValid = false; }
      if (!email || !emailRegex.test(email)) { showError(form.email); isValid = false; }
      if (!city) { showError(form.city); isValid = false; }
      if (!country) { showError(form.country); isValid = false; }
    }

    else if (step === 3) {
      const emergName = form.emergency_contact_name.value.trim();
      const emergPhone = form.emergency_contact_phone.value.trim();
      const emergRel = form.emergency_contact_relationship.value;

      const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

      if (!emergName) { showError(form.emergency_contact_name); isValid = false; }
      if (!emergPhone || !phoneRegex.test(emergPhone)) { showError(form.emergency_contact_phone); isValid = false; }
      if (!emergRel) { showError(form.emergency_contact_relationship); isValid = false; }
    }

    else if (step === 6) {
      const consent = document.getElementById('consent');
      const infoExact = document.getElementById('info_exact');

      if (!consent.checked) {
        document.getElementById('consent-error').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('consent-error').style.display = 'none';
      }

      if (!infoExact.checked) {
        document.getElementById('exact-error').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('exact-error').style.display = 'none';
      }
    }

    return isValid;
  }

  function showError(inputElem) {
    if (!inputElem) return;
    const group = inputElem.closest('.form-group') || inputElem.parentElement;
    if (group) group.classList.add('has-error');
  }

  // Render Live Step 7 Recap
  function renderStepRecap() {
    const recapBox = document.getElementById('recap-summary-content');
    if (!recapBox) return;

    const fd = new FormData(form);
    const getVal = (key, defaultText = '—') => fd.get(key) ? fd.get(key).toString().trim() : defaultText;

    const html = `
      <!-- Block 1 : Identité -->
      <div class="recap-section">
        <div class="recap-header">
          <div class="recap-title">👤 Identité</div>
          <button type="button" class="recap-edit-btn" onclick="jumpToStep(1)">[Modifier]</button>
        </div>
        <div class="recap-grid">
          <div><div class="recap-item-lbl">Nom complet :</div><div class="recap-item-val">${getVal('last_name')} ${getVal('middle_name')} ${getVal('first_name')}</div></div>
          <div><div class="recap-item-lbl">Sexe :</div><div class="recap-item-val">${getVal('gender')}</div></div>
          <div><div class="recap-item-lbl">État civil :</div><div class="recap-item-val">${getVal('marital_status')}</div></div>
        </div>
      </div>

      <!-- Block 2 : Coordonnées -->
      <div class="recap-section">
        <div class="recap-header">
          <div class="recap-title">📞 Coordonnées</div>
          <button type="button" class="recap-edit-btn" onclick="jumpToStep(2)">[Modifier]</button>
        </div>
        <div class="recap-grid">
          <div><div class="recap-item-lbl">Téléphone :</div><div class="recap-item-val">${getVal('phone')}</div></div>
          <div><div class="recap-item-lbl">WhatsApp :</div><div class="recap-item-val">${getVal('whatsapp', getVal('phone'))}</div></div>
          <div><div class="recap-item-lbl">E-mail :</div><div class="recap-item-val">${getVal('email')}</div></div>
          <div><div class="recap-item-lbl">Ville / Pays :</div><div class="recap-item-val">${getVal('city')}, ${getVal('country')}</div></div>
        </div>
      </div>

      <!-- Block 3 : Famille & Urgence -->
      <div class="recap-section">
        <div class="recap-header">
          <div class="recap-title">👨‍👩‍👧‍👦 Famille & Urgence</div>
          <button type="button" class="recap-edit-btn" onclick="jumpToStep(3)">[Modifier]</button>
        </div>
        <div class="recap-grid">
          <div><div class="recap-item-lbl">Taille famille :</div><div class="recap-item-val">${getVal('family_size')} personne(s)</div></div>
          <div><div class="recap-item-lbl">Contact d'urgence :</div><div class="recap-item-val">${getVal('emergency_contact_name')} (${getVal('emergency_contact_relationship')})</div></div>
          <div><div class="recap-item-lbl">Téléphone d'urgence :</div><div class="recap-item-val">${getVal('emergency_contact_phone')}</div></div>
        </div>
      </div>

      <!-- Block 4 : Participation -->
      <div class="recap-section">
        <div class="recap-header">
          <div class="recap-title">🚌 Participation</div>
          <button type="button" class="recap-edit-btn" onclick="jumpToStep(4)">[Modifier]</button>
        </div>
        <div class="recap-grid">
          <div><div class="recap-item-lbl">Présence :</div><div class="recap-item-val">${getVal('full_retreat')}</div></div>
          <div><div class="recap-item-lbl">Transport :</div><div class="recap-item-val">${getVal('transport_method')}</div></div>
          <div><div class="recap-item-lbl">Membre organisation :</div><div class="recap-item-val">${getVal('organization_member')} ${getVal('department') !== '—' ? '('+getVal('department')+')' : ''}</div></div>
        </div>
      </div>

      <!-- Block 5 : Hébergement -->
      <div class="recap-section">
        <div class="recap-header">
          <div class="recap-title">🛏 Hébergement</div>
          <button type="button" class="recap-edit-btn" onclick="jumpToStep(5)">[Modifier]</button>
        </div>
        <div class="recap-grid">
          <div><div class="recap-item-lbl">Logement demandé :</div><div class="recap-item-val">${getVal('accommodation_required')} ${getVal('accommodation_required') === 'Oui' ? '('+getVal('accommodation_type')+')' : ''}</div></div>
          <div><div class="recap-item-lbl">Accompagnants :</div><div class="recap-item-val">${getVal('coming_with_others') === 'Non' ? 'Seul' : getVal('companions_count')+' personne(s)'}</div></div>
        </div>
      </div>
    `;

    recapBox.innerHTML = html;
  }

  // Form Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(6)) {
      alert('Certains champs obligatoires contiennent des erreurs. Veuillez vérifier vos étapes.');
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enregistrement en cours... ⏳';

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });
    payload.consent = document.getElementById('consent').checked;

    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to success confirmation page with registration code
        window.location.href = `success.html?reg=${encodeURIComponent(result.registrationId)}`;
      } else {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'CONFIRMER MON INSCRIPTION 🚀';

        globalErrorBanner.classList.add('active');
        if (result.errors && Array.isArray(result.errors)) {
          globalErrorBanner.innerHTML = `<strong>Veuillez corriger les erreurs suivantes :</strong><br>• ` + result.errors.join('<br>• ');
        } else {
          globalErrorBanner.textContent = result.message || 'Une erreur est survenue lors de l’inscription.';
        }
      }

    } catch (err) {
      console.error('Erreur soumission formulaire:', err);
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'CONFIRMER MON INSCRIPTION 🚀';
      globalErrorBanner.classList.add('active');
      globalErrorBanner.textContent = 'Impossible de contacter le serveur. Vérifiez votre connexion Internet.';
    }
  });

});
