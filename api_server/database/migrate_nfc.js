// ============================================================
// Database Migration: Add NFC support to product_item
// ============================================================

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔄 Running NFC migration...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'luxchain',
  });

  try {
    // 1. Check if uid_fisik exists in product_item
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'product_item'`,
      [process.env.DB_NAME || 'luxchain']
    );

    const columnNames = columns.map(c => c.COLUMN_NAME);
    const statusCol = columns.find(c => c.COLUMN_NAME === 'status');

    // 2. Modify status ENUM to include 'waiting_nfc'
    if (statusCol && !statusCol.COLUMN_TYPE.includes('waiting_nfc')) {
      console.log('📌 Updating status ENUM to include waiting_nfc...');
      await pool.query(
        `ALTER TABLE product_item MODIFY COLUMN status ENUM('pending', 'waiting_nfc', 'minted', 'sold') DEFAULT 'pending'`
      );
      console.log('✅ status ENUM updated successfully.');
    } else {
      console.log('ℹ️ status ENUM already includes waiting_nfc.');
    }

    // 3. Add uid_fisik column if not present
    if (!columnNames.includes('uid_fisik')) {
      console.log('📌 Adding uid_fisik column to product_item...');
      await pool.query(
        `ALTER TABLE product_item ADD COLUMN uid_fisik VARCHAR(100) NULL AFTER secret_code`
      );
      await pool.query(
        `ALTER TABLE product_item ADD INDEX idx_uid_fisik (uid_fisik)`
      );
      console.log('✅ uid_fisik column and index added successfully.');
    } else {
      console.log('ℹ️ uid_fisik column already exists.');
    }

    console.log('🎉 NFC migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
