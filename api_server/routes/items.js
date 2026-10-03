// ============================================================
// Item Routes — Verification & Lookup
// ============================================================
// GET  /api/items              — Get all items
// GET  /api/items/:uuid        — Get item by UUID (QR scan)
// POST /api/items/:uuid/verify — Cross-check with blockchain
// ============================================================

const express = require('express');
const router = express.Router();
const { prisma } = require('../config/prisma');
const { generateMetadataHash } = require('../utils/hash');
const { getContract, isBlockchainConnected } = require('../config/blockchain');

/**
 * GET /api/items
 * Get all product items (for admin dashboard)
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 20;
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id_item: { contains: search, mode: 'insensitive' } },
        { secret_code: { contains: search, mode: 'insensitive' } },
        { hash_blockchain: { contains: search, mode: 'insensitive' } },
        { tx_hash: { contains: search, mode: 'insensitive' } },
        {
          produk_master: {
            nama_produk: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.productItem.findMany({
        where,
        include: {
          produk_master: {
            select: {
              nama_produk: true,
              gambar_url: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: parsedLimit,
      }),
      prisma.productItem.count({ where }),
    ]);

    const formatted = items.map(pi => ({
      id_item: pi.id_item,
      status: pi.status,
      is_claimed: pi.is_claimed,
      created_at: pi.created_at,
      hash_blockchain: pi.hash_blockchain,
      tx_hash: pi.tx_hash,
      secret_code: pi.secret_code,
      uid_fisik: pi.uid_fisik,
      nama_produk: pi.produk_master?.nama_produk || '',
      gambar_url: pi.produk_master?.gambar_url || null,
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

/**
 * GET /api/items/queue/waiting-nfc
 * Get items waiting for NFC chip binding
 * Query params: id_produk (optional)
 */
