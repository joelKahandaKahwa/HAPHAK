const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { dbAsync } = require('../database');
const { createDatabaseBackup } = require('../utils/backup');

/**
 * Admin Login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez saisir un nom d’utilisateur et un mot de passe.'
      });
    }

    const admin = await dbAsync.get(`SELECT * FROM admin_users WHERE username = ?`, [username]);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants d’administration incorrects.'
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants d’administration incorrects.'
      });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: config.env === 'production',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Connexion réussie.',
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });

  } catch (error) {
    console.error('Erreur login admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion.'
    });
  }
}

/**
 * Admin Session verification
 */
async function getMe(req, res) {
  return res.json({
    success: true,
    admin: req.admin
  });
}

/**
 * Admin Logout
 */
async function logout(req, res) {
  res.clearCookie('admin_token');
  return res.json({
    success: true,
    message: 'Déconnexion réussie.'
  });
}

/**
 * Admin Dashboard Statistics
 */
async function getDashboardStats(req, res) {
  try {
    const totalRow = await dbAsync.get(`SELECT COUNT(*) as count FROM registrations`);
    const total = totalRow ? totalRow.count : 0;

    const genderRows = await dbAsync.all(`SELECT gender, COUNT(*) as count FROM registrations GROUP BY gender`);
    let males = 0;
    let females = 0;
    genderRows.forEach(r => {
      if (r.gender === 'Homme') males = r.count;
      if (r.gender === 'Femme') females = r.count;
    });

    const memberRows = await dbAsync.all(`SELECT organization_member, COUNT(*) as count FROM registrations GROUP BY organization_member`);
    let members = 0;
    let nonMembers = 0;
    memberRows.forEach(r => {
      if (r.organization_member === 'Oui') members = r.count;
      else nonMembers += r.count;
    });

    const accomRow = await dbAsync.get(`SELECT COUNT(*) as count FROM registrations WHERE accommodation_required = 'Oui'`);
    const accommodationCount = accomRow ? accomRow.count : 0;

    const checkedInRow = await dbAsync.get(`SELECT COUNT(*) as count FROM registrations WHERE checked_in = 1`);
    const checkedInCount = checkedInRow ? checkedInRow.count : 0;

    // Registrations today (UTC date format)
    const todayRow = await dbAsync.get(`SELECT COUNT(*) as count FROM registrations WHERE date(created_at) = date('now')`);
    const todayCount = todayRow ? todayRow.count : 0;

    // Registrations this week (last 7 days)
    const weekRow = await dbAsync.get(`SELECT COUNT(*) as count FROM registrations WHERE created_at >= date('now', '-7 days')`);
    const weekCount = weekRow ? weekRow.count : 0;

    // Breakdown by City
    const cityRows = await dbAsync.all(`SELECT city, COUNT(*) as count FROM registrations GROUP BY city ORDER BY count DESC LIMIT 10`);

    return res.json({
      success: true,
      stats: {
        total,
        males,
        females,
        members,
        nonMembers,
        accommodationCount,
        checkedInCount,
        todayCount,
        weekCount,
        cities: cityRows
      }
    });

  } catch (error) {
    console.error('Erreur getDashboardStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques.'
    });
  }
}

/**
 * Admin: Get registrations table with filters, search, sort, pagination
 */
