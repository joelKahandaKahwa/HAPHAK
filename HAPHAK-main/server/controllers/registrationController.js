const { dbAsync } = require('../database');
const { generateQRDataURL } = require('../utils/qrGenerator');
const { sendConfirmationEmail } = require('../utils/mailer');
const { normalizePublicSettings } = require('../publicSettings');

/**
 * Generate a unique registration number: RET-2026-XXXX
 */
async function generateUniqueRegistrationNumber() {
  const year = 2026;
  const countRow = await dbAsync.get(`SELECT COUNT(*) as total FROM registrations`);
  const nextNum = (countRow ? countRow.total : 0) + 1;
  const padded = String(nextNum).padStart(4, '0');
  let regNumber = `RET-${year}-${padded}`;

  // Ensure uniqueness
  const existing = await dbAsync.get(`SELECT id FROM registrations WHERE registration_number = ?`, [regNumber]);
  if (existing) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    regNumber = `RET-${year}-${randomSuffix}`;
  }

  return regNumber;
}

/**
 * Public controller: Submit new registration
 */
async function createRegistration(req, res) {
  try {
    // Check if registrations are open
    const openSetting = await dbAsync.get(`SELECT value FROM retreat_settings WHERE key = 'registration_open'`);
    if (openSetting && openSetting.value === '0') {
      return res.status(403).json({
        success: false,
        message: 'Les inscriptions à la retraite HAPHAK 2026 sont actuellement fermées.'
      });
    }

    const data = req.body;
    const registrationNumber = await generateUniqueRegistrationNumber();

    const result = await dbAsync.run(`
      INSERT INTO registrations (
        registration_number, first_name, last_name, middle_name, gender, marital_status,
        phone, whatsapp, email, address, city, neighborhood, commune, province, country,
        family_status, family_size, children_count,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
        source, arrival_city, transport_method, full_retreat, arrival_date, departure_date,
        organization_member, department, accommodation_required, nights, accommodation_type,
        coming_with_others, companions_count, special_needs, comments, consent, confirmed
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, 1
      )
    `, [
      registrationNumber,
      data.first_name,
      data.last_name,
      data.middle_name || null,
      data.gender,
      data.marital_status,
      data.phone,
      data.whatsapp || data.phone,
      data.email,
      data.address || null,
      data.city,
      data.neighborhood || null,
      data.commune || null,
      data.province || null,
      data.country,
      data.family_status || null,
      parseInt(data.family_size, 10) || 1,
      parseInt(data.children_count, 10) || 0,
      data.emergency_contact_name,
      data.emergency_contact_phone,
      data.emergency_contact_relationship,
      data.source || null,
      data.arrival_city || data.city,
      data.transport_method || null,
      data.full_retreat || 'Oui',
      data.arrival_date || null,
      data.departure_date || null,
      data.organization_member || 'Non',
      data.department || null,
      data.accommodation_required || 'Non',
      parseInt(data.nights, 10) || 0,
      data.accommodation_type || null,
      data.coming_with_others || 'Non',
      parseInt(data.companions_count, 10) || 0,
      data.special_needs || null,
      data.comments || null,
      1
    ]);

    const newRecord = await dbAsync.get(`SELECT * FROM registrations WHERE id = ?`, [result.id]);

    // Generate QR Code Data URL
    const qrDataUrl = await generateQRDataURL(newRecord.registration_number);

    // Send confirmation email asynchronously
    sendConfirmationEmail(newRecord).catch((err) => {
      console.error('Erreur tâche d’envoi d’email:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Inscription enregistrée avec succès.',
      registrationId: newRecord.registration_number,
      id: newRecord.id,
      qrDataUrl,
      participant: {
        first_name: newRecord.first_name,
        last_name: newRecord.last_name,
        email: newRecord.email,
        phone: newRecord.phone,
        registration_number: newRecord.registration_number,
        created_at: newRecord.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l’inscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Une erreur serveur est survenue lors de l’enregistrement de votre inscription.'
    });
  }
}

/**
 * Public controller: Fetch registration details by number or id for confirmation screen
 */
async function getRegistrationDetails(req, res) {
  try {
    const { regNumber } = req.params;
    const registration = await dbAsync.get(
      `SELECT * FROM registrations WHERE registration_number = ? OR id = ?`,
      [regNumber, regNumber]
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Inscription introuvable.'
      });
    }

    const qrDataUrl = await generateQRDataURL(registration.registration_number);

    return res.json({
      success: true,
      registration,
      qrDataUrl
    });

  } catch (error) {
    console.error('Erreur getRegistrationDetails:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du ticket.'
    });
  }
}

/**
 * Public controller: Get public retreat settings (title, dates, location)
 */
async function getPublicSettings(req, res) {
  try {
    const rows = await dbAsync.all(`SELECT key, value FROM retreat_settings`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });

    return res.json({
      success: true,
      settings: normalizePublicSettings(settings)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des paramètres.'
    });
  }
}

module.exports = {
  createRegistration,
  getRegistrationDetails,
  getPublicSettings
};
