const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Creates a backup copy of the SQLite database
 * @returns {Promise<{success: boolean, backupFile: string, backupPath: string}>}
 */
async function createDatabaseBackup() {
  return new Promise((resolve, reject) => {
    const dbPath = config.dbPath;
    if (!fs.existsSync(dbPath)) {
      return reject(new Error('Fichier de base de données introuvable pour la sauvegarde.'));
    }

    const exportsDir = path.resolve(__dirname, '../../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `haphak_backup_${dateStr}.db`;
    const backupFilePath = path.join(exportsDir, backupFileName);

    fs.copyFile(dbPath, backupFilePath, (err) => {
      if (err) {
        console.error('❌ Erreur lors de la sauvegarde:', err);
        return reject(err);
      }
      console.log(`💾 Sauvegarde de la base réussie: ${backupFileName}`);
      resolve({
        success: true,
        backupFile: backupFileName,
        backupPath: backupFilePath
      });
    });
  });
}

module.exports = {
  createDatabaseBackup
};
