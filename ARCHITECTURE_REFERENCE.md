# LUXCHAIN - Complete Architecture Reference

## 1. Project Overview
Luxchain adalah platform verifikasi keaslian produk fashion mewah berbasis **hybrid blockchain**. Sistem menggabungkan penyimpanan off-chain (MySQL) untuk metadata & cache, dengan on-chain storage (Ethereum Sepolia Testnet) untuk immutable proof-of-authenticity via Smart Contract.

**Dua jenis pengguna:**
- **Admin** → Web Dashboard (Next.js) — minting produk, manajemen transaksi
- **Konsumen/Kolektor** → Mobile DApp (Flutter) — verifikasi, klaim, transfer kepemilikan

---

## 2. Monorepo Structure (4 Modules)

```
luxchain/
├── web_app/          # Frontend Web Admin — Next.js 16 + React 19 + TypeScript + TailwindCSS v4
├── mobile_app/       # Mobile DApp — Flutter (Dart SDK ^3.11.5)
├── api_server/       # Backend REST API — Node.js + Express.js v5
├── smart_contract/   # Solidity Smart Contracts — Remix IDE (Ethereum Sepolia Testnet)
├── DESIGN.md         # Design system spec
├── AGENT.md          # Business logic & architecture spec
├── DATABASE_SCHEMA.md # MySQL database schema
└── UI_FLOW.md        # UI/UX wireframe specification
```

### Current State of Each Module:
- **web_app**: Next.js 16 bootstrapped, TailwindCSS v4 configured, default page only
- **mobile_app**: Flutter project initialized, default counter app in main.dart
- **api_server**: Express.js v5 installed, no routes/controllers yet
- **smart_contract**: Remix IDE project with sample contracts (Storage, Owner, Ballot, belajar.sol), no Luxchain contract yet

---

## 3. Core Architecture (Hybrid Model)

### Off-Chain Layer
- **Backend**: Node.js + Express.js (REST API)
- **Database**: MySQL (7 tables — metadata, cache, user data)
- **Functions**: CRUD metadata, generate UUID, generate QR Code, SHA-256 hashing, JWT auth

### On-Chain Layer
- **Network**: Ethereum Sepolia Testnet
- **Language**: Solidity
- **Key Functions**:
  - `mintToBlockchain()` — Minting produk baru (admin only)
  - `transferOwnership()` — Transfer kepemilikan (consumer via MetaMask signature)
  - Read-only verification queries
- **Wallet Integration**: MetaMask (Ethereum Sepolia Network)

### Data Flow Hybrid:
```
Admin Mint: Form → API Server (UUID + Hash) → Admin MetaMask Sign → Smart Contract mint() → Store TxHash in MySQL
Verify:     QR Scan → API Server → Parallel: MySQL lookup + Smart Contract read → Compare hash → Result
Transfer:   MetaMask Sign → Smart Contract transferOwnership() → API Server sync → MySQL update
```

---

## 4. Business Logic Workflows

### A. Admin Minting Flow (Batch Support)
1. Admin pastikan wallet (MetaMask) sudah terkoneksi di dashboard
2. Admin input 7 field metadata: nama_kategori, nama_sub_kategori, nama_produk, harga, warna, tipe_artikel, tanggal_produksi
3. Admin input **quantity** (jumlah unit fisik identik, mis. 10)
4. Backend **auto-generate** N ProductItem — masing-masing:
   - UUID unik + SHA-256 hash + QR Code
   - **Secret Code** 12-char alfanumerik (untuk scratch card)
5. Admin memberikan digital signature via MetaMask (membayar gas fee)
6. Smart Contract `mintToBlockchain(uuid, hash)` dipanggil **per item**
7. Setelah Tx sukses, simpan TxHash + status ke MySQL (ProductItem.status → 'minted')
8. Admin **cetak scratch card** berisi secret_code → ditempel di produk fisik

### B. Verification & Cross-Check Flow (Public, tanpa secret code)
1. Consumer scan QR Code → ambil UUID
2. **Parallel async**: Query metadata dari MySQL + Read-only call ke Smart Contract
3. Compare: Jika hash di blockchain ≠ hash dari input → "Produk Palsu"
4. Jika match → Tampilkan detail produk + status "PRODUK TERVERIFIKASI"

### C. Claim Ownership Flow (Butuh Secret Code)
1. Consumer scan QR → verify produk (flow B)
2. Consumer gosok scratch card → dapat **secret_code** 12-char
3. Consumer input secret_code di mobile app + connect wallet (MetaMask)
4. Backend **validasi secret_code** terhadap database
5. Jika valid → Smart Contract `claimProduct(tokenId)` dipanggil
6. MySQL: ProductItem.status → 'sold', is_claimed → TRUE
7. Kepemilikan record created (wallet_address, status 'active')

