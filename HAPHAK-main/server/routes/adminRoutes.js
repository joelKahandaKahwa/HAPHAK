const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

// Public admin routes
router.post('/login', loginLimiter, adminController.login);
router.post('/logout', adminController.logout);

// Protected admin routes
router.use(authenticateAdmin);

router.get('/me', adminController.getMe);
router.get('/stats', adminController.getDashboardStats);
router.get('/registrations', adminController.getRegistrations);
router.get('/registrations/:id', adminController.getRegistrationById);
router.put('/registrations/:id', adminController.updateRegistration);
router.delete('/registrations/:id', adminController.deleteRegistration);

// Check-in / Scanner
router.post('/checkin', adminController.checkInParticipant);

// Export CSV
router.get('/export/csv', adminController.exportCSV);

// Retreat Settings Management
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Database Backup
router.post('/backup', adminController.triggerBackup);

module.exports = router;