async function getRegistrations(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const city = req.query.city || null;
    const gender = req.query.gender || null;
    const member = req.query.member || null;
    const accommodation = req.query.accommodation || null;
    const checked_in = req.query.checked_in || null;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push(`(first_name LIKE ? OR last_name LIKE ? OR registration_number LIKE ? OR phone LIKE ? OR email LIKE ?)`);
      params.push(search, search, search, search, search);
    }
    if (city) {
      whereClauses.push(`city = ?`);
      params.push(city);
    }
    if (gender) {
      whereClauses.push(`gender = ?`);
      params.push(gender);
    }
    if (member) {
      whereClauses.push(`organization_member = ?`);
      params.push(member);
    }
    if (accommodation) {
      whereClauses.push(`accommodation_required = ?`);
      params.push(accommodation);
    }
    if (checked_in !== null && checked_in !== undefined && checked_in !== '') {
      whereClauses.push(`checked_in = ?`);
      params.push(parseInt(checked_in, 10));
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = await dbAsync.get(`SELECT COUNT(*) as total FROM registrations ${whereSql}`, params);
    const total = countRow ? countRow.total : 0;

    const rows = await dbAsync.all(
      `SELECT * FROM registrations ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Erreur getRegistrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des participants.'
    });
  }
}

/**
 * Admin: Get detail of single participant
 */
async function getRegistrationById(req, res) {
  try {
    const { id } = req.params;
    const participant = await dbAsync.get(`SELECT * FROM registrations WHERE id = ? OR registration_number = ?`, [id, id]);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant non trouvé.'
      });
    }
    return res.json({
      success: true,
      participant
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur.'
    });
  }
}

/**
 * Admin: Update participant
 */
async function updateRegistration(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const exist = await dbAsync.get(`SELECT id FROM registrations WHERE id = ?`, [id]);
    if (!exist) {
      return res.status(404).json({ success: false, message: 'Participant non trouvé.' });
    }

    await dbAsync.run(`
      UPDATE registrations SET
        first_name = ?, last_name = ?, middle_name = ?, gender = ?, marital_status = ?,
        phone = ?, whatsapp = ?, email = ?, address = ?, city = ?, neighborhood = ?, commune = ?, province = ?, country = ?,
        family_status = ?, family_size = ?, children_count = ?,
        emergency_contact_name = ?, emergency_contact_phone = ?, emergency_contact_relationship = ?,
        source = ?, arrival_city = ?, transport_method = ?, full_retreat = ?, arrival_date = ?, departure_date = ?,
        organization_member = ?, department = ?, accommodation_required = ?, nights = ?, accommodation_type = ?,
        coming_with_others = ?, companions_count = ?, special_needs = ?, comments = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      data.first_name, data.last_name, data.middle_name, data.gender, data.marital_status,
      data.phone, data.whatsapp, data.email, data.address, data.city, data.neighborhood, data.commune, data.province, data.country,
      data.family_status, data.family_size, data.children_count,
      data.emergency_contact_name, data.emergency_contact_phone, data.emergency_contact_relationship,
      data.source, data.arrival_city, data.transport_method, data.full_retreat, data.arrival_date, data.departure_date,
      data.organization_member, data.department, data.accommodation_required, data.nights, data.accommodation_type,
      data.coming_with_others, data.companions_count, data.special_needs, data.comments,
      id
    ]);

    const updated = await dbAsync.get(`SELECT * FROM registrations WHERE id = ?`, [id]);
    return res.json({
      success: true,
      message: 'Participant mis à jour avec succès.',
      participant: updated
    });

  } catch (error) {
    console.error('Erreur updateRegistration:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
  }
}

/**
 * Admin: Delete participant
 */
