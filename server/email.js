// ============================================================
// Envoi des e-mails de confirmation (Nodemailer / SMTP).
// Toute la configuration vient des variables d'environnement.
// ============================================================

const nodemailer = require('nodemailer');
const { query } = require('./db');
const HAPHAK = require('./haphak');

let transport = null;

function getTransport() {
  if (transport) return transport;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null; // SMTP non configuré : l'inscription fonctionne quand même.
  }

  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return transport;
}

function echapper(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function construireHtml(inscription) {
  const ligne = (cle, valeur) => `
    <tr>
      <td style="padding:7px 0;color:#5C6B7F;font-size:14px;">${cle}</td>
      <td style="padding:7px 0;text-align:right;font-size:14px;font-weight:600;color:#0B1F3A;">${echapper(valeur)}</td>
    </tr>`;

  return `
<div style="font-family:Georgia,'Times New Roman',serif;background:#FAF8F4;padding:32px 20px;color:#0B1F3A;">
  <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border:1px solid #EFEAE0;padding:32px;">

    <div style="text-align:center;padding-bottom:24px;border-bottom:1px solid #EFEAE0;">
      <p style="margin:0;letter-spacing:5px;font-size:12px;color:#C9A24B;">HAPHAK</p>
      <h1 style="margin:6px 0 4px;font-size:26px;font-weight:500;">« ${HAPHAK.signification} »</h1>
      <p style="margin:0;font-style:italic;color:#5C6B7F;font-size:15px;">« ${HAPHAK.theme} »</p>
      <p style="margin:6px 0 0;font-size:13px;color:#C9A24B;">${HAPHAK.verset}</p>
    </div>

    <p style="font-size:15px;line-height:1.6;">
      Bonjour ${echapper(inscription.first_name)} ${echapper(inscription.last_name)},
    </p>
    <p style="font-size:15px;line-height:1.6;">
      Votre inscription à HAPHAK est bien enregistrée. Conservez ce message :
      il contient votre numéro d'inscription.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:22px 0;">
      ${ligne("Numéro d'inscription", inscription.registration_number)}
      ${ligne('Dates', HAPHAK.dates)}
      ${ligne('Début', HAPHAK.debut)}
      ${ligne('Lieu', HAPHAK.lieu)}
      ${ligne('Contact', HAPHAK.contact)}
    </table>

    <div style="background:#FAF8F4;border-left:3px solid #C9A24B;padding:14px 16px;margin:22px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.5px;color:#C9A24B;">
        SESSIONS QUOTIDIENNES
      </p>
      ${HAPHAK.programme.map((s) => `
        <p style="margin:0 0 6px;font-size:14px;line-height:1.5;">
          <strong>${s.nom}</strong> — ${s.horaire}<br />
          <span style="color:#5C6B7F;">${s.contenu}</span>
        </p>`).join('')}
    </div>

    <p style="font-size:14px;line-height:1.6;color:#5C6B7F;">
      Pour toute question, écrivez à
      <a href="mailto:${HAPHAK.email}" style="color:#142F55;">${HAPHAK.email}</a>
      ou appelez le ${HAPHAK.contact}.
    </p>

    <p style="font-size:14px;margin-top:26px;">Au plaisir de vous accueillir.</p>
  </div>
</div>`;
}

function construireTexte(inscription) {
  return [
    'HAPHAK — « transforme »',
    `Thème : « ${HAPHAK.theme} » (${HAPHAK.verset})`,
    '',
    `Bonjour ${inscription.first_name} ${inscription.last_name},`,
    '',
    'Votre inscription à HAPHAK est bien enregistrée.',
    '',
    `Numéro d'inscription : ${inscription.registration_number}`,
    `Dates : ${HAPHAK.dates}`,
    `Début : ${HAPHAK.debut}`,
    `Lieu : ${HAPHAK.lieu}`,
    `Contact : ${HAPHAK.contact}`,
    '',
    'Sessions quotidiennes :',
    ...HAPHAK.programme.map((s) => `- ${s.nom} ${s.horaire} : ${s.contenu}`),
    '',
    `Questions : ${HAPHAK.email}`,
  ].join('\n');
}

/**
 * Envoie l'e-mail de confirmation et met à jour le statut en base.
 * Ne lève jamais d'exception : une erreur d'e-mail ne doit pas
 * compromettre une inscription déjà enregistrée.
 */
async function envoyerConfirmation(inscription) {
  const t = getTransport();

  if (!t) {
    const message = 'SMTP non configuré';
    await query(
      'UPDATE registrations SET email_status = $1, email_error = $2 WHERE id = $3',
      ['failed', message, inscription.id]
    );
    return { statut: 'failed', erreur: message };
  }

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: inscription.email,
      replyTo: HAPHAK.email,
      subject: `Confirmation d'inscription — HAPHAK ${inscription.registration_number}`,
      text: construireTexte(inscription),
      html: construireHtml(inscription),
    });

    await query(
      'UPDATE registrations SET email_status = $1, email_sent_at = NOW(), email_error = NULL WHERE id = $2',
      ['sent', inscription.id]
    );

    return { statut: 'sent' };
  } catch (err) {
    const message = String(err.message).slice(0, 500);
    console.error("Échec d'envoi d'e-mail :", message);

    await query(
      'UPDATE registrations SET email_status = $1, email_error = $2 WHERE id = $3',
      ['failed', message, inscription.id]
    );

    return { statut: 'failed', erreur: message };
  }
}

module.exports = { envoyerConfirmation };
