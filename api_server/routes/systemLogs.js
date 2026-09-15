// ============================================================
// System Log Routes — Admin Activity History
// ============================================================
// GET /api/system-logs — List all system log entries
// ============================================================

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/prisma');
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
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {};

    if (action) {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: parsedLimit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    // Parse detail JSON for each row
    const parsed = logs.map(row => {
      let detail = {};
      if (typeof row.detail === 'object' && row.detail !== null) {
        detail = row.detail;
      } else if (typeof row.detail === 'string') {
        try {
          detail = JSON.parse(row.detail);
        } catch {
          detail = { raw: row.detail };
        }
      }
      return {
        id: row.id_log,
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
    next(error);
  }
});

module.exports = router;