### D. Ownership Transfer Flow (Resale/Preloved)
1. Consumer beri digital signature via MetaMask
2. Smart Contract `transferOwnership()` dieksekusi
3. Backend sync status tabel Kepemilikan di MySQL
4. Previous owner status → 'transferred', new owner → 'active'

---

## 5. Database Schema (MySQL — 7 Tables)

### Table: Admin
| Column    | Type         | Notes          |
|-----------|-------------|----------------|
| id_admin  | INT, PK, AI | Auto-increment |
| email     | VARCHAR     |                |
| password  | VARCHAR     | Hashed (bcrypt)|
| wallet_address| VARCHAR(42) | Ethereum address (0x) |

### Table: Kategori
| Column        | Type    | Notes |
|---------------|---------|-------|
| id_kategori   | INT, PK |       |
| nama_kategori | VARCHAR |       |

### Table: SubKategori
| Column            | Type    | Notes           |
|-------------------|---------|-----------------|
| id_sub_kategori   | INT, PK |                 |
| id_kategori       | INT, FK | → Kategori      |
| nama_sub_kategori | VARCHAR |                 |

### Table: ProdukMaster (SKU/Design level)
| Column            | Type         | Notes           |
|-------------------|-------------|-----------------|
| id_produk         | INT, PK     |                 |
| id_sub_kategori   | INT, FK     | → SubKategori   |
| id_admin          | INT, FK     | → Admin         |
| nama_produk       | VARCHAR     |                 |
| harga             | DECIMAL     |                 |
| warna             | VARCHAR     |                 |
| tipe_artikel      | VARCHAR     |                 |
| tanggal_produksi  | DATE        |                 |
| gambar_url        | VARCHAR(500)| Nullable, product image path |

### Table: ProductItem (Physical unit level)
| Column           | Type                           | Notes                     |
|------------------|--------------------------------|---------------------------|
| id_item          | VARCHAR (UUID), PK             | UUID v4                   |
| id_produk        | INT, FK                        | → ProdukMaster            |
| hash_blockchain  | VARCHAR(64)                    | SHA-256 hash              |
| secret_code      | VARCHAR(12)                    | Scratch card klaim code   |
| status           | ENUM('pending','minted','sold')| Lifecycle state           |
| is_claimed       | BOOLEAN                        | Default FALSE             |
| created_at       | DATETIME                       |                           |

### Table: Konsumen
| Column         | Type          | Notes                 |
|----------------|---------------|-----------------------|
| wallet_address | VARCHAR(42),PK| Ethereum address (0x) |
| nama_display   | VARCHAR       |                       |
| join_date      | DATETIME      |                       |

### Table: Kepemilikan (Pivot/History)
| Column              | Type                           | Notes          |
|---------------------|--------------------------------|----------------|
| id_kepemilikan      | INT, PK, AI                    |                |
| id_item             | VARCHAR, FK                    | → ProductItem  |
| wallet_address      | VARCHAR(42), FK                | → Konsumen     |
| tanggal_klaim       | DATETIME                       |                |
| status_kepemilikan  | ENUM('active','transferred')   |                |
| created_at          | DATETIME                       |                |

### Relationships:
```
Kategori 1──N SubKategori 1──N ProdukMaster 1──N ProductItem
Admin 1──N ProdukMaster
ProductItem N──M Konsumen (via Kepemilikan pivot table)
```

---

## 6. Design System (Luxury Gold, Dual Mode)

### Color Palette — Token-Based (Light + Dark)
Sistem menggunakan CSS Custom Properties dengan **gold accent** di kedua mode.

**Light Mode (`:root`):**
| Token                | Value                          | Keterangan                    |
|----------------------|--------------------------------|-------------------------------|
| `--background`       | `#faf8f4`                      | Latar utama (warm cream)      |
| `--foreground`       | `#2a2520`                      | Teks utama (dark brown)       |
| `--card`             | `#ffffff`                      | Background kartu (white)      |
| `--primary`          | `#b8963e`                      | Aksi utama (GOLD)             |
| `--secondary`        | `#f0ebe0`                      | Panel sekunder (cream)        |
| `--muted`            | `#f0ebe0`                      | Area non-aktif (soft cream)   |
| `--muted-foreground` | `#8a8078`                      | Teks non-aktif (warm grey)    |
| `--destructive`      | `#d44040`                      | Aksi berbahaya (red)          |
| `--border`           | `rgba(180, 150, 90, 0.18)`     | Garis batas (gold transparan) |
| `--input-background` | `#f5f2ed`                      | Background input field        |

