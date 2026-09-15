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
const { prisma } = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/categories
 * List all categories with sub-categories
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.kategori.findMany({
      include: {
        _count: {
          select: { sub_kategori: true },
        },
      },
      orderBy: {
        nama_kategori: 'asc',
      },
    });

    const formatted = categories.map(k => ({
      id_kategori: k.id_kategori,
      nama_kategori: k.nama_kategori,
      sub_count: k._count.sub_kategori,
    }));

    res.json({
      success: true,
      data: formatted,
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

    const created = await prisma.kategori.create({
      data: {
        nama_kategori: nama_kategori.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: created,
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
    const id_kategori = parseInt(req.params.id);

    const subs = await prisma.subKategori.findMany({
      where: {
        id_kategori,
      },
      include: {
        kategori: {
          select: {
            nama_kategori: true,
          },
        },
      },
      orderBy: {
        nama_sub_kategori: 'asc',
      },
    });

    const formatted = subs.map(sk => ({
      id_sub_kategori: sk.id_sub_kategori,
      id_kategori: sk.id_kategori,
      nama_sub_kategori: sk.nama_sub_kategori,
      nama_kategori: sk.kategori?.nama_kategori || '',
    }));

    res.json({
      success: true,
      data: formatted,
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
    const id_kategori = parseInt(req.params.id);

    if (!nama_sub_kategori) {
      return res.status(400).json({
        success: false,
        message: 'nama_sub_kategori is required.',
      });
    }

    const created = await prisma.subKategori.create({
      data: {
        id_kategori,
        nama_sub_kategori: nama_sub_kategori.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Sub-category created successfully.',
      data: created,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
