// ============================================================
// Hash Utility — SHA-256 Hashing for Product Metadata
// ============================================================

const crypto = require('crypto');

/**
 * Generate SHA-256 hash from product metadata
 * This hash is stored on-chain as proof-of-authenticity
 *
 * @param {Object} metadata - Product metadata object
 * @param {string} metadata.uuid        - Product item UUID
 * @param {string} metadata.nama_produk - Product name
 * @param {string} metadata.harga       - Price
 * @param {string} metadata.warna       - Color
 * @param {string} metadata.tipe_artikel - Article type / brand
 * @param {string} metadata.tanggal_produksi - Production date
 * @returns {string} SHA-256 hash (64 chars hex)
 */
function generateMetadataHash(metadata) {
  // Concatenate metadata fields in a deterministic order
  const dataString = [
    metadata.uuid,
    metadata.nama_produk,
    metadata.harga,
    metadata.warna,
    metadata.tipe_artikel,
    metadata.tanggal_produksi,
  ].join('|');

  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Verify a hash against metadata
 * @param {string} hash - Expected hash
 * @param {Object} metadata - Product metadata
 * @returns {boolean} True if hash matches
 */
function verifyHash(hash, metadata) {
  const computed = generateMetadataHash(metadata);
  return computed === hash;
}

module.exports = { generateMetadataHash, verifyHash };
