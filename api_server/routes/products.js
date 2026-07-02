// ============================================================
// Product Routes — CRUD + Minting
// ============================================================
// GET    /api/products          — List all products
// POST   /api/products          — Create product master
// GET    /api/products/:id      — Get product detail
// PUT    /api/products/:id      — Update product
// DELETE /api/products/:id      — Delete product
// POST   /api/products/:id/mint — Mint product item to blockchain
// ============================================================

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { generateMetadataHash } = require('../utils/hash');
const { generateQRCode } = require('../utils/qrcode');
const { getContract, isBlockchainConnected } = require('../config/blockchain');
const crypto = require('crypto');

// ===== Secret Code Generator (Scratch Card) =====
function generateSecretCode() {
  // Generate 12-char alphanumeric code: e.g. "A3X9K2M8P5W7"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ===== Helper to check if admin wallet is authorized for minting =====
async function checkAdminWalletAuthorization(id_admin) {
  const [adminRows] = await pool.execute(
    'SELECT wallet_address FROM admin WHERE id_admin = ?',
    [id_admin]
  );
  
  if (adminRows.length === 0) {
    const err = new Error('Admin tidak ditemukan.');
    err.status = 404;
    throw err;
  }
  
  const walletAddress = adminRows[0].wallet_address;
  if (!walletAddress || walletAddress === '0x0000000000000000000000000000000000000000') {
    const err = new Error('Akses ditolak: Anda harus menghubungkan wallet MetaMask terlebih dahulu di dashboard untuk melakukan minting.');
    err.status = 400;
    throw err;
  }

  // If blockchain is online, check if wallet is an authorized admin on-chain
  if (isBlockchainConnected()) {
    let isRegAdmin = false;
    try {
      const contract = getContract();
      isRegAdmin = await contract.isAdmin(walletAddress);
    } catch (contractErr) {
      console.error('⚠️ Failed to check admin authorization on smart contract:', contractErr.message);
      // Fallback: if network/RPC issue occurs, trust DB to prevent locking out minting
      isRegAdmin = true;
    }

    if (!isRegAdmin) {
      const err = new Error(`Akses ditolak: Alamat wallet admin Anda (${walletAddress}) belum terdaftar sebagai Admin di Smart Contract. Hubungi Contract Owner untuk mendaftarkan wallet Anda.`);
      err.status = 403;
      throw err;
    }
  }
  
  return walletAddress;
}

// ===== Multer config for product images =====
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

/**
 * GET /api/products
 * List all products with their items count
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search, kategori, sub_kategori, min_harga, max_harga, warna, status, page = 1, limit = 20 } = req.query;
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const offset = (parsedPage - 1) * parsedLimit;

    // Base clauses
    const selectClause = `
      SELECT
        pm.*,
        sk.nama_sub_kategori,
        k.nama_kategori,
        a.email as admin_email,
        COUNT(pi.id_item) as total_items,
        SUM(CASE WHEN pi.status = 'minted' THEN 1 ELSE 0 END) as minted_items,
        SUM(CASE WHEN pi.status = 'sold' THEN 1 ELSE 0 END) as sold_items
    `;

    const fromClause = `
      FROM produk_master pm
      LEFT JOIN sub_kategori sk ON pm.id_sub_kategori = sk.id_sub_kategori
      LEFT JOIN kategori k ON sk.id_kategori = k.id_kategori
      LEFT JOIN admin a ON pm.id_admin = a.id_admin
      LEFT JOIN product_item pi ON pm.id_produk = pi.id_produk
    `;

    const params = [];
    const conditions = [];

    // ─── Search (Across all columns) ───
    if (search) {
      conditions.push(`(
        pm.id_produk LIKE ? OR
        pm.nama_produk LIKE ? OR
        pm.tipe_artikel LIKE ? OR
        pm.warna LIKE ? OR
        pm.harga LIKE ? OR
        k.nama_kategori LIKE ? OR
        sk.nama_sub_kategori LIKE ? OR
        a.email LIKE ?
      )`);
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s, s);
    }

    // ─── Filters ───
    if (kategori) {
      conditions.push('k.id_kategori = ?');
      params.push(parseInt(kategori));
    }
    if (sub_kategori) {
      conditions.push('sk.id_sub_kategori = ?');
      params.push(parseInt(sub_kategori));
    }
    if (min_harga) {
      conditions.push('pm.harga >= ?');
      params.push(parseFloat(min_harga));
    }
    if (max_harga) {
      conditions.push('pm.harga <= ?');
      params.push(parseFloat(max_harga));
    }
    if (warna) {
      conditions.push('pm.warna = ?');
      params.push(warna);
    }

    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    // ─── HAVING for status ───
    let havingClause = '';
    if (status) {
      if (status === 'sold') {
        havingClause = ' HAVING SUM(CASE WHEN pi.status = "sold" THEN 1 ELSE 0 END) > 0';
      } else if (status === 'minted') {
        havingClause = ' HAVING SUM(CASE WHEN pi.status = "minted" THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN pi.status = "sold" THEN 1 ELSE 0 END) = 0';
      } else if (status === 'pending') {
        havingClause = ' HAVING SUM(CASE WHEN pi.status = "sold" THEN 1 ELSE 0 END) = 0 AND SUM(CASE WHEN pi.status = "minted" THEN 1 ELSE 0 END) = 0';
      }
    }

    // ─── Full Queries ───
    const mainQuery = selectClause + fromClause + whereClause + ' GROUP BY pm.id_produk ' + havingClause + ' ORDER BY pm.id_produk DESC LIMIT ? OFFSET ?';
    
    let countQuery;
    let countParams;

    if (havingClause) {
      countQuery = `SELECT COUNT(*) as total FROM (SELECT pm.id_produk ${fromClause} ${whereClause} GROUP BY pm.id_produk ${havingClause}) as temp`;
      countParams = [...params];
    } else {
      countQuery = `SELECT COUNT(DISTINCT pm.id_produk) as total ${fromClause} ${whereClause}`;
      countParams = [...params];
    }

    const [rows] = await pool.query(mainQuery, [...params, parsedLimit, offset]);
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
 * GET /api/products/:id
 * Get product detail with all items
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get product master
    const [products] = await pool.execute(
      `SELECT pm.*, sk.nama_sub_kategori, k.nama_kategori, a.email as admin_email
       FROM produk_master pm
       LEFT JOIN sub_kategori sk ON pm.id_sub_kategori = sk.id_sub_kategori
       LEFT JOIN kategori k ON sk.id_kategori = k.id_kategori
       LEFT JOIN admin a ON pm.id_admin = a.id_admin
       WHERE pm.id_produk = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Get all items for this product
    const [items] = await pool.execute(
      'SELECT * FROM product_item WHERE id_produk = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...products[0],
        items,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products
 * Create a new product master + auto-generate items + auto-mint to blockchain
 *
 * Flow (satu langkah):
 * 1. Simpan ProdukMaster ke MySQL
 * 2. Generate UUID + SHA-256 hash + QR Code + Secret Code untuk setiap item
 * 3. Otomatis mint ke Smart Contract (jika blockchain connected)
 * 4. Simpan txHash + update status ke 'minted' di MySQL
 *
 * Body (multipart/form-data): { nama_kategori, nama_sub_kategori, nama_produk, harga, warna, tipe_artikel, tanggal_produksi, quantity?, gambar? }
 */
router.post('/', authMiddleware, upload.single('gambar'), async (req, res, next) => {
  console.log("POST /api/products received!");
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);
  try {
    // ─── Verify admin wallet & smart contract authorization ───
    await checkAdminWalletAuthorization(req.admin.id_admin);

    const {
      nama_kategori,
      nama_sub_kategori,
      nama_produk,
      harga,
      warna,
      tipe_artikel,
      tanggal_produksi,
      quantity = 1,
    } = req.body;

    // Validate required fields (7 inputan)
    if (!nama_produk || !harga || !tipe_artikel || !nama_kategori || !nama_sub_kategori) {
      return res.status(400).json({
        success: false,
        message: 'nama_produk, harga, tipe_artikel, nama_kategori, and nama_sub_kategori are required.',
      });
    }

    // Handle uploaded image
    const gambar_url = req.file ? `/uploads/products/${req.file.filename}` : null;

    // Resolve or create Kategori
    let [kategoriRows] = await pool.execute(
      'SELECT id_kategori FROM kategori WHERE nama_kategori = ?',
      [nama_kategori]
    );
    let id_kategori;
    if (kategoriRows.length > 0) {
      id_kategori = kategoriRows[0].id_kategori;
    } else {
      const [insertK] = await pool.execute(
        'INSERT INTO kategori (nama_kategori) VALUES (?)',
        [nama_kategori]
      );
      id_kategori = insertK.insertId;
    }

    // Resolve or create SubKategori
    let [subRows] = await pool.execute(
      'SELECT id_sub_kategori FROM sub_kategori WHERE nama_sub_kategori = ? AND id_kategori = ?',
      [nama_sub_kategori, id_kategori]
    );
    let id_sub_kategori;
    if (subRows.length > 0) {
      id_sub_kategori = subRows[0].id_sub_kategori;
    } else {
      const [insertSK] = await pool.execute(
        'INSERT INTO sub_kategori (id_kategori, nama_sub_kategori) VALUES (?, ?)',
        [id_kategori, nama_sub_kategori]
      );
      id_sub_kategori = insertSK.insertId;
    }

    // Create ProdukMaster with gambar_url
    const [result] = await pool.execute(
      `INSERT INTO produk_master
        (id_sub_kategori, id_admin, nama_produk, harga, warna, tipe_artikel, tanggal_produksi, gambar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_sub_kategori,
        req.admin.id_admin,
        nama_produk,
        harga,
        warna || null,
        tipe_artikel,
        tanggal_produksi || new Date().toISOString().split('T')[0],
        gambar_url,
      ]
    );

    const id_produk = result.insertId;
    const parsedQty = Math.min(Math.max(parseInt(quantity) || 1, 1), 100); // minimum 1, cap at 100

    // ─── Auto-generate items + auto-mint to blockchain ───
    const items = [];
    const blockchainOnline = isBlockchainConnected();
    let mintedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < parsedQty; i++) {
      const itemUuid = uuidv4();
      const metadataHash = generateMetadataHash({
        uuid: itemUuid,
        nama_produk,
        harga: String(harga),
        warna: warna || '',
        tipe_artikel,
        tanggal_produksi: String(tanggal_produksi || new Date().toISOString().split('T')[0]),
      });

      const secretCode = generateSecretCode();
      const qrResult = await generateQRCode(itemUuid, secretCode);

      // Insert item as 'pending' first
      await pool.execute(
        `INSERT INTO product_item (id_item, id_produk, hash_blockchain, secret_code, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [itemUuid, id_produk, metadataHash, secretCode]
      );

      let txHash = null;
      let tokenId = null;
      let itemStatus = 'pending';

      // ⛓️ Auto-mint to blockchain
      if (blockchainOnline) {
        try {
          const contract = getContract();
          const tx = await contract.mintToBlockchain(itemUuid, metadataHash);
          const receipt = await tx.wait();
          txHash = receipt.hash;

          // Extract tokenId from ProductMinted event
          const mintEvent = receipt.logs.find(log => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed && parsed.name === 'ProductMinted';
            } catch { return false; }
          });

          if (mintEvent) {
            const parsed = contract.interface.parseLog(mintEvent);
            tokenId = parsed.args.tokenId.toString();
          }

          // Update item status to 'minted' and save tx_hash
          await pool.execute(
            "UPDATE product_item SET status = 'minted', tx_hash = ? WHERE id_item = ?",
            [txHash, itemUuid]
          );
          itemStatus = 'minted';
          mintedCount++;

          // Log to system_log
          await pool.execute(
            `INSERT INTO system_log (action, detail, created_at) VALUES ('MINT', ?, NOW())`,
            [JSON.stringify({
              id_item: itemUuid,
              id_produk,
              tx_hash: txHash,
              token_id: tokenId,
              admin: req.admin.email,
            })]
          ).catch(() => { /* system_log table may not exist yet */ });

        } catch (blockchainError) {
          // Blockchain failed for this item — keep as pending, continue with next
          console.error(`⚠️  Mint failed for item ${i + 1}/${parsedQty}:`, blockchainError.message);
          failedCount++;
        }
      } else {
        // No blockchain — mark as minted for development
        await pool.execute(
          "UPDATE product_item SET status = 'minted' WHERE id_item = ?",
          [itemUuid]
        );
        itemStatus = 'minted';
        mintedCount++;
      }

      items.push({
        id_item: itemUuid,
        hash_blockchain: metadataHash,
        secret_code: secretCode,
        status: itemStatus,
        tx_hash: txHash,
        token_id: tokenId,
        qr_code: qrResult.publicUrl,
        qr_data_url: qrResult.dataUrl,
      });
    }

    // Build status message
    let message;
    if (!blockchainOnline) {
      message = `Product created + ${mintedCount} item(s) minted (offline mode).`;
    } else if (failedCount === 0) {
      message = `Product created + ${mintedCount} item(s) minted to blockchain! ⛓️`;
    } else {
      message = `Product created. ${mintedCount} item(s) minted, ${failedCount} failed (can retry via /mint).`;
    }

    res.status(201).json({
      success: true,
      message,
      data: {
        id_produk,
        nama_produk,
        harga,
        warna,
        tipe_artikel,
        tanggal_produksi,
        nama_kategori,
        nama_sub_kategori,
        gambar_url,
        total_items: parsedQty,
        minted_items: mintedCount,
        failed_items: failedCount,
        blockchain_mode: blockchainOnline ? 'online' : 'offline',
        items,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id
 * Update product master
 */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      id_sub_kategori,
      nama_produk,
      harga,
      warna,
      tipe_artikel,
      tanggal_produksi,
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE produk_master SET
        id_sub_kategori = COALESCE(?, id_sub_kategori),
        nama_produk = COALESCE(?, nama_produk),
        harga = COALESCE(?, harga),
        warna = COALESCE(?, warna),
        tipe_artikel = COALESCE(?, tipe_artikel),
        tanggal_produksi = COALESCE(?, tanggal_produksi)
       WHERE id_produk = ?`,
      [id_sub_kategori, nama_produk, harga, warna, tipe_artikel, tanggal_produksi, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/products/:id
 * Delete product master (only if no minted items)
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const onlyPending = req.query.onlyPending === 'true';

    if (onlyPending) {
      // Delete only pending items
      const [result] = await pool.execute(
        "DELETE FROM product_item WHERE id_produk = ? AND status = 'pending'",
        [id]
      );

      return res.json({
        success: true,
        message: `${result.affectedRows} pending items deleted successfully.`,
      });
    }

    // Check if product has minted items
    const [items] = await pool.execute(
      "SELECT COUNT(*) as count FROM product_item WHERE id_produk = ? AND status != 'pending'",
      [id]
    );

    if (items[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with minted items.',
      });
    }

    // Delete pending items first
    await pool.execute('DELETE FROM product_item WHERE id_produk = ?', [id]);

    // Delete product
    const [result] = await pool.execute(
      'DELETE FROM produk_master WHERE id_produk = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products/:id/mint
 * ⛓️ Retry minting pending items OR add a new item + mint
 *
 * Use cases:
 * - Retry minting for items that failed during product creation
 * - Add additional physical items to an existing product
 *
 * Body (optional): { quantity: 1 } — to add new items. If omitted, retries all pending items.
 */
router.post('/:id/mint', authMiddleware, async (req, res, next) => {
  try {
    // ─── Verify admin wallet & smart contract authorization ───
    await checkAdminWalletAuthorization(req.admin.id_admin);

    const { id } = req.params;
    const { quantity } = req.body;

    // 1. Get product master data
    const [products] = await pool.execute(
      'SELECT * FROM produk_master WHERE id_produk = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const product = products[0];
    const blockchainOnline = isBlockchainConnected();
    const results = [];
    let mintedCount = 0;
    let failedCount = 0;

    // ─── Mode A: Retry pending items ───
    if (!quantity) {
      const [pendingItems] = await pool.execute(
        "SELECT * FROM product_item WHERE id_produk = ? AND status = 'pending'",
        [id]
      );

      if (pendingItems.length === 0) {
        return res.json({
          success: true,
          message: 'No pending items to mint.',
          data: { minted: 0, failed: 0 },
        });
      }

      for (const item of pendingItems) {
        let txHash = null;
        let tokenId = null;

        if (blockchainOnline) {
          try {
            const contract = getContract();
            const tx = await contract.mintToBlockchain(item.id_item, item.hash_blockchain);
            const receipt = await tx.wait();
            txHash = receipt.hash;

            const mintEvent = receipt.logs.find(log => {
              try {
                const parsed = contract.interface.parseLog(log);
                return parsed && parsed.name === 'ProductMinted';
              } catch { return false; }
            });
            if (mintEvent) {
              const parsed = contract.interface.parseLog(mintEvent);
              tokenId = parsed.args.tokenId.toString();
            }

            await pool.execute("UPDATE product_item SET status = 'minted', tx_hash = ? WHERE id_item = ?", [txHash, item.id_item]);
            mintedCount++;

            await pool.execute(
              `INSERT INTO system_log (action, detail, created_at) VALUES ('MINT_RETRY', ?, NOW())`,
              [JSON.stringify({ id_item: item.id_item, id_produk: id, tx_hash: txHash, token_id: tokenId, admin: req.admin.email })]
            ).catch(() => {});
          } catch (err) {
            console.error(`⚠️  Retry mint failed for ${item.id_item}:`, err.message);
            failedCount++;
          }
        } else {
          await pool.execute("UPDATE product_item SET status = 'minted' WHERE id_item = ?", [item.id_item]);
          mintedCount++;
        }

        results.push({ id_item: item.id_item, tx_hash: txHash, token_id: tokenId, status: txHash || !blockchainOnline ? 'minted' : 'pending' });
      }

      return res.json({
        success: true,
        message: `Retry complete: ${mintedCount} minted, ${failedCount} failed.`,
        data: { minted: mintedCount, failed: failedCount, items: results },
      });
    }

    // ─── Mode B: Add new items + auto-mint ───
    const parsedQty = Math.min(Math.max(parseInt(quantity) || 1, 1), 100);

    for (let i = 0; i < parsedQty; i++) {
      const itemUuid = uuidv4();
      const metadataHash = generateMetadataHash({
        uuid: itemUuid,
        nama_produk: product.nama_produk,
        harga: String(product.harga),
        warna: product.warna || '',
        tipe_artikel: product.tipe_artikel,
        tanggal_produksi: String(product.tanggal_produksi),
      });

      const secretCode = generateSecretCode();
      const qrResult = await generateQRCode(itemUuid, secretCode);

      await pool.execute(
        `INSERT INTO product_item (id_item, id_produk, hash_blockchain, secret_code, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [itemUuid, id, metadataHash, secretCode]
      );

      let txHash = null;
      let tokenId = null;
      let itemStatus = 'pending';

      if (blockchainOnline) {
        try {
          const contract = getContract();
          const tx = await contract.mintToBlockchain(itemUuid, metadataHash);
          const receipt = await tx.wait();
          txHash = receipt.hash;

          const mintEvent = receipt.logs.find(log => {
            try {
              const parsed = contract.interface.parseLog(log);
              return parsed && parsed.name === 'ProductMinted';
            } catch { return false; }
          });
          if (mintEvent) {
            const parsed = contract.interface.parseLog(mintEvent);
            tokenId = parsed.args.tokenId.toString();
          }

          await pool.execute("UPDATE product_item SET status = 'minted', tx_hash = ? WHERE id_item = ?", [txHash, itemUuid]);
          itemStatus = 'minted';
          mintedCount++;

          await pool.execute(
            `INSERT INTO system_log (action, detail, created_at) VALUES ('MINT', ?, NOW())`,
            [JSON.stringify({ id_item: itemUuid, id_produk: id, tx_hash: txHash, token_id: tokenId, admin: req.admin.email })]
          ).catch(() => {});
        } catch (err) {
          console.error(`⚠️  Mint failed for new item ${i + 1}/${parsedQty}:`, err.message);
          failedCount++;
        }
      } else {
        await pool.execute("UPDATE product_item SET status = 'minted' WHERE id_item = ?", [itemUuid]);
        itemStatus = 'minted';
        mintedCount++;
      }

      results.push({
        id_item: itemUuid,
        hash_blockchain: metadataHash,
        secret_code: secretCode,
        status: itemStatus,
        tx_hash: txHash,
        token_id: tokenId,
        qr_code: qrResult.publicUrl,
        qr_data_url: qrResult.dataUrl,
      });
    }

    res.status(201).json({
      success: true,
      message: `${mintedCount} new item(s) added + minted. ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
      data: {
        id_produk: parseInt(id),
        minted: mintedCount,
        failed: failedCount,
        items: results,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

