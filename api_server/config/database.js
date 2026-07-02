// ============================================================
// Database Configuration — MySQL2 Connection Pool
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'luxchain',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Enable named placeholders for cleaner queries
  namedPlaceholders: true,
});

// Test connection on startup
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    return false;
  }
}

module.exports = { pool, testConnection };
