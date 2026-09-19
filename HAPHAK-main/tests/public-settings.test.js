const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePublicSettings, DEFAULT_PUBLIC_SETTINGS } = require('../server/publicSettings');
const { validateRegistrationData } = require('../server/middleware/validateRegistration');

test('normalizePublicSettings replaces placeholder values with real defaults', () => {
  const settings = normalizePublicSettings({
    location: 'À préciser',
    contact_phone: 'À préciser',
    theme: 'Thème personnalisé'
  });

  assert.equal(settings.location, DEFAULT_PUBLIC_SETTINGS.location);
  assert.equal(settings.contact_phone, DEFAULT_PUBLIC_SETTINGS.contact_phone);
  assert.equal(settings.theme, 'Thème personnalisé');
});

test('default public settings are filled with real event metadata', () => {
  assert.ok(DEFAULT_PUBLIC_SETTINGS.location.includes('HAPHAK'));
  assert.ok(DEFAULT_PUBLIC_SETTINGS.contact_phone.includes('+243'));
  assert.ok(DEFAULT_PUBLIC_SETTINGS.start_date === '2026-09-23');
});

test('validateRegistrationData preserves the optional items-to-bring field', () => {
  let called = false;
  const req = {
    body: {
      last_name: 'Kabamba',
      first_name: 'David',
      gender: 'Homme',
      marital_status: 'Célibataire',
      phone: '+243812345678',
      email: 'david@example.com',
      city: 'Kinshasa',
      country: 'RDC',
      emergency_contact_name: 'Marie Kabamba',
      emergency_contact_phone: '+243822345678',
      emergency_contact_relationship: 'Mère',
      consent: true,
      items_to_bring: '  Bible, coton, bouteille d’eau  '
    }
  };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  validateRegistrationData(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.body.items_to_bring, 'Bible, coton, bouteille d’eau');
});
