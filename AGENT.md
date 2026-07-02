# AGENT CONTEXT - LUXCHAIN SYSTEM LOGIC

## 1. Core Architecture 
Sistem menggunakan model hybrid:
- Off-Chain: Node.js, Express.js, MySQL (Cache & Metadata)
- On-Chain: Solidity Smart Contract (Ethereum Sepolia Testnet)

## 2. Business Logic Workflows
### A. Admin Minting Flow 
1. Input: Metadata Produk Master (SKU, Nama, Brand, dsb)
2. Process: Generate UUID unik & Render QR Code
3. Security: Metadata + UUID dikonversi menjadi Digital Hash (SHA-256)
4. Blockchain: Panggil fungsi `mintToBlockchain()` pada Smart Contract
5. Database: Setelah TxHash sukses, simpan status ke MySQL

### B. Verification & Cross-Check Flow 
1. Input: Scan QR Code (Ambil UUID)
2. Parallel Process: Ambil metadata dari MySQL & Panggil fungsi read-only ke Smart Contract secara asinkron
3. Validation: Jika Digital Hash di blockchain tidak identik dengan input, tampilkan "Produk Palsu"

### C. Ownership Transfer 
1. Otorisasi: Konsumen memberikan Digital Signature via Metamask
2. Blockchain: Eksekusi `transferOwnership()` di Smart Contract
3. Sync: Backend memperbarui status tabel Kepemilikan di MySQL