async function deleteRegistration(req, res) {
  try {
    const { id } = req.params;
    const exist = await dbAsync.get(`SELECT id, registration_number FROM registrations WHERE id = ?`, [id]);
    if (!exist) {
      return res.status(404).json({ success: false, message: 'Participant non trouvé.' });
    }

    await dbAsync.run(`DELETE FROM registrations WHERE id = ?`, [id]);
    return res.json({
      success: true,
      message: `Participant ${exist.registration_number} supprimé avec succès.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
  }
}

/**
 * Admin QR Scanner / Entry Check-in
 */
async function checkInParticipant(req, res) {
  try {
    const { registrationCode } = req.body;
    if (!registrationCode) {
      return res.status(400).json({ success: false, message: 'Code d’inscription manquant.' });
    }

    const participant = await dbAsync.get(
      `SELECT * FROM registrations WHERE registration_number = ? OR id = ?`,
      [registrationCode.trim(), registrationCode.trim()]
    );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide. Aucun participant trouvé avec ce numéro.'
      });
    }

    if (participant.checked_in === 1) {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: `⚠️ Le participant ${participant.first_name} ${participant.last_name} (${participant.registration_number}) a DÉJÀ été scanné à ${participant.checkin_time}.`,
        participant
      });
    }

    const now = new Date().toISOString();
    await dbAsync.run(
      `UPDATE registrations SET checked_in = 1, checkin_time = ? WHERE id = ?`,
      [now, participant.id]
    );

    participant.checked_in = 1;
    participant.checkin_time = now;

    return res.json({
      success: true,
      alreadyCheckedIn: false,
      message: `✅ Présence confirmée pour ${participant.first_name} ${participant.last_name} (${participant.registration_number}). Access autorisé!`,
      participant
    });

  } catch (error) {
    console.error('Erreur checkInParticipant:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la validation du scanner.' });
  }
}

/**
 * Admin: Export CSV
 */
async function exportCSV(req, res) {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const city = req.query.city || null;
    const gender = req.query.gender || null;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push(`(first_name LIKE ? OR last_name LIKE ? OR registration_number LIKE ? OR phone LIKE ?)`);
      params.push(search, search, search, search);
    }
    if (city) {
      whereClauses.push(`city = ?`);
      params.push(city);
    }
    if (gender) {
      whereClauses.push(`gender = ?`);
      params.push(gender);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const rows = await dbAsync.all(`SELECT * FROM registrations ${whereSql} ORDER BY id ASC`, params);

    // CSV Header
    let csv = 'N° Inscription,Nom,Postnom,Prénom,Sexe,État Civil,Téléphone,WhatsApp,Email,Ville,Pays,Membre,Département,Hébergement,Accompagnants,Présent,Date Inscription\n';

    rows.forEach(r => {
      const escape = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      csv += [
        escape(r.registration_number),
        escape(r.last_name),
        escape(r.middle_name),
        escape(r.first_name),
        escape(r.gender),
        escape(r.marital_status),
        escape(r.phone),
        escape(r.whatsapp),
        escape(r.email),
        escape(r.city),
        escape(r.country),
        escape(r.organization_member),
        escape(r.department),
        escape(r.accommodation_required),
        escape(r.companions_count),
        r.checked_in ? 'Oui' : 'Non',
        escape(r.created_at)
      ].join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="haphak_2026_participants.csv"');
    return res.status(200).send('\uFEFF' + csv); // Include UTF-8 BOM for Excel

  } catch (error) {
    console.error('Erreur exportCSV:', error);
    return res.status(500).send('Erreur lors de la génération du CSV.');
  }
}

/**
 * Admin: Get retreat settings
 */
async function getSettings(req, res) {
  try {
    const rows = await dbAsync.all(`SELECT key, value FROM retreat_settings`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return res.json({ success: true, settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Erreur chargement paramètres.' });
  }
}

/**
 * Admin: Update retreat settings
 */
async function updateSettings(req, res) {
  try {
    const settings = req.body; // Key-value object
    for (const key of Object.keys(settings)) {
      const value = String(settings[key]);
      const exist = await dbAsync.get(`SELECT id FROM retreat_settings WHERE key = ?`, [key]);
      if (exist) {
        await dbAsync.run(`UPDATE retreat_settings SET value = ? WHERE key = ?`, [value, key]);
      } else {
        await dbAsync.run(`INSERT INTO retreat_settings (key, value) VALUES (?, ?)`, [key, value]);
      }
    }
    return res.json({ success: true, message: 'Paramètres de la retraite mis à jour.' });
  } catch (error) {
    console.error('Erreur updateSettings:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour des paramètres.' });
  }
}

/**
 * Admin: Create Database Backup
 */
async function triggerBackup(req, res) {
  try {
    const result = await createDatabaseBackup();
    return res.json({
      success: true,
      message: `Sauvegarde créée avec succès: ${result.backupFile}`,
      backupFile: result.backupFile
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la sauvegarde.'
    });
  }
}

module.exports = {
  login,
  getMe,
  logout,
  getDashboardStats,
  getRegistrations,
  getRegistrationById,
  updateRegistration,
  deleteRegistration,
  checkInParticipant,
  exportCSV,
  getSettings,
  updateSettings,
  triggerBackup
};
