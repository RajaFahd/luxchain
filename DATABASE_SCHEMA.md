# DATABASE SCHEMA - LUXCHAIN (MySQL)

## 1. Table: Admin
- `id_admin`: PK, INT, AI
- `email`: VARCHAR
- `password`: VARCHAR (Hashed)
- `wallet_address`: VARCHAR(42)

## 2. Table: Kategori
- `id_kategori`: PK, INT
- `nama_kategori`: VARCHAR

## 3. Table: SubKategori
- `id_sub_kategori`: PK, INT
- `id_kategori`: FK (Kategori)
- `nama_sub_kategori`: VARCHAR

## 4. Table: ProdukMaster (SKU/Design)
- `id_produk`: PK, INT
- `id_sub_kategori`: FK (SubKategori)
- `id_admin`: FK (Admin)
- `nama_produk`: VARCHAR
- `harga`: DECIMAL
- `warna`: VARCHAR
- `tipe_artikel`: VARCHAR
- `tanggal_produksi`: DATE
- `gambar_url`: VARCHAR(500), nullable

## 5. Table: ProductItem (Physical Unit)
- `id_item`: PK, VARCHAR (UUID)
- `id_produk`: FK (ProdukMaster)
- `hash_blockchain`: VARCHAR (64)
- `tx_hash`: VARCHAR(66), nullable — transaction hash dari Sepolia Etherscan
- `secret_code`: VARCHAR(12) — kode scratch card untuk klaim
- `status`: ENUM('pending', 'minted', 'sold')
- `is_claimed`: BOOLEAN, default FALSE
- `created_at`: DATETIME

## 6. Table: Konsumen
- `wallet_address`: PK, VARCHAR(42) 
- `nama_display`: VARCHAR
- `foto_profile`: VARCHAR, nullable — path relatif ke foto profil konsumen
- `join_date`: DATETIME

## 7. Table: Kepemilikan (Pivot History)
- `id_kepemilikan`: PK, INT, AI
- `id_item`: FK (ProductItem)
- `wallet_address`: FK (Konsumen)
- `tanggal_klaim`: DATETIME
- `status_kepemilikan`: ENUM('active', 'transferred')
- `tx_hash`: VARCHAR(66), nullable — transaction hash dari Sepolia Etherscan
- `created_at`: DATETIME