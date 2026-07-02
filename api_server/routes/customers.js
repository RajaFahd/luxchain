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
const { pool } = require('../config/database');

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

// ===== Multer config for consumer profile photos =====
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    if (file.mimetype.startsWith('image/') || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

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

    let query = `
      SELECT
        k.wallet_address,
        k.nama_display,
        k.foto_profile,
        k.join_date,
        (SELECT COUNT(*) FROM kepemilikan WHERE wallet_address = k.wallet_address AND status_kepemilikan = 'active') as active_items,
        (SELECT COUNT(*) FROM kepemilikan WHERE wallet_address = k.wallet_address) as total_transactions
       FROM konsumen k
    `;

    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(k.wallet_address LIKE ? OR k.nama_display LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const havingConditions = [];
    if (min_assets) {
      havingConditions.push('active_items >= ?');
      params.push(parseInt(min_assets));
    }
    if (min_tx) {
      havingConditions.push('total_transactions >= ?');
      params.push(parseInt(min_tx));
    }

    if (havingConditions.length > 0) {
      query += ' HAVING ' + havingConditions.join(' AND ');
    }

    if (sort_by === 'assets_desc') {
      query += ' ORDER BY active_items DESC';
    } else if (sort_by === 'assets_asc') {
      query += ' ORDER BY active_items ASC';
    } else if (sort_by === 'tx_desc') {
      query += ' ORDER BY total_transactions DESC';
    } else if (sort_by === 'tx_asc') {
      query += ' ORDER BY total_transactions ASC';
    } else {
      query += ' ORDER BY k.join_date DESC';
    }

    // Clone params for count query
    const countParams = [...params];

    let countQuery;
    if (havingConditions.length > 0) {
      countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT
            k.wallet_address,
            (SELECT COUNT(*) FROM kepemilikan WHERE wallet_address = k.wallet_address AND status_kepemilikan = 'active') as active_items,
            (SELECT COUNT(*) FROM kepemilikan WHERE wallet_address = k.wallet_address) as total_transactions
          FROM konsumen k
          ${conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''}
          HAVING ${havingConditions.join(' AND ')}
        ) as temp
      `;
    } else {
      countQuery = `
        SELECT COUNT(*) as total
        FROM konsumen k
      `;
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }
    }

    query += ' LIMIT ? OFFSET ?';

    const [rows] = await pool.query(query, [...params, parsedLimit, offset]);
    const [countResult] = await pool.query(countQuery, countParams);

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

    // Check if consumer exists
    const [existing] = await pool.execute(
      'SELECT * FROM konsumen WHERE wallet_address = ?',
      [wallet_address]
    );

    if (existing.length === 0) {
      // Create new profile
      await pool.execute(
        'INSERT INTO konsumen (wallet_address, nama_display, join_date) VALUES (?, ?, NOW())',
        [wallet_address, nama_display]
      );
    } else {
      // Update existing profile
      await pool.execute(
        'UPDATE konsumen SET nama_display = ? WHERE wallet_address = ?',
        [nama_display, wallet_address]
      );
    }

    res.json({
      success: true,
      message: 'Display name updated successfully!',
      data: {
        wallet_address,
        nama_display,
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

    const relativePath = `/uploads/profiles/${req.file.filename}`;

    // Check if consumer exists
    const [existing] = await pool.execute(
      'SELECT * FROM konsumen WHERE wallet_address = ?',
      [wallet_address]
    );

    if (existing.length === 0) {
      // Create new profile with picture
      await pool.execute(
        'INSERT INTO konsumen (wallet_address, nama_display, foto_profile, join_date) VALUES (?, ?, ?, NOW())',
        [wallet_address, `User_${wallet_address.substring(0, 8)}`, relativePath]
      );
    } else {
      // Update existing profile picture
      await pool.execute(
        'UPDATE konsumen SET foto_profile = ? WHERE wallet_address = ?',
        [relativePath, wallet_address]
      );
    }

    res.json({
      success: true,
      message: 'Profile photo updated successfully!',
      data: {
        wallet_address,
        foto_profile: relativePath,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
