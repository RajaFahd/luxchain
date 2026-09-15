// ============================================================
// Ownership Routes — Claim & Transfer
// ============================================================
// POST /api/ownership/claim      — Claim product ownership
// POST /api/ownership/transfer   — Transfer ownership
// GET  /api/ownership/:wallet    — Get ownership by wallet
// ============================================================

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { prisma } = require('../config/prisma');
const { getContract, isBlockchainConnected, CONTRACT_ABI, getProvider, getWallet } = require('../config/blockchain');

/**
 * POST /api/ownership/claim
 * Consumer claims ownership of a product after buying
 * Requires secret_code (from scratch card) for security
 *
 * Body: { id_item, wallet_address, secret_code, tx_hash?, private_key? }
 */
router.post('/claim', async (req, res, next) => {
  try {
    const { id_item, wallet_address, secret_code, tx_hash, private_key } = req.body;

    if (!id_item || !wallet_address || !secret_code) {
      return res.status(400).json({
        success: false,
        message: 'id_item, wallet_address, and secret_code are required.',
      });
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    // Check item exists and is minted
    const item = await prisma.productItem.findUnique({
      where: { id_item },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Product item not found.',
      });
    }

    if (item.status !== 'minted') {
      return res.status(400).json({
        success: false,
        message: `Cannot claim product with status: ${item.status}`,
      });
    }

    // ⚡ VERIFY SECRET CODE (scratch card validation)
    if (item.secret_code !== secret_code.toUpperCase().trim()) {
      return res.status(403).json({
        success: false,
        message: 'Invalid secret code. Please check your scratch card.',
      });
    }

    // Check if already claimed
    if (item.is_claimed) {
      return res.status(400).json({
        success: false,
        message: 'Product has already been claimed.',
      });
    }

    // Check if item already has an active owner
    const existingOwner = await prisma.kepemilikan.findFirst({
      where: {
        id_item,
        status_kepemilikan: 'active',
      },
    });

    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: 'Product already has an active owner.',
      });
    }

    // Ensure consumer exists (auto-register if not)
    await prisma.konsumen.upsert({
      where: { wallet_address },
      update: {},
      create: {
        wallet_address,
        nama_display: `User_${wallet_address.slice(0, 8)}`,
      },
    });

    // 🔗 BLOCKCHAIN INTEGRATION: Execute claim on-chain
    let finalTxHash = tx_hash || null;
    if (isBlockchainConnected()) {
      try {
        const provider = getProvider();
        const contractAddress = process.env.CONTRACT_ADDRESS;
        
        let signer = null;
        if (private_key) {
          signer = new ethers.Wallet(private_key, provider);
        } else {
          signer = getWallet();
        }

        if (!signer) {
          throw new Error('No signer wallet available');
        }

        const contractInstance = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
        const productData = await contractInstance.getProductByUUID(id_item);
        const tokenId = productData.tokenId;
        
        if (private_key) {
          console.log(`Executing on-chain claim (claimProduct) for token ${tokenId} signed by consumer ${wallet_address}...`);
          const tx = await contractInstance.claimProduct(tokenId);
          const receipt = await tx.wait();
          finalTxHash = receipt.hash;
        } else {
          console.log(`Executing on-chain claim (transfer) for token ${tokenId} using admin fallback to ${wallet_address}...`);
          const tx = await contractInstance.transferProduct(tokenId, wallet_address);
          const receipt = await tx.wait();
          finalTxHash = receipt.hash;
        }
        console.log(`✅ On-chain claim successful: ${finalTxHash}`);
      } catch (err) {
        console.warn('⚠️ Blockchain claim skipped (Item might only exist off-chain or transaction failed):', err.message);
      }
    }

    // Perform database updates in transaction
    await prisma.$transaction([
      prisma.kepemilikan.create({
        data: {
          id_item,
          wallet_address,
          status_kepemilikan: 'active',
          tx_hash: finalTxHash,
        },
      }),
      prisma.productItem.update({
        where: { id_item },
        data: {
          status: 'sold',
          is_claimed: true,
        },
      }),
      prisma.systemLog.create({
        data: {
          action: 'CLAIM',
          detail: { id_item, wallet_address, tx_hash: finalTxHash },
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Product claimed successfully!',
      data: {
        id_item,
        wallet_address,
        status: 'active',
        tx_hash: finalTxHash,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ownership/transfer
 * Transfer ownership from current owner to new owner
 *
 * Body: { id_item, from_wallet, to_wallet, tx_hash?, private_key? }
 */
router.post('/transfer', async (req, res, next) => {
  try {
    const { id_item, from_wallet, to_wallet, tx_hash, private_key } = req.body;

    if (!id_item || !from_wallet || !to_wallet) {
      return res.status(400).json({
        success: false,
        message: 'id_item, from_wallet, and to_wallet are required.',
      });
    }

    // Validate wallet addresses
    if (!/^0x[a-fA-F0-9]{40}$/.test(from_wallet) || !/^0x[a-fA-F0-9]{40}$/.test(to_wallet)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ethereum wallet address format.',
      });
    }

    if (from_wallet.toLowerCase() === to_wallet.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same wallet.',
      });
    }

    // Check current ownership
    const currentOwnership = await prisma.kepemilikan.findFirst({
      where: {
        id_item,
        wallet_address: from_wallet,
        status_kepemilikan: 'active',
      },
    });

    if (!currentOwnership) {
      return res.status(403).json({
        success: false,
        message: 'You are not the current owner of this product.',
      });
    }

    // Ensure new owner exists (auto-register)
    await prisma.konsumen.upsert({
      where: { wallet_address: to_wallet },
      update: {},
      create: {
        wallet_address: to_wallet,
        nama_display: `User_${to_wallet.slice(0, 8)}`,
      },
    });

    // 🔗 BLOCKCHAIN INTEGRATION: Execute transfer on-chain
    let finalTxHash = tx_hash || null;
    if (isBlockchainConnected()) {
      try {
        const provider = getProvider();
        const contractAddress = process.env.CONTRACT_ADDRESS;
        
        let signer = null;
        if (private_key) {
          signer = new ethers.Wallet(private_key, provider);
        } else {
          signer = getWallet();
        }

        if (!signer) {
          throw new Error('No signer wallet available');
        }

        const contractInstance = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
        const productData = await contractInstance.getProductByUUID(id_item);
        const tokenId = productData.tokenId;
        
        console.log(`Executing on-chain transfer for token ${tokenId} from ${from_wallet} to ${to_wallet} signed by owner...`);
        const tx = await contractInstance.transferProduct(tokenId, to_wallet);
        const receipt = await tx.wait();
        finalTxHash = receipt.hash;
        console.log(`✅ On-chain transfer successful: ${finalTxHash}`);
      } catch (err) {
        console.warn('⚠️ Blockchain transfer skipped (Item might only exist off-chain or transaction failed):', err.message);
      }
    }

    // Update in transaction: set old owner to 'transferred', create new 'active' record, log system_log
    await prisma.$transaction([
      prisma.kepemilikan.update({
        where: { id_kepemilikan: currentOwnership.id_kepemilikan },
        data: { status_kepemilikan: 'transferred' },
      }),
      prisma.kepemilikan.create({
        data: {
          id_item,
          wallet_address: to_wallet,
          status_kepemilikan: 'active',
          tx_hash: finalTxHash,
        },
      }),
      prisma.systemLog.create({
        data: {
          action: 'TRANSFER',
          detail: { id_item, from_wallet, to_wallet, tx_hash: finalTxHash },
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Ownership transferred successfully!',
      data: {
        id_item,
        from_wallet,
        to_wallet,
        tx_hash: finalTxHash,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ownership/:wallet
 * Get all products owned by a wallet address
 */
router.get('/:wallet', async (req, res, next) => {
  try {
    const { wallet } = req.params;

    // Get active ownership
    const activeRecords = await prisma.kepemilikan.findMany({
      where: {
        wallet_address: wallet,
        status_kepemilikan: 'active',
      },
      include: {
        product_item: {
          include: {
            produk_master: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const active = activeRecords.map(kp => ({
      ...kp,
      hash_blockchain: kp.product_item?.hash_blockchain || '',
      item_status: kp.product_item?.status || '',
      nama_produk: kp.product_item?.produk_master?.nama_produk || '',
      harga: kp.product_item?.produk_master?.harga || 0,
      warna: kp.product_item?.produk_master?.warna || '',
      tipe_artikel: kp.product_item?.produk_master?.tipe_artikel || '',
      tanggal_produksi: kp.product_item?.produk_master?.tanggal_produksi || '',
      gambar_url: kp.product_item?.produk_master?.gambar_url || null,
    }));

    // Get transfer history (previous ownership)
    const historyRecords = await prisma.kepemilikan.findMany({
      where: {
        wallet_address: wallet,
        status_kepemilikan: 'transferred',
      },
      include: {
        product_item: {
          include: {
            produk_master: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const history = historyRecords.map(kp => ({
      ...kp,
      hash_blockchain: kp.product_item?.hash_blockchain || '',
      nama_produk: kp.product_item?.produk_master?.nama_produk || '',
      tipe_artikel: kp.product_item?.produk_master?.tipe_artikel || '',
      gambar_url: kp.product_item?.produk_master?.gambar_url || null,
    }));

    // Get consumer profile
    const consumer = await prisma.konsumen.findUnique({
      where: { wallet_address: wallet },
    });

    res.json({
      success: true,
      data: {
        consumer: consumer || null,
        owned: active,
        transferred: history,
        stats: {
          total_owned: active.length,
          total_transferred: history.length,
          total_transactions: active.length + history.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
