# UI FLOW & WIREFRAME SPECIFICATION 

## A. Web Admin Environment (Next.js)
1. **Login Page**: Input Username/Password.
2. **Product List**: Tabel dengan kolom Image, SKU, Name, Brand, Token ID, Status, Action.
3. **Minting Form**: Form input metadata (Brand, SKU, Color, Material, Year) + Tombol "MINT TO BLOCKCHAIN".
4. **Transaction Page**: Tabel riwayat On-Chain (Tx Hash, From, To, Product ID, Type, Date, Status).
5. **System Log**: Kronologi aktivitas (Timestamp, Action, Blockchain Confirmation).

## B. Mobile DApps Environment (Flutter)
1. **Splash Screen**: Logo Luxchain + Button "MULAI".
2. **Login Screen**: Tombol "CONNECT METAMASK" (Ethereum Sepolia Network).
3. **Home Screen**: Menampilkan Wallet Address, Jumlah NFT, & Daftar Koleksi.
4. **Scanner Screen**: Viewport kamera untuk Scan QR/NFC.
5. **Verification Result**: Menampilkan Status (Original/Palsu), Metadata Produk, & Tombol "KLAIM KEPEMILIKAN".
6. **Claim/Transfer Page**: Detail biaya (Gas Fee) + Tombol Konfirmasi Klaim via Digital Signature.
7. **Success Screen**: Menampilkan Tx Hash & Block Number setelah transaksi berhasil.