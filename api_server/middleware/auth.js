// ============================================================
// JWT Authentication Middleware
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'luxchain_dev_secret';

/**
 * Middleware: Verify JWT token from Authorization header
 * Usage: router.get('/protected', authMiddleware, handler)
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; // { id_admin, email, wallet_address }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

/**
 * Generate JWT token for admin
 * @param {Object} admin - Admin object { id_admin, email, wallet_address }
 * @returns {string} JWT token
 */
function generateToken(admin) {
  return jwt.sign(
    {
      id_admin: admin.id_admin,
      email: admin.email,
      wallet_address: admin.wallet_address,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

module.exports = { authMiddleware, generateToken };
