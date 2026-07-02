// ============================================================
// Transaction Routes — On-chain Transaction History
// ============================================================
// GET /api/transactions — List all transactions (from system_log)
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/transactions
 * List all on-chain transactions (claims + transfers)
 * Admin only — shows full transaction history
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build query from kepemilikan table (ownership records = transactions)
    let query = `
      SELECT
        kp.id_kepemilikan,
        kp.id_item,
        kp.wallet_address,
        kp.tanggal_klaim,
        kp.status_kepemilikan,
        kp.tx_hash,
        kp.created_at,
        pi.hash_blockchain,
        pi.status as item_status,
        pm.nama_produk,
        pm.tipe_artikel,
        ks.nama_display
      FROM kepemilikan kp
      JOIN product_item pi ON kp.id_item = pi.id_item
      JOIN produk_master pm ON pi.id_produk = pm.id_produk
      LEFT JOIN konsumen ks ON kp.wallet_address = ks.wallet_address
    `;

    const params = [];
    const conditions = [];

    if (type === 'active') {
      conditions.push("kp.status_kepemilikan = 'active'");
    } else if (type === 'transferred') {
      conditions.push("kp.status_kepemilikan = 'transferred'");
    }

    if (search) {
      conditions.push('(kp.id_item LIKE ? OR kp.wallet_address LIKE ? OR pm.nama_produk LIKE ? OR pm.tipe_artikel LIKE ? OR pi.hash_blockchain LIKE ? OR kp.tx_hash LIKE ? OR kp.status_kepemilikan LIKE ? OR ks.nama_display LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY kp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM kepemilikan kp';
    if (conditions.length > 0) {
      countQuery += ` JOIN product_item pi ON kp.id_item = pi.id_item
                      JOIN produk_master pm ON pi.id_produk = pm.id_produk
                      LEFT JOIN konsumen ks ON kp.wallet_address = ks.wallet_address
                      WHERE ${conditions.join(' AND ')}`;
    }
    const countParams = params.slice(0, -2); // remove limit & offset
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
