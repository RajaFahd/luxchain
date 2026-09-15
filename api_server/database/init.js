// ============================================================
// Database Initialization Script
// ============================================================
// Run: node database/init.js
// Creates all 7 tables + system_log table if they don't exist
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

const CREATE_TABLES_SQL = `
-- 1. Admin table
CREATE TABLE IF NOT EXISTS admin (
  id_admin INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Kategori table
CREATE TABLE IF NOT EXISTS kategori (
  id_kategori INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- 3. SubKategori table
CREATE TABLE IF NOT EXISTS sub_kategori (
  id_sub_kategori INT AUTO_INCREMENT PRIMARY KEY,
  id_kategori INT NOT NULL,
  nama_sub_kategori VARCHAR(100) NOT NULL,
  FOREIGN KEY (id_kategori) REFERENCES kategori(id_kategori) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. ProdukMaster table (SKU/Design level)
CREATE TABLE IF NOT EXISTS produk_master (
  id_produk INT AUTO_INCREMENT PRIMARY KEY,
  id_sub_kategori INT,
  id_admin INT,
  nama_produk VARCHAR(255) NOT NULL,
  harga DECIMAL(15,2) NOT NULL DEFAULT 0,
  warna VARCHAR(100),
  tipe_artikel VARCHAR(100),
  tanggal_produksi DATE,
  gambar_url VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_sub_kategori) REFERENCES sub_kategori(id_sub_kategori) ON DELETE SET NULL,
  FOREIGN KEY (id_admin) REFERENCES admin(id_admin) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. ProductItem table (Physical unit level)
CREATE TABLE IF NOT EXISTS product_item (
  id_item VARCHAR(36) PRIMARY KEY,
  id_produk INT NOT NULL,
  hash_blockchain VARCHAR(64) NOT NULL,
  tx_hash VARCHAR(66) NULL,
  secret_code VARCHAR(12) NOT NULL,
  uid_fisik VARCHAR(100) NULL,
  status ENUM('pending', 'waiting_nfc', 'minted', 'sold') DEFAULT 'pending',
  is_claimed BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_produk) REFERENCES produk_master(id_produk) ON DELETE CASCADE,
  INDEX idx_uid_fisik (uid_fisik)
) ENGINE=InnoDB;

-- 6. Konsumen table
CREATE TABLE IF NOT EXISTS konsumen (
  wallet_address VARCHAR(42) PRIMARY KEY,
  nama_display VARCHAR(255),
  foto_profile VARCHAR(255) NULL,
  join_date DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Kepemilikan table (Pivot/History)
CREATE TABLE IF NOT EXISTS kepemilikan (
  id_kepemilikan INT AUTO_INCREMENT PRIMARY KEY,
  id_item VARCHAR(36) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  tanggal_klaim DATETIME DEFAULT CURRENT_TIMESTAMP,
  status_kepemilikan ENUM('active', 'transferred') DEFAULT 'active',
  tx_hash VARCHAR(66) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_item) REFERENCES product_item(id_item) ON DELETE CASCADE,
  FOREIGN KEY (wallet_address) REFERENCES konsumen(wallet_address) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. System Log table (for tracking operations)
CREATE TABLE IF NOT EXISTS system_log (
  id_log INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  detail JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
`;

async function initDatabase() {
  console.log('🗄️  Initializing Luxchain database...');
  console.log('─'.repeat(50));

  try {
    // 1. Connect without DB to create it if it doesn't exist
    const rootConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'luxchain';
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Database "${dbName}" checked/created successfully.`);
    await rootConnection.end();

    // 2. Now require pool (which connects to the specific DB)
    const { pool } = require('../config/database');

    // 3. Execute table creation
    // Split by semicolon and execute. We remove empty statements.
    const statements = CREATE_TABLES_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log('✅ All tables created successfully!');
    console.log('');
    console.log('📋 Tables:');
    console.log('   1. admin');
    console.log('   2. kategori');
    console.log('   3. sub_kategori');
    console.log('   4. produk_master');
    console.log('   5. product_item');
    console.log('   6. konsumen');
    console.log('   7. kepemilikan');
    console.log('   8. system_log');
    console.log('');

    // Create default admin if none exists
    const [admins] = await pool.query('SELECT COUNT(*) as count FROM admin');
    if (admins[0].count === 0) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await pool.query(
        'INSERT INTO admin (email, password, wallet_address) VALUES (?, ?, ?)',
        ['admin@luxchain.com', hashedPassword, '0x0000000000000000000000000000000000000000']
      );

      console.log('👤 Default admin created:');
      console.log('   Email:    admin@luxchain.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  Change the password and wallet_address!');
    }

    console.log('');
    console.log('🎉 Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
