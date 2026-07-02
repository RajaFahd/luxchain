// ============================================================
// Auth Routes — Admin Login (JWT)
// ============================================================
// POST /api/auth/login
// GET  /api/auth/me
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { authMiddleware, generateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Admin login with email & password → returns JWT token
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find admin by email
    const [rows] = await pool.execute(
      'SELECT * FROM admin WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const admin = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT token
    const token = generateToken(admin);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id_admin: admin.id_admin,
          email: admin.email,
          wallet_address: admin.wallet_address,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated admin info
 */
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id_admin, email, wallet_address FROM admin WHERE id_admin = ?',
      [req.admin.id_admin]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.',
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * Register a new admin (for initial setup only)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, wallet_address } = req.body;

    if (!email || !password || !wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and wallet_address are required.',
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert admin
    const [result] = await pool.execute(
      'INSERT INTO admin (email, password, wallet_address) VALUES (?, ?, ?)',
      [email, hashedPassword, wallet_address]
    );

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      data: {
        id_admin: result.insertId,
        email,
        wallet_address,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/wallet
 * Update admin's wallet address (after MetaMask connect)
 */
router.put('/wallet', authMiddleware, async (req, res, next) => {
  try {
    const { wallet_address, signature } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'wallet_address is required.',
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    // Cryptographic signature verification for security
    if (wallet_address !== '0x0000000000000000000000000000000000000000') {
      if (!signature) {
        return res.status(400).json({
          success: false,
          message: 'Signature is required to verify wallet ownership.',
        });
      }

      // Reconstruct the exact message that was signed in the frontend
      const expectedMessage = `Luxchain Admin Wallet Verification: ${wallet_address}`;
      
      // Recover signer address using ethers
      const { ethers } = require('ethers');
      const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);
      
      if (recoveredAddress.toLowerCase() !== wallet_address.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Verifikasi kriptografis gagal: Tanda tangan tidak cocok dengan alamat wallet yang dikoneksikan.',
        });
      }
    }

    await pool.execute(
      'UPDATE admin SET wallet_address = ? WHERE id_admin = ?',
      [wallet_address, req.admin.id_admin]
    );

    res.json({
      success: true,
      message: 'Wallet address updated successfully.',
      data: { wallet_address },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
