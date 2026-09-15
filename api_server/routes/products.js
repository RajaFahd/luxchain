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
const { prisma } = require('../config/prisma');
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
  const admin = await prisma.admin.findUnique({
    where: { id_admin },
    select: { wallet_address: true },
  });
  
  if (!admin) {
    const err = new Error('Admin tidak ditemukan.');
    err.status = 404;
    throw err;
  }
  
  const walletAddress = admin.wallet_address;
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

// ===== Multer & Supabase Storage config for product images =====
const { upload, uploadImageToSupabase } = require('../config/storage');

/**
 * GET /api/products
 * List all products with their items count
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { search, kategori, sub_kategori, min_harga, max_harga, warna, status, page = 1, limit = 20 } = req.query;
    
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build Prisma where conditions
    const where = {};

    if (kategori) {
      where.sub_kategori = {
        id_kategori: parseInt(kategori),
      };
    }

    if (sub_kategori) {
      where.id_sub_kategori = parseInt(sub_kategori);
    }

    if (min_harga || max_harga) {
      where.harga = {};
      if (min_harga) where.harga.gte = parseFloat(min_harga);
      if (max_harga) where.harga.lte = parseFloat(max_harga);
    }

    if (warna) {
      where.warna = warna;
    }

    if (search) {
      where.OR = [
        { nama_produk: { contains: search, mode: 'insensitive' } },
        { tipe_artikel: { contains: search, mode: 'insensitive' } },
        { warna: { contains: search, mode: 'insensitive' } },
        {
          sub_kategori: {
            OR: [
              { nama_sub_kategori: { contains: search, mode: 'insensitive' } },
              { kategori: { nama_kategori: { contains: search, mode: 'insensitive' } } },
            ],
          },
        },
        { admin: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch products matching basic criteria
    const products = await prisma.produkMaster.findMany({
      where,
      include: {
        sub_kategori: {
          include: {
            kategori: true,
          },
        },
        admin: {
          select: {
            email: true,
          },
        },
        product_items: true,
      },
      orderBy: {
        id_produk: 'desc',
      },
    });

    // Format & aggregate item counts
    let formatted = products.map(pm => {
      const items = pm.product_items || [];
      const totalItems = items.length;
      const waitingNfcItems = items.filter(i => i.status === 'waiting_nfc').length;
      const mintedItems = items.filter(i => i.status === 'minted').length;
      const soldItems = items.filter(i => i.status === 'sold').length;

      return {
        id_produk: pm.id_produk,
        id_sub_kategori: pm.id_sub_kategori,
        id_admin: pm.id_admin,
        nama_produk: pm.nama_produk,
        harga: pm.harga,
        warna: pm.warna,
        tipe_artikel: pm.tipe_artikel,
        tanggal_produksi: pm.tanggal_produksi,
        gambar_url: pm.gambar_url,
        nama_sub_kategori: pm.sub_kategori?.nama_sub_kategori || '',
        nama_kategori: pm.sub_kategori?.kategori?.nama_kategori || '',
        admin_email: pm.admin?.email || '',
        total_items: totalItems,
        waiting_nfc_items: waitingNfcItems,
        minted_items: mintedItems,
        sold_items: soldItems,
      };
    });

    // Filter by product status if requested
    if (status) {
      if (status === 'sold') {
        formatted = formatted.filter(p => p.sold_items > 0);
      } else if (status === 'minted') {
        formatted = formatted.filter(p => p.minted_items > 0 && p.sold_items === 0);
      } else if (status === 'waiting_nfc') {
        formatted = formatted.filter(p => p.waiting_nfc_items > 0);
      } else if (status === 'pending') {
        formatted = formatted.filter(p => p.sold_items === 0 && p.minted_items === 0 && p.waiting_nfc_items === 0);
      }
    }

    const total = formatted.length;
    const paginated = formatted.slice(skip, skip + parsedLimit);

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
 * GET /api/products/:id
 * Get product detail with all items
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    const product = await prisma.produkMaster.findUnique({
      where: { id_produk: id },
      include: {
        sub_kategori: {
          include: {
            kategori: true,
          },
        },
        admin: {
          select: { email: true },
        },
        product_items: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.json({
      success: true,
      data: {
        ...product,
        nama_sub_kategori: product.sub_kategori?.nama_sub_kategori || '',
        nama_kategori: product.sub_kategori?.kategori?.nama_kategori || '',
        admin_email: product.admin?.email || '',
        items: product.product_items,
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

    // Handle uploaded image (upload to Supabase Storage 'foto_produk' as WebP)
    let gambar_url = null;
    if (req.file) {
      gambar_url = await uploadImageToSupabase(req.file.buffer, 'foto_produk', 'product');
    }

    // Resolve or create Kategori
    let kategori = await prisma.kategori.findFirst({
      where: { nama_kategori: nama_kategori.trim() },
    });
    if (!kategori) {
      kategori = await prisma.kategori.create({
        data: { nama_kategori: nama_kategori.trim() },
      });
    }

    // Resolve or create SubKategori
    let subKategori = await prisma.subKategori.findFirst({
      where: {
        nama_sub_kategori: nama_sub_kategori.trim(),
        id_kategori: kategori.id_kategori,
      },
    });
    if (!subKategori) {
      subKategori = await prisma.subKategori.create({
        data: {
          id_kategori: kategori.id_kategori,
          nama_sub_kategori: nama_sub_kategori.trim(),
        },
      });
    }

    // Parse date safely
    const prodDateStr = tanggal_produksi || new Date().toISOString().split('T')[0];
    const prodDate = new Date(prodDateStr);

    // Create ProdukMaster with gambar_url
    const productMaster = await prisma.produkMaster.create({
      data: {
        id_sub_kategori: subKategori.id_sub_kategori,
        id_admin: req.admin.id_admin,
        nama_produk: nama_produk.trim(),
        harga: parseFloat(harga),
        warna: warna ? warna.trim() : null,
        tipe_artikel: tipe_artikel.trim(),
        tanggal_produksi: prodDate,
        gambar_url,
      },
    });

    const id_produk = productMaster.id_produk;
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
        tanggal_produksi: prodDateStr,
      });

      const secretCode = generateSecretCode();
      const qrResult = await generateQRCode(itemUuid, secretCode);

      // Insert item as 'pending' first
      await prisma.productItem.create({
        data: {
          id_item: itemUuid,
          id_produk,
          hash_blockchain: metadataHash,
          secret_code: secretCode,
          status: 'pending',
        },
      });

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

          // Update item status to 'waiting_nfc' (ready for NFC chip binding) and save tx_hash
          await prisma.productItem.update({
            where: { id_item: itemUuid },
            data: {
              status: 'waiting_nfc',
              tx_hash: txHash,
            },
          });
          itemStatus = 'waiting_nfc';
          mintedCount++;

          // Log to system_log
          await prisma.systemLog.create({
            data: {
              action: 'MINT',
              detail: {
                id_item: itemUuid,
                id_produk,
                tx_hash: txHash,
                token_id: tokenId,
                status: 'waiting_nfc',
                admin: req.admin.email,
              },
            },
          }).catch(() => {});

        } catch (blockchainError) {
          // Blockchain failed for this item — keep as pending, continue with next
          console.error(`⚠️  Mint failed for item ${i + 1}/${parsedQty}:`, blockchainError.message);
          failedCount++;
        }
      } else {
        // No blockchain — mark as waiting_nfc for local development & NFC workflow
        await prisma.productItem.update({
          where: { id_item: itemUuid },
          data: { status: 'waiting_nfc' },
        });
        itemStatus = 'waiting_nfc';
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
      message = `Produk berhasil dibuat + ${mintedCount} unit siap di-tap ke cip NFC (mode offline).`;
    } else if (failedCount === 0) {
      message = `Produk berhasil dibuat + ${mintedCount} unit di-mint ke blockchain Sepolia & masuk antrean NFC! ⛓️🏷️`;
    } else {
      message = `Produk dibuat. ${mintedCount} unit di-mint (antrean NFC), ${failedCount} gagal (dapat di-retry via /mint).`;
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
        waiting_nfc_items: mintedCount,
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
    const id = parseInt(req.params.id);
    const {
      id_sub_kategori,
      nama_produk,
      harga,
      warna,
      tipe_artikel,
      tanggal_produksi,
    } = req.body;

    const data = {};
    if (id_sub_kategori !== undefined) data.id_sub_kategori = parseInt(id_sub_kategori);
    if (nama_produk !== undefined) data.nama_produk = nama_produk;
    if (harga !== undefined) data.harga = parseFloat(harga);
    if (warna !== undefined) data.warna = warna;
    if (tipe_artikel !== undefined) data.tipe_artikel = tipe_artikel;
    if (tanggal_produksi !== undefined) data.tanggal_produksi = new Date(tanggal_produksi);

    const updated = await prisma.produkMaster.update({
      where: { id_produk: id },
      data,
    });

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: updated,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/products/:id
 * Delete product master (only if no minted items)
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const onlyPending = req.query.onlyPending === 'true';

    if (onlyPending) {
      // Delete only pending items
      const result = await prisma.productItem.deleteMany({
        where: {
          id_produk: id,
          status: 'pending',
        },
      });

      return res.json({
        success: true,
        message: `${result.count} pending items deleted successfully.`,
      });
    }

    // Check if product has minted items
    const nonPendingCount = await prisma.productItem.count({
      where: {
        id_produk: id,
        status: { not: 'pending' },
      },
    });

    if (nonPendingCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with minted items.',
      });
    }

    // Delete pending items first
    await prisma.productItem.deleteMany({
      where: { id_produk: id },
    });

    // Delete product
    await prisma.produkMaster.delete({
      where: { id_produk: id },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }
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

    const id = parseInt(req.params.id);
    const { quantity } = req.body;

    // 1. Get product master data
    const product = await prisma.produkMaster.findUnique({
      where: { id_produk: id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const blockchainOnline = isBlockchainConnected();
    const results = [];
    let mintedCount = 0;
    let failedCount = 0;

    // ─── Mode A: Retry pending items ───
    if (!quantity) {
      const pendingItems = await prisma.productItem.findMany({
        where: {
          id_produk: id,
          status: 'pending',
        },
      });

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

            await prisma.productItem.update({
              where: { id_item: item.id_item },
              data: {
                status: 'waiting_nfc',
                tx_hash: txHash,
              },
            });
            mintedCount++;

            await prisma.systemLog.create({
              data: {
                action: 'MINT_RETRY',
                detail: {
                  id_item: item.id_item,
                  id_produk: id,
                  tx_hash: txHash,
                  token_id: tokenId,
                  status: 'waiting_nfc',
                  admin: req.admin.email,
                },
              },
            }).catch(() => {});
          } catch (err) {
            console.error(`⚠️  Retry mint failed for ${item.id_item}:`, err.message);
            failedCount++;
          }
        } else {
          await prisma.productItem.update({
            where: { id_item: item.id_item },
            data: { status: 'waiting_nfc' },
          });
          mintedCount++;
        }

        results.push({ id_item: item.id_item, tx_hash: txHash, token_id: tokenId, status: txHash || !blockchainOnline ? 'waiting_nfc' : 'pending' });
      }

      return res.json({
        success: true,
        message: `Retry complete: ${mintedCount} unit siap diikat ke NFC (waiting_nfc), ${failedCount} gagal.`,
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

      await prisma.productItem.create({
        data: {
          id_item: itemUuid,
          id_produk: id,
          hash_blockchain: metadataHash,
          secret_code: secretCode,
          status: 'pending',
        },
      });

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

          await prisma.productItem.update({
            where: { id_item: itemUuid },
            data: {
              status: 'waiting_nfc',
              tx_hash: txHash,
            },
          });
          itemStatus = 'waiting_nfc';
          mintedCount++;

          await prisma.systemLog.create({
            data: {
              action: 'MINT',
              detail: {
                id_item: itemUuid,
                id_produk: id,
                tx_hash: txHash,
                token_id: tokenId,
                status: 'waiting_nfc',
                admin: req.admin.email,
              },
            },
          }).catch(() => {});
        } catch (err) {
          console.error(`⚠️  Mint failed for new item ${i + 1}/${parsedQty}:`, err.message);
          failedCount++;
        }
      } else {
        await prisma.productItem.update({
          where: { id_item: itemUuid },
          data: { status: 'waiting_nfc' },
        });
        itemStatus = 'waiting_nfc';
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
        id_produk: id,
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

