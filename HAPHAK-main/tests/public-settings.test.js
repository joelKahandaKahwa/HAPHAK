const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePublicSettings, DEFAULT_PUBLIC_SETTINGS } = require('../server/publicSettings');

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
