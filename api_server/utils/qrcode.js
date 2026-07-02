// ============================================================
// QR Code Generator Utility
// ============================================================

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Ensure QR codes output directory exists
const QR_DIR = path.join(__dirname, '..', 'public', 'qrcodes');
if (!fs.existsSync(QR_DIR)) {
  fs.mkdirSync(QR_DIR, { recursive: true });
}

const { createCanvas, loadImage } = require('canvas');

/**
 * Generate a QR Code image from a UUID with text below it.
 * The QR code encodes the UUID which is used for product verification
 *
 * @param {string} uuid - Product item UUID
 * @param {string} secretCode - 6-digit secret code
 * @returns {Promise<Object>} { filePath, fileName, dataUrl }
 */
async function generateQRCode(uuid, secretCode) {
  const fileName = `qr_${uuid}.png`;
  const filePath = path.join(QR_DIR, fileName);

  // 1. Generate the raw QR Code as a Data URL
  const qrDataUrl = await QRCode.toDataURL(uuid, {
    width: 400,
    margin: 2,
    color: {
      dark: '#0A192F',  // Deep Navy
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });

  // 2. Load QR code into Canvas
  const qrImage = await loadImage(qrDataUrl);
  
  // Dimensions
  const canvasWidth = 460;
  const canvasHeight = 580;
  
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw border (kotak QR)
  ctx.strokeStyle = '#0A192F';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

  // Draw QR Code in the center top
  const qrX = (canvasWidth - qrImage.width) / 2;
  const qrY = 30;
  ctx.drawImage(qrImage, qrX, qrY);

  // Draw UUID
  ctx.fillStyle = '#0A192F';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('UUID:', canvasWidth / 2, qrY + qrImage.height + 30);
  
  ctx.font = '14px monospace';
  ctx.fillText(uuid, canvasWidth / 2, qrY + qrImage.height + 55);

  // Draw Secret Code
  ctx.font = 'bold 16px monospace';
  ctx.fillText('SECRET CODE:', canvasWidth / 2, qrY + qrImage.height + 95);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#E05C5C'; // Red-ish for secret code
  // If no secretCode passed (fallback), use placeholder
  ctx.fillText(secretCode || 'XXXXXX', canvasWidth / 2, qrY + qrImage.height + 125);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);

  // Also return dataUrl of the combined image
  const finalDataUrl = canvas.toDataURL('image/png');

  return {
    filePath,
    fileName,
    dataUrl: finalDataUrl,
    publicUrl: `/qrcodes/${fileName}`,
  };
}

module.exports = { generateQRCode };
