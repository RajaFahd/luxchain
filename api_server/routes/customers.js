// ============================================================
// Customers Routes
// ============================================================
// GET  /api/customers          — Get all customers
// ============================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { ethers } = require('ethers');
const { prisma } = require('../config/prisma');

/**
 * POST /api/customers/verify-wallet
 * Validate that the private key matches the wallet address
 * Body: { wallet_address, private_key }
 */
router.post('/verify-wallet', async (req, res, next) => {
  try {
    const { wallet_address, private_key } = req.body;

    if (!wallet_address || !private_key) {
      return res.status(400).json({
        success: false,
        message: 'wallet_address and private_key are required.',
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    // Validate private key format (64 hex characters, optionally starting with 0x)
    const cleanPk = private_key.startsWith('0x') ? private_key : `0x${private_key}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(cleanPk)) {
      return res.status(400).json({
        success: false,
        message: 'Format private key tidak valid (harus 64 karakter hex).',
      });
    }

    try {
      // Derive address from private key using ethers.Wallet
      const tempWallet = new ethers.Wallet(cleanPk);
      
      if (tempWallet.address.toLowerCase() !== wallet_address.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Private key tidak cocok dengan alamat wallet yang Anda masukkan.',
        });
      }

      res.json({
        success: true,
        message: 'Wallet tervalidasi dengan sukses.',
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Gagal memvalidasi private key. Format atau data tidak valid.',
      });
    }
  } catch (error) {
    next(error);
  }
});

// ===== Multer & Supabase Storage config for profile photos =====
const { upload, uploadImageToSupabase } = require('../config/storage');

/**
 * GET /api/customers
 * Get all customers (for admin dashboard)
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, min_assets, min_tx, sort_by, page = 1, limit = 20 } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    // Fetch all customers with kepemilikan count
    const where = {};
    if (search) {
      where.OR = [
        { wallet_address: { contains: search, mode: 'insensitive' } },
        { nama_display: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.konsumen.findMany({
      where,
      include: {
        kepemilikan: true,
      },
      orderBy: {
        join_date: 'desc',
      },
    });

    // Format & compute aggregated counts
    let data = customers.map(c => {
      const activeItems = c.kepemilikan.filter(k => k.status_kepemilikan === 'active').length;
      const totalTx = c.kepemilikan.length;
      return {
        wallet_address: c.wallet_address,
        nama_display: c.nama_display,
        foto_profile: c.foto_profile,
        join_date: c.join_date,
        active_items: activeItems,
        total_transactions: totalTx,
      };
    });

    // Apply min_assets and min_tx filters
    if (min_assets) {
      data = data.filter(c => c.active_items >= parseInt(min_assets));
    }
    if (min_tx) {
      data = data.filter(c => c.total_transactions >= parseInt(min_tx));
    }

    // Sorting
    if (sort_by === 'assets_desc') {
      data.sort((a, b) => b.active_items - a.active_items);
    } else if (sort_by === 'assets_asc') {
      data.sort((a, b) => a.active_items - b.active_items);
    } else if (sort_by === 'tx_desc') {
      data.sort((a, b) => b.total_transactions - a.total_transactions);
    } else if (sort_by === 'tx_asc') {
      data.sort((a, b) => a.total_transactions - b.total_transactions);
    }

    const total = data.length;
    const paginated = data.slice(offset, offset + parsedLimit);

    res.json({
      success: true,
      data: paginated,
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

/**
 * POST /api/customers/update
 * Update consumer's display name (nama_display)
 * Body: { wallet_address, nama_display }
 */
router.post('/update', async (req, res, next) => {
  try {
    const { wallet_address, nama_display } = req.body;

    if (!wallet_address || !nama_display) {
      return res.status(400).json({
        success: false,
        message: 'wallet_address and nama_display are required.',
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    const updated = await prisma.konsumen.upsert({
      where: { wallet_address },
      update: { nama_display: nama_display.trim() },
      create: {
        wallet_address,
        nama_display: nama_display.trim(),
      },
    });

    res.json({
      success: true,
      message: 'Display name updated successfully!',
      data: {
        wallet_address: updated.wallet_address,
        nama_display: updated.nama_display,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customers/update-avatar
 * Upload consumer's profile photo
 * Multipart fields: wallet_address (string), foto_profile (file)
 */
router.post('/update-avatar', upload.single('foto_profile'), async (req, res, next) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'wallet_address is required.',
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No profile image file was uploaded.',
      });
    }

    // Upload to Supabase Storage 'foto_profile' as WebP
    const publicUrl = await uploadImageToSupabase(req.file.buffer, 'foto_profile', 'profile');

    const updated = await prisma.konsumen.upsert({
      where: { wallet_address },
      update: { foto_profile: publicUrl },
      create: {
        wallet_address,
        nama_display: `User_${wallet_address.substring(0, 8)}`,
        foto_profile: publicUrl,
      },
    });

    res.json({
      success: true,
      message: 'Profile photo updated successfully!',
      data: {
        wallet_address: updated.wallet_address,
        foto_profile: updated.foto_profile,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