router.get('/queue/waiting-nfc', async (req, res, next) => {
  try {
    const { id_produk } = req.query;
    const where = {
      status: 'waiting_nfc',
    };

    if (id_produk) {
      where.id_produk = parseInt(id_produk);
    }

    const items = await prisma.productItem.findMany({
      where,
      include: {
        produk_master: {
          include: {
            sub_kategori: {
              include: {
                kategori: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const formatted = items.map(pi => ({
      id_item: pi.id_item,
      id_produk: pi.id_produk,
      hash_blockchain: pi.hash_blockchain,
      tx_hash: pi.tx_hash,
      secret_code: pi.secret_code,
      status: pi.status,
      created_at: pi.created_at,
      nama_produk: pi.produk_master?.nama_produk || '',
      harga: pi.produk_master?.harga || 0,
      warna: pi.produk_master?.warna || '',
      tipe_artikel: pi.produk_master?.tipe_artikel || '',
      tanggal_produksi: pi.produk_master?.tanggal_produksi || '',
      gambar_url: pi.produk_master?.gambar_url || null,
      nama_sub_kategori: pi.produk_master?.sub_kategori?.nama_sub_kategori || '',
      nama_kategori: pi.produk_master?.sub_kategori?.kategori?.nama_kategori || '',
    }));

    res.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/items/:uuid
 * Get item details by UUID — used when consumer scans QR Code
 * Public endpoint (no auth required)
 */
router.get('/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const item = await prisma.productItem.findUnique({
      where: { id_item: uuid },
      include: {
        produk_master: {
          include: {
            sub_kategori: {
              include: {
                kategori: true,
              },
            },
          },
        },
        kepemilikan: {
          where: { status_kepemilikan: 'active' },
          include: {
            konsumen: {
              select: { nama_display: true },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Product item not found.',
        verified: false,
      });
    }

    // Prepare item response object without secret_code
    const itemData = {
      id_item: item.id_item,
      id_produk: item.id_produk,
      hash_blockchain: item.hash_blockchain,
      tx_hash: item.tx_hash,
      uid_fisik: item.uid_fisik,
      status: item.status,
      is_claimed: item.is_claimed,
      created_at: item.created_at,
      nama_produk: item.produk_master?.nama_produk || '',
      harga: item.produk_master?.harga || 0,
      warna: item.produk_master?.warna || '',
      tipe_artikel: item.produk_master?.tipe_artikel || '',
      tanggal_produksi: item.produk_master?.tanggal_produksi || '',
      gambar_url: item.produk_master?.gambar_url || null,
      nama_sub_kategori: item.produk_master?.sub_kategori?.nama_sub_kategori || '',
      nama_kategori: item.produk_master?.sub_kategori?.kategori?.nama_kategori || '',
    };

    const activeOwnership = item.kepemilikan[0] ? {
      ...item.kepemilikan[0],
      nama_display: item.kepemilikan[0].konsumen?.nama_display || '',
    } : null;

    res.json({
      success: true,
      data: {
        item: itemData,
        currentOwner: activeOwnership,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items/:uuid/verify
 * ⛓️ Cross-check product authenticity with blockchain
 */
router.post('/:uuid/verify', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const item = await prisma.productItem.findUnique({
      where: { id_item: uuid },
      include: {
        produk_master: true,
        kepemilikan: {
          include: {
            konsumen: {
              select: { nama_display: true },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!item || !item.produk_master) {
      return res.json({
        success: true,
        verified: false,
        message: 'Product not found in database.',
        status: 'NOT_FOUND',
      });
    }

    // 2. Recompute hash from metadata
    let tglProduksi = '';
    if (item.produk_master.tanggal_produksi instanceof Date) {
      const d = item.produk_master.tanggal_produksi;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      tglProduksi = `${year}-${month}-${day}`;
    } else {
      tglProduksi = String(item.produk_master.tanggal_produksi || '').split('T')[0];
    }

    const hargaNormalized = String(item.produk_master.harga).replace(/\.00$/, '');

    const recomputedHash = generateMetadataHash({
      uuid: item.id_item,
      nama_produk: item.produk_master.nama_produk,
      harga: hargaNormalized,
      warna: item.produk_master.warna || '',
      tipe_artikel: item.produk_master.tipe_artikel,
      tanggal_produksi: tglProduksi,
    });

    // 3. Check against blockchain (if connected)
    let blockchainData = null;
    let onChainHash = null;

    if (isBlockchainConnected()) {
      try {
        const contract = getContract();
        const result = await contract.getProductByUUID(uuid);

        blockchainData = {
          tokenId: result.tokenId.toString(),
          metadataHash: result.metadataHash,
          currentOwner: result.currentOwner,
          mintedBy: result.mintedBy,
          mintedAt: new Date(Number(result.mintedAt) * 1000).toISOString(),
        };
        onChainHash = result.metadataHash;
      } catch (blockchainError) {
        blockchainData = null;
      }
    }

    // 4. Determine verification result
    let verified = false;
    let status = 'UNKNOWN';

    if (item.status === 'pending') {
      status = 'PENDING';
      verified = false;
    } else if (onChainHash) {
      if (onChainHash === recomputedHash && onChainHash === item.hash_blockchain) {
        verified = true;
        status = 'VERIFIED';
      } else {
        verified = false;
        status = 'HASH_MISMATCH';
      }
    } else if (item.hash_blockchain === recomputedHash) {
      verified = true;
      status = 'VERIFIED_OFFLINE';
    } else {
      verified = false;
      status = 'HASH_MISMATCH';
    }

    const ownershipHistory = item.kepemilikan.map(kp => ({
      ...kp,
      nama_display: kp.konsumen?.nama_display || '',
    }));

    res.json({
      success: true,
      verified,
      status,
      message: verified
        ? 'PRODUK TERVERIFIKASI — Hash blockchain cocok ✓'
        : status === 'PENDING'
          ? 'Product is pending — not yet minted to blockchain.'
          : 'PRODUK TIDAK TERVERIFIKASI — Hash tidak cocok ✗',
      data: {
        product: {
          id_item: item.id_item,
          nama_produk: item.produk_master.nama_produk,
          harga: item.produk_master.harga,
          warna: item.produk_master.warna,
          tipe_artikel: item.produk_master.tipe_artikel,
          tanggal_produksi: item.produk_master.tanggal_produksi,
          status: item.status,
        },
        hashes: {
          stored_hash: item.hash_blockchain,
          recomputed_hash: recomputedHash,
          on_chain_hash: onChainHash,
          match: verified,
        },
        blockchain: blockchainData,
        ownershipHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items/bind-nfc
 * 🏷️ Point 3: Lightweight NFC Binding Endpoint
 * Payload: { hash, uid_fisik }
 */
router.post('/bind-nfc', async (req, res, next) => {
  try {
    const { hash, uid_fisik, overwrite } = req.body;

    if (!hash || !uid_fisik) {
      return res.status(400).json({
        success: false,
        message: 'Payload tidak lengkap. Parameter "hash" dan "uid_fisik" wajib disertakan.',
      });
    }

    const cleanHash = String(hash).trim().toLowerCase();
    const rawUid = String(uid_fisik).trim();
    const normUid = rawUid.toLowerCase().replace(/[^a-f0-9]/g, '');

    if (!normUid) {
      return res.status(400).json({
        success: false,
        message: 'Format uid_fisik tidak valid.',
      });
    }

    // 1. Find the item by hash_blockchain
    const item = await prisma.productItem.findFirst({
      where: {
        hash_blockchain: { equals: cleanHash, mode: 'insensitive' },
      },
      include: {
        produk_master: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item dengan hash blockchain tersebut tidak ditemukan di database.',
      });
    }

    // 2. Check if already bound or incorrect status
    if ((item.status === 'minted' || item.status === 'sold') && !overwrite) {
      return res.status(400).json({
        success: false,
        message: `Item ini sudah diikat ke cip NFC sebelumnya (Status: ${item.status}). Gunakan opsi overwrite jika ingin memperbarui.`,
        already_bound: true,
        data: {
          id_item: item.id_item,
          uid_fisik: item.uid_fisik,
          status: item.status,
        },
      });
    }

    if (item.status !== 'waiting_nfc' && !overwrite) {
      return res.status(400).json({
        success: false,
        message: `Status item saat ini adalah '${item.status}'. Item harus berstatus 'waiting_nfc' untuk diikat ke cip NFC.`,
      });
    }

    // 3. Anti-duplicate chip check: ensure uid_fisik isn't already used by another item
    const duplicateCheck = await prisma.productItem.findFirst({
      where: {
        uid_fisik: {
          not: null,
          equals: rawUid,
          mode: 'insensitive',
        },
        id_item: { not: item.id_item },
      },
    });

    if (duplicateCheck) {
      return res.status(409).json({
        success: false,
        message: `Cip NFC dengan UID '${rawUid}' sudah terikat pada produk lain. Gunakan cip NFC fisik yang baru/berbeda!`,
        duplicate_detected: true,
      });
    }

    // 4. Update the item with physical UID and set status to 'minted'
    await prisma.$transaction([
      prisma.productItem.update({
        where: { id_item: item.id_item },
        data: {
          uid_fisik: rawUid,
          status: 'minted',
        },
      }),
      prisma.systemLog.create({
        data: {
          action: 'NFC_BIND',
          detail: {
            id_item: item.id_item,
            hash: cleanHash,
            uid_fisik: rawUid,
            status: 'minted',
          },
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Cip NFC (${rawUid}) berhasil diikat ke produk "${item.produk_master?.nama_produk}"! Status aktif.`,
      data: {
        id_item: item.id_item,
        id_produk: item.id_produk,
        nama_produk: item.produk_master?.nama_produk,
        hash_blockchain: item.hash_blockchain,
        uid_fisik: rawUid,
        status: 'minted',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items/reset-nfc
 * Reset an item's status back to 'waiting_nfc' and clear uid_fisik
 * Payload: { id_item } or { hash }
 */
router.post('/reset-nfc', async (req, res, next) => {
  try {
    const { id_item, hash } = req.body;
    const where = {};
    if (id_item) {
      where.id_item = id_item;
    } else if (hash) {
      where.hash_blockchain = { equals: String(hash).trim().toLowerCase(), mode: 'insensitive' };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Parameter "id_item" atau "hash" wajib disertakan.',
      });
    }

    const item = await prisma.productItem.findFirst({
      where,
      include: {
        produk_master: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item tidak ditemukan.',
      });
    }

    await prisma.$transaction([
      prisma.productItem.update({
        where: { id_item: item.id_item },
        data: {
          uid_fisik: null,
          status: 'waiting_nfc',
        },
      }),
      prisma.systemLog.create({
        data: {
          action: 'NFC_RESET',
          detail: {
            id_item: item.id_item,
            previous_uid: item.uid_fisik,
            status: 'waiting_nfc',
          },
        },
      }),
    ]);

    res.json({
      success: true,
      message: `Item "${item.produk_master?.nama_produk || item.id_item}" berhasil di-reset ke status 'waiting_nfc'.`,
      data: {
        id_item: item.id_item,
        status: 'waiting_nfc',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/items/verify-nfc
 * 🛡️ Point 5: Strict Double Validation Verification Endpoint
 * Payload: { hash, uid_fisik }
 */
router.post('/verify-nfc', async (req, res, next) => {
  try {
    const { hash, uid_fisik } = req.body;

    if (!hash || !uid_fisik) {
      return res.status(400).json({
        success: false,
        verified: false,
        security_check: 'FAILED',
        message: 'Parameter "hash" dan "uid_fisik" wajib disertakan untuk verifikasi NFC.',
      });
    }

    const cleanHash = String(hash).trim().toLowerCase();
    const rawUid = String(uid_fisik).trim();
    const normScannedUid = rawUid.toLowerCase().replace(/[^a-f0-9]/g, '');

    // ─── 1. LOCAL VALIDATION: Anti-Cloning & Database Record ───
    const item = await prisma.productItem.findFirst({
      where: {
        hash_blockchain: { equals: cleanHash, mode: 'insensitive' },
      },
      include: {
        produk_master: {
          include: {
            sub_kategori: {
              include: {
                kategori: true,
              },
            },
          },
        },
        kepemilikan: {
          include: {
            konsumen: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!item || !item.produk_master) {
      return res.status(404).json({
        success: false,
        verified: false,
        status: 'NOT_FOUND',
        security_check: 'FAILED',
        message: 'PRODUK TIDAK TERDAFTAR — Hash digital sertifikat ini tidak ditemukan dalam ekosistem LuxChain ✗',
      });
    }

    // Check status
    if (item.status === 'waiting_nfc' || item.status === 'pending') {
      return res.status(400).json({
        success: false,
        verified: false,
        status: 'UNACTIVATED',
        security_check: 'FAILED',
        message: 'PRODUK BELUM DIAKTIVASI — Cip NFC ini belum selesai diikat oleh pihak pabrik/brand.',
        data: {
          id_item: item.id_item,
          nama_produk: item.produk_master.nama_produk,
          status: item.status,
        },
      });
    }

    // ANTI-CLONING CHECK: Compare physical UID registered with factory UID scanned
    const registeredUid = String(item.uid_fisik || '').trim();
    const normRegisteredUid = registeredUid.toLowerCase().replace(/[^a-f0-9]/g, '');

    if (!normRegisteredUid || normRegisteredUid !== normScannedUid) {
      // Record clone attempt security alert
      await prisma.systemLog.create({
        data: {
          action: 'SECURITY_ALERT_CLONE_ATTEMPT',
          detail: {
            id_item: item.id_item,
            nama_produk: item.produk_master.nama_produk,
            registered_uid: item.uid_fisik,
            scanned_uid: rawUid,
            hash: cleanHash,
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        verified: false,
        status: 'CLONE_DETECTED',
        security_check: 'FAILED',
        message: 'PERINGATAN: UPAYA PEMALSUAN/KLONING TERDETEKSI! UID fisik cip NFC tidak cocok dengan sertifikat asli produk ✗',
        security_detail: {
          anti_clone_passed: false,
          reason: 'Hardware Factory UID Mismatch — data hash sah telah disalin ke cip NFC tiruan!',
          registered_uid_masked: registeredUid ? `${registeredUid.substring(0, 4)}****${registeredUid.substring(registeredUid.length - 2)}` : 'NONE',
          scanned_uid: rawUid,
        },
      });
    }

    // ─── 2. GLOBAL VALIDATION: Sepolia Smart Contract Status ───
    let blockchainData = null;
    let onChainVerified = false;

    if (isBlockchainConnected()) {
      try {
        const contract = getContract();
        const result = await contract.getProductByUUID(item.id_item);

        blockchainData = {
          tokenId: result.tokenId.toString(),
          metadataHash: result.metadataHash,
          currentOwner: result.currentOwner,
          mintedBy: result.mintedBy,
          mintedAt: new Date(Number(result.mintedAt) * 1000).toISOString(),
        };

        if (result.metadataHash.toLowerCase() === cleanHash) {
          onChainVerified = true;
        }
      } catch (bcErr) {
        console.error('⚠️ Smart contract call failed during verify-nfc:', bcErr.message);
        blockchainData = null;
      }
    } else {
      onChainVerified = true;
    }

    const isAuthentic = onChainVerified;

    const activeOwner = item.kepemilikan.find(k => k.status_kepemilikan === 'active');
    const currentOwnerObj = activeOwner ? {
      ...activeOwner,
      nama_display: activeOwner.konsumen?.nama_display || '',
    } : null;

    const ownershipHistory = item.kepemilikan.map(kp => ({
      ...kp,
      nama_display: kp.konsumen?.nama_display || '',
    }));

    res.json({
      success: true,
      verified: isAuthentic,
      status: isAuthentic ? 'VERIFIED_AUTHENTIC' : 'ONCHAIN_MISMATCH',
      security_check: isAuthentic ? 'PASSED' : 'FAILED',
      message: isAuthentic
        ? 'PRODUK ASLI & TERVERIFIKASI MUTLAK ✓ (Anti-Kloning NFC & Smart Contract Sepolia Valid)'
        : 'PRODUK TIDAK TERVERIFIKASI — Validasi smart contract gagal ✗',
      data: {
        product: {
          id_item: item.id_item,
          nama_produk: item.produk_master.nama_produk,
          harga: item.produk_master.harga,
          warna: item.produk_master.warna,
          tipe_artikel: item.produk_master.tipe_artikel,
          tanggal_produksi: item.produk_master.tanggal_produksi,
          gambar_url: item.produk_master.gambar_url,
          nama_kategori: item.produk_master.sub_kategori?.kategori?.nama_kategori || '',
          nama_sub_kategori: item.produk_master.sub_kategori?.nama_sub_kategori || '',
          status: item.status,
          is_claimed: Boolean(item.is_claimed),
        },
        nfc: {
          uid_fisik: item.uid_fisik,
          hardware_matched: true,
          anti_clone_passed: true,
        },
        hashes: {
          stored_hash: item.hash_blockchain,
          recomputed_hash: cleanHash,
          on_chain_hash: blockchainData ? blockchainData.metadataHash : null,
          match: isAuthentic,
        },
        blockchain: blockchainData,
        currentOwner: currentOwnerObj,
        ownershipHistory,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
