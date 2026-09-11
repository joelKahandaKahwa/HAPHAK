/**
 * Server-side registration data validator & sanitizer
 */
function validateRegistrationData(req, res, next) {
  const data = req.body;
  const errors = [];

  // Helper trim function
  const sanitize = (val) => (typeof val === 'string' ? val.trim() : '');

  // Step 1: Identité
  const last_name = sanitize(data.last_name);
  const first_name = sanitize(data.first_name);
  const middle_name = sanitize(data.middle_name);
  const gender = sanitize(data.gender);
  const marital_status = sanitize(data.marital_status);

  if (!last_name || last_name.length < 2) {
    errors.push('Le nom est obligatoire et doit comporter au moins 2 caractères.');
  }

  if (!first_name || first_name.length < 2) {
    errors.push('Le prénom est obligatoire et doit comporter au moins 2 caractères.');
  }

  if (!gender || !['Homme', 'Femme'].includes(gender)) {
    errors.push('Veuillez sélectionner votre sexe (Homme ou Femme).');
  }

  if (!marital_status || !['Célibataire', 'Marié(e)'].includes(marital_status)) {
    errors.push('Veuillez sélectionner un état civil valide.');
  }

  // Step 2: Coordonnées
  const phone = sanitize(data.phone);
  const whatsapp = sanitize(data.whatsapp);
  const email = sanitize(data.email);
  const address = sanitize(data.address);
  const city = sanitize(data.city);
  const neighborhood = sanitize(data.neighborhood);
  const commune = sanitize(data.commune);
  const province = sanitize(data.province);
  const country = sanitize(data.country);

  const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
  if (!phone || !phoneRegex.test(phone)) {
    errors.push('Veuillez fournir un numéro de téléphone valide.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push('Veuillez fournir une adresse e-mail valide.');
  }

  if (!city || city.length < 2) {
    errors.push('Veuillez indiquer votre ville de résidence.');
  }

  if (!country || country.length < 2) {
    errors.push('Veuillez indiquer votre pays de résidence.');
  }

  // Step 3: Urgence
  const emergency_contact_name = sanitize(data.emergency_contact_name);
  const emergency_contact_phone = sanitize(data.emergency_contact_phone);
  const emergency_contact_relationship = sanitize(data.emergency_contact_relationship);

  if (!emergency_contact_name) {
    errors.push('Le nom de la personne à contacter en cas d’urgence est obligatoire.');
  }
  if (!emergency_contact_phone || !phoneRegex.test(emergency_contact_phone)) {
    errors.push('Le numéro de téléphone de la personne d’urgence est invalide.');
  }
  if (!emergency_contact_relationship) {
    errors.push('Veuillez indiquer le lien avec la personne de contact en cas d’urgence.');
  }

  // Step 6: Consentement
  if (data.consent !== true && data.consent !== 1 && data.consent !== '1' && data.consent !== 'true') {
    errors.push('Vous devez accepter le traitement de vos données pour valider votre inscription.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation des données.',
      errors
    });
  }

  // Attach sanitized fields back to body
  req.body.last_name = last_name;
  req.body.first_name = first_name;
  req.body.middle_name = middle_name;
  req.body.gender = gender;
  req.body.marital_status = marital_status;
  req.body.phone = phone;
  req.body.whatsapp = whatsapp || phone;
  req.body.email = email.toLowerCase();
  req.body.address = address;
  req.body.city = city;
  req.body.neighborhood = neighborhood;
  req.body.commune = commune;
  req.body.province = province;
  req.body.country = country;
  req.body.emergency_contact_name = emergency_contact_name;
  req.body.emergency_contact_phone = emergency_contact_phone;
  req.body.emergency_contact_relationship = emergency_contact_relationship;

  next();
}

module.exports = {
  validateRegistrationData
};
