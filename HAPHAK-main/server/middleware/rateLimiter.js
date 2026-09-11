const rateLimit = require('express-rate-limit');

// Rate limiter for public registrations (e.g., max 10 registrations per IP per 15 minutes)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de tentatives d’inscription depuis cette adresse IP. Veuillez réessayer dans 15 minutes.'
  }
});

// Rate limiter for admin login (e.g., max 5 failed logins per IP per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Nombreux essais de connexion infructueux. Veuillez patienter 15 minutes avant de réessayer.'
  }
});

module.exports = {
  registrationLimiter,
  loginLimiter
};
