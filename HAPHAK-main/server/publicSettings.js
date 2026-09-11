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

module.exports = {
  DEFAULT_PUBLIC_SETTINGS,
  normalizePublicSettings
};