**Dark Mode (`.dark`):**
| Token                | Value                          | Keterangan                    |
|----------------------|--------------------------------|-------------------------------|
| `--background`       | `#0a0a0f`                      | Latar utama (deep dark)       |
| `--foreground`       | `#f0ede8`                      | Teks utama (warm white)       |
| `--card`             | `#13131a`                      | Background kartu              |
| `--primary`          | `#c8a96e`                      | Aksi utama (GOLD)             |
| `--secondary`        | `#1e1e2a`                      | Panel sekunder (dark)         |
| `--muted`            | `#1a1a24`                      | Area non-aktif                |
| `--muted-foreground` | `#7a7a96`                      | Teks non-aktif (grey-purple)  |
| `--destructive`      | `#e05c5c`                      | Aksi berbahaya (coral red)    |
| `--border`           | `rgba(200, 169, 110, 0.15)`    | Garis batas (gold transparan) |
| `--input-background` | `#1e1e2a`                      | Background input field        |

**Sidebar (Light / Dark):**
| Token               | Light       | Dark        |
|----------------------|-------------|-------------|
| `--sidebar`          | `#f5f2ed`   | `#0f0f18`   |
| `--sidebar-primary`  | `#b8963e`   | `#c8a96e`   |
| `--sidebar-accent`   | `#ede8de`   | `#1e1e2a`   |

**Radius:** base `1rem` → sm(12px), md(14px), lg(16px), xl(20px)

### Typography
- **Headings**: Inter (weight 500) — kokoh, modern
- **Body**: Inter (weight 400) — keterbacaan tinggi
- **Monospace**: Roboto Mono — wallet address, Tx Hash, UUID
- **Font Size Base**: 16px

### UI Components
- **Buttons**: `border-radius: var(--radius-md)` (14px), gold accent on hover/active
- **Cards**: bg `var(--card)`, border gold transparan, shadow minimal
- **Inputs**: bg `var(--input-background)`, focus ring gold `var(--ring)`
- **Sidebar**: bg `var(--sidebar)`, navigasi aktif gold `var(--sidebar-primary)`
- **Scanner View**: camera viewport dengan overlay garis pemindai gold beranimasi

---

## 7. Web Admin UI (Next.js) — Wireframe Screens

### 7.1 Admin Login Page
- Center card layout, judul "LUXCHAIN ADMIN"
- Form: Email + Password fields
- Tombol "LOGIN" (Masuk ke dashboard utama)
- *Note: Wallet MetaMask dikoneksikan setelah login di dalam Dashboard.*

### 7.2 Daftar Produk (Product List)
- Sidebar navigation: Dashboard, Products, Transactions, History
- Header: "Daftar Produk" + subteks + **Tombol "Connect Wallet" (di pojok kanan atas)**
- Tombol "Tambah Produk Baru"
- Search input
- Tabel kolom: Image | SKU | Name | Brand | Token ID | Status | Action
- Action: Transfer button, Edit icon, Delete icon
- Status badges (e.g., "Transfer")

### 7.3 Daftarkan Produk (Minting Form)
- Info banner: Status koneksi wallet Admin saat ini (Address: 0x...)
- Form fields: Product Name (2x), Brand, SKU (2x), Color, Material, Year
- Image Upload area
- Tombol besar: "MINT TO BLOCKCHAIN" (Memicu pop-up MetaMask)

### 7.4 Data Transaksi (Transaction List)
- Search bar + Filter dropdown + Column selector
- Tabel: Tx Hash | From Wallet | To Wallet | Product ID | Type | Date | Status
- Type values: Claim, Transfer
- Status badges (colored)

### 7.5 System History / Log
- Timeline format with timestamps
- Entries show: Timestamp, Action type, Blockchain confirmation details
- Details include: Tx Hash, Block number, Contract address

---

## 8. Mobile DApp UI (Flutter) — Wireframe Screens

### 8.1 Splash Screen
- Shield icon / logo
- "LUXCHAIN" title
- Tagline: "FASHION · BLOCKCHAIN · VERIFY"
- Description text
- Tombol "MULAI →"

### 8.2 Login Screen
- "LUXCHAIN" branding
- Subtitle: "Verify · Own · Transfer"
- MetaMask Wallet card (Ethereum Sepolia Network)
- Tombol "CONNECT METAMASK"
- Feature list: Verify & Sinbath, Layers & Transfer, Arrows & Transfer

