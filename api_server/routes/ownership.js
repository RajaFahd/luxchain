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
const { pool } = require('../config/database');
const { getContract, isBlockchainConnected, CONTRACT_ABI, getProvider, getWallet } = require('../config/blockchain');

/**
 * POST /api/ownership/claim
 * Consumer claims ownership of a product after buying
 * Requires secret_code (from scratch card) for security
 *
 * Body: { id_item, wallet_address, secret_code, tx_hash? }
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
    const [items] = await pool.execute(
      'SELECT * FROM product_item WHERE id_item = ?',
      [id_item]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product item not found.',
      });
    }

    const item = items[0];

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
    const [existingOwner] = await pool.execute(
      "SELECT * FROM kepemilikan WHERE id_item = ? AND status_kepemilikan = 'active'",
      [id_item]
    );

    if (existingOwner.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product already has an active owner.',
      });
    }

    // Ensure consumer exists (auto-register if not)
    const [consumer] = await pool.execute(
      'SELECT * FROM konsumen WHERE wallet_address = ?',
      [wallet_address]
    );

    if (consumer.length === 0) {
      await pool.execute(
        'INSERT INTO konsumen (wallet_address, nama_display, join_date) VALUES (?, ?, NOW())',
        [wallet_address, `User_${wallet_address.slice(0, 8)}`]
      );
    }

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
        // We do not return 500 here, we just proceed with the off-chain MySQL update.
      }
    }

    // Create ownership record
    await pool.execute(
      `INSERT INTO kepemilikan (id_item, wallet_address, tanggal_klaim, status_kepemilikan, tx_hash, created_at)
       VALUES (?, ?, NOW(), 'active', ?, NOW())`,
      [id_item, wallet_address, finalTxHash]
    );

    // Update item status to sold + mark as claimed
    await pool.execute(
      "UPDATE product_item SET status = 'sold', is_claimed = TRUE WHERE id_item = ?",
      [id_item]
    );

    // Log transaction
    await pool.execute(
      `INSERT INTO system_log (action, detail, created_at)
       VALUES ('CLAIM', ?, NOW())`,
      [JSON.stringify({ id_item, wallet_address, tx_hash: finalTxHash })]
    ).catch(() => {});

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
 * Body: { id_item, from_wallet, to_wallet, tx_hash? }
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
    const [currentOwnership] = await pool.execute(
      "SELECT * FROM kepemilikan WHERE id_item = ? AND wallet_address = ? AND status_kepemilikan = 'active'",
      [id_item, from_wallet]
    );

    if (currentOwnership.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not the current owner of this product.',
      });
    }

    // Ensure new owner exists (auto-register)
    const [newConsumer] = await pool.execute(
      'SELECT * FROM konsumen WHERE wallet_address = ?',
      [to_wallet]
    );

    if (newConsumer.length === 0) {
      await pool.execute(
        'INSERT INTO konsumen (wallet_address, nama_display, join_date) VALUES (?, ?, NOW())',
        [to_wallet, `User_${to_wallet.slice(0, 8)}`]
      );
    }

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
        // We do not return 500 here, we just proceed with the off-chain MySQL update.
      }
    }

    // Update previous owner status
    await pool.execute(
      "UPDATE kepemilikan SET status_kepemilikan = 'transferred' WHERE id_item = ? AND wallet_address = ? AND status_kepemilikan = 'active'",
      [id_item, from_wallet]
    );

    // Create new ownership record
    await pool.execute(
      `INSERT INTO kepemilikan (id_item, wallet_address, tanggal_klaim, status_kepemilikan, tx_hash, created_at)
       VALUES (?, ?, NOW(), 'active', ?, NOW())`,
      [id_item, to_wallet, finalTxHash]
    );

    // Log transaction
    await pool.execute(
      `INSERT INTO system_log (action, detail, created_at)
       VALUES ('TRANSFER', ?, NOW())`,
      [JSON.stringify({ id_item, from_wallet, to_wallet, tx_hash: finalTxHash })]
    ).catch(() => {});

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
    const [active] = await pool.execute(
      `SELECT
        kp.*,
        pi.hash_blockchain,
        pi.status as item_status,
        pm.nama_produk,
        pm.harga,
        pm.warna,
        pm.tipe_artikel,
        pm.tanggal_produksi,
        pm.gambar_url
       FROM kepemilikan kp
       JOIN product_item pi ON kp.id_item = pi.id_item
       JOIN produk_master pm ON pi.id_produk = pm.id_produk
       WHERE kp.wallet_address = ? AND kp.status_kepemilikan = 'active'
       ORDER BY kp.created_at DESC`,
      [wallet]
    );

    // Get transfer history (previous ownership)
    const [history] = await pool.execute(
      `SELECT
        kp.*,
        pi.hash_blockchain,
        pm.nama_produk,
        pm.tipe_artikel,
        pm.gambar_url
       FROM kepemilikan kp
       JOIN product_item pi ON kp.id_item = pi.id_item
       JOIN produk_master pm ON pi.id_produk = pm.id_produk
       WHERE kp.wallet_address = ? AND kp.status_kepemilikan = 'transferred'
       ORDER BY kp.created_at DESC`,
      [wallet]
    );

    // Get consumer profile
    const [consumer] = await pool.execute(
      'SELECT * FROM konsumen WHERE wallet_address = ?',
      [wallet]
    );

    res.json({
      success: true,
      data: {
        consumer: consumer.length > 0 ? consumer[0] : null,
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
