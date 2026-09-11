const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { validateRegistrationData } = require('../middleware/validateRegistration');
const { registrationLimiter } = require('../middleware/rateLimiter');

// Public route: Submit registration
router.post(
  '/registrations',
  registrationLimiter,
  validateRegistrationData,
  registrationController.createRegistration
);

// Public route: Get public registration ticket by number/id
router.get(
  '/registrations/:regNumber',
  registrationController.getRegistrationDetails
);

// Public route: Get retreat configuration/settings
router.get(
  '/settings',
  registrationController.getPublicSettings
);

module.exports = router;
