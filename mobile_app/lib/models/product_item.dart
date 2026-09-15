// ============================================================
// ProductItem Model — Matches API response from /api/items/:uuid
// ============================================================

class ProductItem {
  final String idItem;         // UUID v4
  final int idProduk;
  final String hashBlockchain;
  final String? uidFisik;
  final String status;         // 'pending', 'waiting_nfc', 'minted', 'sold'
  final bool isClaimed;
  final String? createdAt;

  // Joined from produk_master
  final String namaProduk;
  final double harga;
  final String? warna;
  final String? tipeArtikel;
  final String? tanggalProduksi;
  final String? gambarUrl;

  // Joined from kategori/sub_kategori
  final String? namaSubKategori;
  final String? namaKategori;

  ProductItem({
    required this.idItem,
    required this.idProduk,
    required this.hashBlockchain,
    this.uidFisik,
    required this.status,
    required this.isClaimed,
    this.createdAt,
    required this.namaProduk,
    required this.harga,
    this.warna,
    this.tipeArtikel,
    this.tanggalProduksi,
    this.gambarUrl,
    this.namaSubKategori,
    this.namaKategori,
  });

  factory ProductItem.fromJson(Map<String, dynamic> json) {
    return ProductItem(
      idItem: json['id_item'] ?? '',
      idProduk: json['id_produk'] ?? 0,
      hashBlockchain: json['hash_blockchain'] ?? '',
      uidFisik: json['uid_fisik'],
      status: json['status'] ?? 'pending',
      isClaimed: json['is_claimed'] == true || json['is_claimed'] == 1,
      createdAt: json['created_at']?.toString(),
      namaProduk: json['nama_produk'] ?? 'Unknown Product',
      harga: _parseDouble(json['harga']),
      warna: json['warna'],
      tipeArtikel: json['tipe_artikel'],
      tanggalProduksi: json['tanggal_produksi']?.toString(),
      gambarUrl: json['gambar_url'],
      namaSubKategori: json['nama_sub_kategori'],
      namaKategori: json['nama_kategori'],
    );
  }

  static double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  /// Truncated UUID for display
  String get truncatedId {
    if (idItem.length <= 12) return idItem;
    return '${idItem.substring(0, 8)}...';
  }
}

// ============================================================
// VerificationResult — Matches API response from /api/items/:uuid/verify
// ============================================================

class OwnershipHistoryItem {
  final int idKepemilikan;
  final String idItem;
  final String walletAddress;
  final String? tanggalKlaim;
  final String statusKepemilikan; // 'active' | 'transferred'
  final String? txHash;
  final String? namaDisplay;

  OwnershipHistoryItem({
    required this.idKepemilikan,
    required this.idItem,
    required this.walletAddress,
    this.tanggalKlaim,
    required this.statusKepemilikan,
    this.txHash,
    this.namaDisplay,
  });

  factory OwnershipHistoryItem.fromJson(Map<String, dynamic> json) {
    return OwnershipHistoryItem(
      idKepemilikan: json['id_kepemilikan'] ?? 0,
      idItem: json['id_item'] ?? '',
      walletAddress: json['wallet_address'] ?? '',
      tanggalKlaim: json['tanggal_klaim']?.toString(),
      statusKepemilikan: json['status_kepemilikan'] ?? 'active',
      txHash: json['tx_hash'],
      namaDisplay: json['nama_display'],
    );
  }
}

class VerificationResult {
  final bool verified;
  final String status;
  final String? securityCheck;
  final String message;
  final VerifiedProduct? product;
  final HashComparison? hashes;
  final BlockchainData? blockchain;
  final NfcValidationData? nfc;
  final List<OwnershipHistoryItem> ownershipHistory;

  VerificationResult({
    required this.verified,
    required this.status,
    this.securityCheck,
    required this.message,
    this.product,
    this.hashes,
    this.blockchain,
    this.nfc,
    required this.ownershipHistory,
  });

  factory VerificationResult.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;

    return VerificationResult(
      verified: json['verified'] ?? false,
      status: json['status'] ?? 'UNKNOWN',
      securityCheck: json['security_check'],
      message: json['message'] ?? '',
      product: data?['product'] != null
          ? VerifiedProduct.fromJson(data!['product'])
          : null,
      hashes: data?['hashes'] != null
          ? HashComparison.fromJson(data!['hashes'])
          : null,
      blockchain: data?['blockchain'] != null
          ? BlockchainData.fromJson(data!['blockchain'])
          : null,
      nfc: data?['nfc'] != null
          ? NfcValidationData.fromJson(data!['nfc'])
          : null,
      ownershipHistory: (data?['ownershipHistory'] as List<dynamic>? ?? [])
          .map((e) => OwnershipHistoryItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class NfcValidationData {
  final String uidFisik;
  final bool hardwareMatched;
  final bool antiClonePassed;

  NfcValidationData({
    required this.uidFisik,
    required this.hardwareMatched,
    required this.antiClonePassed,
  });

  factory NfcValidationData.fromJson(Map<String, dynamic> json) {
    return NfcValidationData(
      uidFisik: json['uid_fisik'] ?? '',
      hardwareMatched: json['hardware_matched'] ?? false,
      antiClonePassed: json['anti_clone_passed'] ?? false,
    );
  }
}

class VerifiedProduct {
  final String idItem;
  final String namaProduk;
  final double harga;
  final String? warna;
  final String? tipeArtikel;
  final String? tanggalProduksi;
  final String status;

  VerifiedProduct({
    required this.idItem,
    required this.namaProduk,
    required this.harga,
    this.warna,
    this.tipeArtikel,
    this.tanggalProduksi,
    required this.status,
  });

  factory VerifiedProduct.fromJson(Map<String, dynamic> json) {
    return VerifiedProduct(
      idItem: json['id_item'] ?? '',
      namaProduk: json['nama_produk'] ?? '',
      harga: ProductItem._parseDouble(json['harga']),
      warna: json['warna'],
      tipeArtikel: json['tipe_artikel'],
      tanggalProduksi: json['tanggal_produksi']?.toString(),
      status: json['status'] ?? '',
    );
  }
}

class HashComparison {
  final String? storedHash;
  final String? recomputedHash;
  final String? onChainHash;
  final bool match;

  HashComparison({
    this.storedHash,
    this.recomputedHash,
    this.onChainHash,
    required this.match,
  });

  factory HashComparison.fromJson(Map<String, dynamic> json) {
    return HashComparison(
      storedHash: json['stored_hash'],
      recomputedHash: json['recomputed_hash'],
      onChainHash: json['on_chain_hash'],
      match: json['match'] ?? false,
    );
  }
}

class BlockchainData {
  final String tokenId;
  final String metadataHash;
  final String currentOwner;
  final String mintedBy;
  final String mintedAt;

  BlockchainData({
    required this.tokenId,
    required this.metadataHash,
    required this.currentOwner,
    required this.mintedBy,
    required this.mintedAt,
  });

  factory BlockchainData.fromJson(Map<String, dynamic> json) {
    return BlockchainData(
      tokenId: json['tokenId']?.toString() ?? '',
      metadataHash: json['metadataHash'] ?? '',
      currentOwner: json['currentOwner'] ?? '',
      mintedBy: json['mintedBy'] ?? '',
      mintedAt: json['mintedAt'] ?? '',
    );
  }
}
