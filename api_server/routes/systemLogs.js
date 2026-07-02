// ============================================================
// System Log Routes — Admin Activity History
// ============================================================
// GET /api/system-logs — List all system log entries
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/system-logs
 * List all system log entries (MINT, MINT_RETRY, CLAIM, TRANSFER, etc.)
 * Admin only — shows full activity history
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { action, search, page = 1, limit = 50 } = req.query;
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const offset = (parsedPage - 1) * parsedLimit;

    let query = 'SELECT * FROM system_log';
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }

    if (search) {
      conditions.push('(action LIKE ? OR detail LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parsedLimit, offset);

    const [rows] = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM system_log';
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
      countParams.push(...params.slice(0, -2));
    }
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    // Parse detail JSON for each row
    const parsed = rows.map(row => {
      let detail = {};
      if (typeof row.detail === 'object' && row.detail !== null) {
        // mysql2 already parsed the JSON
        detail = row.detail;
      } else if (typeof row.detail === 'string') {
        try {
          detail = JSON.parse(row.detail);
        } catch {
          detail = { raw: row.detail };
        }
      }
      return {
        id: row.id || row.id_log,
        action: row.action,
        detail,
        created_at: row.created_at,
      };
    });

    res.json({
      success: true,
      data: parsed,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    // If system_log table doesn't exist, return empty
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });
    }
    next(error);
  }
});

module.exports = router;