### 8.3 Home Screen
- Header: "SELAMAT DATANG / COLLECTOR.ETH"
- Wallet Address display (truncated)
- Stats: NFT Dimiliki count, Total TX count, Network (SEPOLIA), Verified %
- Tombol "SCAN PRODUK"
- Section "KOLEKSI SAYA": list of owned NFTs (Name + brand, TOKEN ID)
- Section "TRANSAKSI TERBARU": recent Tx list (Item + hash, TYPE, Date)

### 8.4 Scan QR / NFC Screen
- Camera viewport with scanning frame
- Tombol "MULAI SCAN"
- Toggle options: QR Code (tag digital produk) / NFC Tag (chip tertanam produk)

### 8.5 Hasil Verifikasi (Verification Result)
- Status banner: "PRODUK TERVERIFIKASI · BLOCKCHAIN ETHEREUM" (green)
- Product image + details (Name, Brand, TOKEN #, Owner address)
- Transfer details: Dari Wallet, Ke Wallet Anda, Network, Gas Fee
- Warning: caution about product claiming
- Tombol "KLAIM KEPEMILIKAN"
- Tombol "TRANSFER KEPEMILIKAN"

### 8.6 Klaim Produk (Claim Page)
- Product card (name, brand, token ID)
- Transaction details: Dari Wallet, Ke Wallet, Network, Gas Fee
- Warning/caution banner
- Tombol "✓ KONFIRMASI KLAIM"

### 8.7 Transfer NFT Screen
- Verification result with product details (SKU, Warna, Material, Tahun, Mint Date, Transfer count)
- Token ID On-Chain display
- "KLAIM BENAM" button
- Wallet penerima input (0x... atau ENS name)
- Transfer details: From wallet, Network, Gas Fee, Smart Contract address
- Tombol "TRANSFER SEKARANG"

### 8.8 TX Success Screen
- Large checkmark icon
- "KLAIM BERHASIL!" title
- Success message
- Transaction summary: Produk, Token, TX Hash, Block numbers, Status
- Tombol "KEMBALI KE HOME"

### 8.9 Profil Screen
- Avatar + "COLLECTOR.ETH" + truncated address
- Network badge: ETHEREUM SEPOLIA
- Stats: NFT Dimiliki, Total TX, Verified %
- Settings: Label, Profil, Pengaturan
- Tombol "DISCONNECT WALLET"

---

## 9. API Endpoints to Build (Inferred)

### Auth
- `POST /api/auth/login` — Admin login (JWT)

### Products
- `GET /api/products` — List all products
- `POST /api/products` — Create product master
- `POST /api/products/:id/mint` — Mint to blockchain
- `GET /api/products/:id` — Get product detail

### Items
- `GET /api/items/:uuid` — Get item by UUID (for QR verification)
- `POST /api/items/:uuid/verify` — Cross-check with blockchain

### Transactions
- `GET /api/transactions` — List all on-chain transactions
- `POST /api/transactions/transfer` — Record ownership transfer

### Ownership
- `POST /api/ownership/claim` — Claim product ownership
- `GET /api/ownership/:wallet` — Get ownership history

### System
- `GET /api/logs` — System activity logs

---

## 10. Smart Contract Functions to Build (Inferred)

```solidity
// SPDX-License-Identifier: MIT
// LuxchainNFT.sol

// Key functions:
function mintToBlockchain(string uuid, string metadataHash) → tokenId
function verifyProduct(uint256 tokenId) → (string uuid, string metadataHash, address owner)
function transferOwnership(uint256 tokenId, address newOwner) → bool
function getOwnershipHistory(uint256 tokenId) → OwnershipRecord[]
function getProductByUUID(string uuid) → ProductRecord
```

---

## 11. Tech Stack Summary

| Layer           | Technology                        | Version         |
|-----------------|-----------------------------------|-----------------|
| Web Frontend    | Next.js + React + TypeScript      | Next 16, React 19 |
| CSS Framework   | TailwindCSS                       | v4              |
| Mobile App      | Flutter (Dart)                    | SDK ^3.11.5     |
| Backend API     | Node.js + Express.js              | Express v5      |
| Database        | MySQL                             | —               |
| Smart Contract  | Solidity (Remix IDE)              | —               |
| Blockchain      | Ethereum Sepolia Testnet          | —               |
| Wallet          | MetaMask                          | —               |
| Hashing         | SHA-256                           | —               |
| Auth            | JWT (JSON Web Token)              | —               |
