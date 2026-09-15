// ============================================================
// Transaction Routes — On-chain Transaction History
// ============================================================
// GET /api/transactions — List all transactions (from kepemilikan)
// ============================================================

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');

/**
 * GET /api/transactions
 * List all on-chain transactions (claims + transfers)
 * Admin only — shows full transaction history
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {};

    if (type === 'active') {
      where.status_kepemilikan = 'active';
    } else if (type === 'transferred') {
      where.status_kepemilikan = 'transferred';
    }

    if (search) {
      where.OR = [
        { id_item: { contains: search, mode: 'insensitive' } },
        { wallet_address: { contains: search, mode: 'insensitive' } },
        { tx_hash: { contains: search, mode: 'insensitive' } },
        {
          item: {
            produk: {
              OR: [
                { nama_produk: { contains: search, mode: 'insensitive' } },
                { tipe_artikel: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          konsumen: {
            nama_display: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.kepemilikan.findMany({
        where,
        include: {
          item: {
            include: {
              produk: true,
            },
          },
          konsumen: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: parsedLimit,
      }),
      prisma.kepemilikan.count({ where }),
    ]);

    const formatted = transactions.map(kp => ({
      id_kepemilikan: kp.id_kepemilikan,
      id_item: kp.id_item,
      wallet_address: kp.wallet_address,
      tanggal_klaim: kp.tanggal_klaim,
      status_kepemilikan: kp.status_kepemilikan,
      tx_hash: kp.tx_hash,
      created_at: kp.created_at,
      hash_blockchain: kp.item?.hash_blockchain || '',
      item_status: kp.item?.status || '',
      nama_produk: kp.item?.produk?.nama_produk || '',
      tipe_artikel: kp.item?.produk?.tipe_artikel || '',
      nama_display: kp.konsumen?.nama_display || '',
    }));

    res.json({
      success: true,
      data: formatted,
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
