const QRCode = require('qrcode');

/**
 * Generate a QR code as a Data URL (base64 PNG)
 * @param {string} text Content to encode in the QR Code
 * @returns {Promise<string>} Data URL string
 */
async function generateQRDataURL(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 300,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Erreur génération QR Code:', error);
    throw error;
  }
}

/**
 * Generate a QR code as a Buffer
 * @param {string} text Content to encode
 * @returns {Promise<Buffer>}
 */
async function generateQRBuffer(text) {
  try {
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      width: 350
    });
    return buffer;
  } catch (error) {
    console.error('Erreur génération QR Buffer:', error);
    throw error;
  }
}

module.exports = {
  generateQRDataURL,
  generateQRBuffer
};
