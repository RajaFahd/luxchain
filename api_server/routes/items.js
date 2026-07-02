// ============================================================
// Item Routes — Verification & Lookup
// ============================================================
// GET  /api/items              — Get all items
// GET  /api/items/:uuid        — Get item by UUID (QR scan)
// POST /api/items/:uuid/verify — Cross-check with blockchain
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { generateMetadataHash } = require('../utils/hash');
const { getContract, isBlockchainConnected } = require('../config/blockchain');

/**
 * GET /api/items
 * Get all product items (for admin dashboard)
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    let query = `
      SELECT
        pi.id_item, pi.status, pi.is_claimed, pi.created_at, pi.hash_blockchain, pi.tx_hash, pi.secret_code,
        pm.nama_produk, pm.gambar_url
       FROM product_item pi
       JOIN produk_master pm ON pi.id_produk = pm.id_produk
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(pi.id_item LIKE ? OR pm.nama_produk LIKE ? OR pi.secret_code LIKE ? OR pi.hash_blockchain LIKE ? OR pi.tx_hash LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    if (status) {
      conditions.push('pi.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Clone conditions and params for count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM product_item pi
      JOIN produk_master pm ON pi.id_produk = pm.id_produk
    `;
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY pi.created_at DESC LIMIT ? OFFSET ?';

    const [rows] = await pool.query(query, [...params, parsedLimit, offset]);
    const [countResult] = await pool.query(countQuery, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: countResult[0]?.total || 0,
        totalPages: Math.ceil((countResult[0]?.total || 0) / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/items/:uuid
 * Get item details by UUID — used when consumer scans QR Code
 * Public endpoint (no auth required)
 */
router.get('/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    // Get item + product master data
    const [rows] = await pool.execute(
      `SELECT
        pi.*,
        pm.nama_produk,
        pm.harga,
        pm.warna,
        pm.tipe_artikel,
        pm.tanggal_produksi,
        pm.gambar_url,
        sk.nama_sub_kategori,
        k.nama_kategori
       FROM product_item pi
       JOIN produk_master pm ON pi.id_produk = pm.id_produk
       LEFT JOIN sub_kategori sk ON pm.id_sub_kategori = sk.id_sub_kategori
       LEFT JOIN kategori k ON sk.id_kategori = k.id_kategori
       WHERE pi.id_item = ?`,  
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product item not found.',
        verified: false,
      });
    }

    const item = rows[0];

    // SECURITY: Never expose secret_code to public endpoint
    delete item.secret_code;

    // Get current ownership
    const [ownership] = await pool.execute(
      `SELECT kp.*, ks.nama_display
       FROM kepemilikan kp
       LEFT JOIN konsumen ks ON kp.wallet_address = ks.wallet_address
       WHERE kp.id_item = ? AND kp.status_kepemilikan = 'active'
       ORDER BY kp.created_at DESC
       LIMIT 1`,
      [uuid]
    );

    res.json({
      success: true,
      data: {
        item,
        currentOwner: ownership.length > 0 ? ownership[0] : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items/:uuid/verify
 * ⛓️ Cross-check product authenticity with blockchain
 *
 * Flow:
 * 1. Query metadata from MySQL (off-chain)
 * 2. Read-only call to Smart Contract (on-chain)
 * 3. Recompute SHA-256 hash from MySQL metadata
 * 4. Compare: on-chain hash vs recomputed hash
 * 5. Return verification result
 */
router.post('/:uuid/verify', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    // 1. Get item from MySQL (off-chain)
    const [rows] = await pool.execute(
      `SELECT
        pi.*,
        pm.nama_produk,
        pm.harga,
        pm.warna,
        pm.tipe_artikel,
        pm.tanggal_produksi
       FROM product_item pi
       JOIN produk_master pm ON pi.id_produk = pm.id_produk
       WHERE pi.id_item = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        verified: false,
        message: 'Product not found in database.',
        status: 'NOT_FOUND',
      });
    }

    const item = rows[0];

    // 2. Recompute hash from MySQL metadata
    // IMPORTANT: tanggal_produksi from MySQL is a Date object.
    // We must normalize to YYYY-MM-DD string to match hash computed at creation time.
    let tglProduksi = '';
    if (item.tanggal_produksi instanceof Date) {
      const d = item.tanggal_produksi;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      tglProduksi = `${year}-${month}-${day}`;
    } else {
      tglProduksi = String(item.tanggal_produksi || '').split('T')[0];
    }

    // Normalize harga: MySQL DECIMAL(15,2) returns "15000000.00"
    // but at creation time the raw input "15000000" was used
    const hargaNormalized = String(item.harga).replace(/\.00$/, '');

    const recomputedHash = generateMetadataHash({
      uuid: item.id_item,
      nama_produk: item.nama_produk,
      harga: hargaNormalized,
      warna: item.warna || '',
      tipe_artikel: item.tipe_artikel,
      tanggal_produksi: tglProduksi,
    });

    // 3. Check against blockchain (if connected)
    let blockchainData = null;
    let onChainHash = null;

    if (isBlockchainConnected()) {
      try {
        const contract = getContract();
        const result = await contract.getProductByUUID(uuid);

        blockchainData = {
          tokenId: result.tokenId.toString(),
          metadataHash: result.metadataHash,
          currentOwner: result.currentOwner,
          mintedBy: result.mintedBy,
          mintedAt: new Date(Number(result.mintedAt) * 1000).toISOString(),
        };
        onChainHash = result.metadataHash;
      } catch (blockchainError) {
        // Product not found on blockchain
        blockchainData = null;
      }
    }

    // 4. Determine verification result
    let verified = false;
    let status = 'UNKNOWN';

    if (item.status === 'pending') {
      status = 'PENDING';
      verified = false;
    } else if (onChainHash) {
      // Compare on-chain hash with recomputed hash
      if (onChainHash === recomputedHash && onChainHash === item.hash_blockchain) {
        verified = true;
        status = 'VERIFIED';
      } else {
        verified = false;
        status = 'HASH_MISMATCH';
      }
    } else if (item.hash_blockchain === recomputedHash) {
      // Blockchain offline, but MySQL hash matches
      verified = true;
      status = 'VERIFIED_OFFLINE';
    } else {
      verified = false;
      status = 'HASH_MISMATCH';
    }

    // 5. Get ownership history
    const [ownershipHistory] = await pool.execute(
      `SELECT kp.*, ks.nama_display
       FROM kepemilikan kp
       LEFT JOIN konsumen ks ON kp.wallet_address = ks.wallet_address
       WHERE kp.id_item = ?
       ORDER BY kp.created_at ASC`,
      [uuid]
    );

    res.json({
      success: true,
      verified,
      status,
      message: verified
        ? 'PRODUK TERVERIFIKASI — Hash blockchain cocok ✓'
        : status === 'PENDING'
          ? 'Product is pending — not yet minted to blockchain.'
          : 'PRODUK TIDAK TERVERIFIKASI — Hash tidak cocok ✗',
      data: {
        product: {
          id_item: item.id_item,
          nama_produk: item.nama_produk,
          harga: item.harga,
          warna: item.warna,
          tipe_artikel: item.tipe_artikel,
          tanggal_produksi: item.tanggal_produksi,
          status: item.status,
        },
        hashes: {
          stored_hash: item.hash_blockchain,
          recomputed_hash: recomputedHash,
          on_chain_hash: onChainHash,
          match: verified,
        },
        blockchain: blockchainData,
        ownershipHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
