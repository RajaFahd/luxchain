// ============================================================
// Category Routes — Kategori & SubKategori
// ============================================================
// GET  /api/categories              — List all categories
// POST /api/categories              — Create category
// GET  /api/categories/:id/subs     — List sub-categories
// POST /api/categories/:id/subs     — Create sub-category
// ============================================================

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/categories
 * List all categories with sub-categories
 */
router.get('/', async (req, res, next) => {
  try {
    const [categories] = await pool.execute(
      `SELECT k.*, COUNT(sk.id_sub_kategori) as sub_count
       FROM kategori k
       LEFT JOIN sub_kategori sk ON k.id_kategori = sk.id_kategori
       GROUP BY k.id_kategori
       ORDER BY k.nama_kategori`
    );

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { nama_kategori } = req.body;

    if (!nama_kategori) {
      return res.status(400).json({
        success: false,
        message: 'nama_kategori is required.',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO kategori (nama_kategori) VALUES (?)',
      [nama_kategori]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: {
        id_kategori: result.insertId,
        nama_kategori,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id/subs
 * List sub-categories for a category
 */
router.get('/:id/subs', async (req, res, next) => {
  try {
    const [subs] = await pool.execute(
      `SELECT sk.*, k.nama_kategori
       FROM sub_kategori sk
       JOIN kategori k ON sk.id_kategori = k.id_kategori
       WHERE sk.id_kategori = ?
       ORDER BY sk.nama_sub_kategori`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: subs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories/:id/subs
 * Create a new sub-category
 */
router.post('/:id/subs', authMiddleware, async (req, res, next) => {
  try {
    const { nama_sub_kategori } = req.body;

    if (!nama_sub_kategori) {
      return res.status(400).json({
        success: false,
        message: 'nama_sub_kategori is required.',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO sub_kategori (id_kategori, nama_sub_kategori) VALUES (?, ?)',
      [req.params.id, nama_sub_kategori]
    );

    res.status(201).json({
      success: true,
      message: 'Sub-category created successfully.',
      data: {
        id_sub_kategori: result.insertId,
        id_kategori: parseInt(req.params.id),
        nama_sub_kategori,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
