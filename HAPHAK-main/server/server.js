const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { initDatabase } = require('./database');

const registrationRoutes = require('./routes/registrationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security HTTP headers (customized to allow inline scripts/styles & images in vanilla frontend)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for easy local loading of inline scripts & QR code canvas
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
app.use(cors());

// Body Parsers & Cookie Parser
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Serve static assets
app.use(express.static(path.join(__dirname, '../public')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));

// API Routes
app.use('/api', registrationRoutes);
app.use('/api/admin', adminRoutes);

// Fallback HTML page handling
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dashboard.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur. Veuillez réessayer ultérieurement.'
  });
});

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(config.port, () => {
    console.log(`==================================================`);
    console.log(`🚀 Serveur HAPHAK 2026 démarré avec succès !`);
    console.log(`🌐 Accès public : http://localhost:${config.port}`);
    console.log(`🔐 Espaces Administration : http://localhost:${config.port}/admin/login.html`);
    console.log(`==================================================`);
  });
}).catch(err => {
  console.error('❌ Échec critique d’initialisation du serveur:', err);
});

module.exports = app;
