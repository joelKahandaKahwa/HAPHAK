const nodemailer = require('nodemailer');
const config = require('../config');
const { generateQRBuffer } = require('./qrGenerator');

let transporter = null;

if (config.smtp.host && config.smtp.user) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
}

/**
 * Send registration confirmation email with QR Code attachment
 * @param {Object} participant Participant object with registration_number, email, first_name, last_name
 */
async function sendConfirmationEmail(participant) {
  const qrText = participant.registration_number;
  let qrBuffer;
  try {
    qrBuffer = await generateQRBuffer(qrText);
  } catch (err) {
    console.error('Impossible de générer le QR Code pour le mail:', err.message);
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #d4af37;">
        <h1 style="color: #1e293b; margin: 0;">RETRAITE HAPHAK 2026</h1>
        <p style="color: #d4af37; font-weight: bold; margin-top: 5px;">Confirmation d'Inscription</p>
      </div>

      <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
        <p>Bonjour <strong>${participant.first_name} ${participant.last_name}</strong>,</p>
        <p>Votre inscription à la retraite <strong>HAPHAK 2026</strong> a bien été enregistrée avec succès.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #d4af37; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">N° d'inscription officiel :</p>
          <p style="margin: 5px 0 0 0; font-size: 22px; font-weight: bold; color: #1e293b; letter-spacing: 1px;">
            ${participant.registration_number}
          </p>
        </div>

        <p>Veuillez conserver précieusement ce message et présenter le code QR ci-dessous lors de votre arrivée à l'accueil pour la validation de votre présence.</p>

        ${qrBuffer ? `
          <div style="text-align: center; margin: 25px 0;">
            <img src="cid:qrcode_pass" alt="QR Code d'inscription" style="width: 220px; height: 220px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px;" />
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">Présentez ce QR Code à l'entrée</p>
          </div>
        ` : ''}

        <p style="font-size: 13px; color: #64748b; font-style: italic;">
          Si vous avez des questions ou souhaitez modifier vos informations, contactez le comité d'organisation.
        </p>
      </div>

      <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        © 2026 Retraite HAPHAK. Tous droits réservés.
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`ℹ️ [MODE SIMULATION EMAIL] Email de confirmation généré pour ${participant.email} (${participant.registration_number}). (Configurez SMTP dans .env pour l'envoi réel)`);
    return { simulated: true };
  }

  const mailOptions = {
    from: config.smtp.from,
    to: participant.email,
    subject: `Confirmation d'inscription HAPHAK 2026 - ${participant.registration_number}`,
    html: htmlContent,
    attachments: qrBuffer ? [
      {
        filename: `qrcode-${participant.registration_number}.png`,
        content: qrBuffer,
        cid: 'qrcode_pass'
      }
    ] : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email envoyé à ${participant.email}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`❌ Échec d'envoi d'email à ${participant.email}:`, error.message);
    return { error: error.message };
  }
}

module.exports = {
  sendConfirmationEmail
};
