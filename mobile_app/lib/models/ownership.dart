// ============================================================
// Ownership Model — Matches API response from /api/ownership/:wallet
// ============================================================

/// Helper to parse dynamic values to double
double _parseDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is double) return value;
  if (value is int) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}

/// Single ownership record (from kepemilikan table join)
class OwnershipRecord {
  final int idKepemilikan;
  final String idItem;
  final String walletAddress;
  final String? tanggalKlaim;
  final String statusKepemilikan;  // 'active' | 'transferred'
  final String? txHash;
  final String? createdAt;

  // Joined product data
  final String? hashBlockchain;
  final String? itemStatus;
  final String namaProduk;
  final double harga;
  final String? warna;
  final String? tipeArtikel;
  final String? tanggalProduksi;
  final String? gambarUrl;

  OwnershipRecord({
    required this.idKepemilikan,
    required this.idItem,
    required this.walletAddress,
    this.tanggalKlaim,
    required this.statusKepemilikan,
    this.txHash,
    this.createdAt,
    this.hashBlockchain,
    this.itemStatus,
    required this.namaProduk,
    required this.harga,
    this.warna,
    this.tipeArtikel,
    this.tanggalProduksi,
    this.gambarUrl,
  });

  factory OwnershipRecord.fromJson(Map<String, dynamic> json) {
    return OwnershipRecord(
      idKepemilikan: json['id_kepemilikan'] ?? 0,
      idItem: json['id_item'] ?? '',
      walletAddress: json['wallet_address'] ?? '',
      tanggalKlaim: json['tanggal_klaim']?.toString(),
      statusKepemilikan: json['status_kepemilikan'] ?? 'active',
      txHash: json['tx_hash'],
      createdAt: json['created_at']?.toString(),
      hashBlockchain: json['hash_blockchain'],
      itemStatus: json['item_status'],
      namaProduk: json['nama_produk'] ?? 'Unknown',
      harga: _parseDouble(json['harga']),
      warna: json['warna'],
      tipeArtikel: json['tipe_artikel'],
      tanggalProduksi: json['tanggal_produksi']?.toString(),
      gambarUrl: json['gambar_url'],
    );
  }

  /// Truncated item ID for display
  String get truncatedItemId {
    if (idItem.length <= 12) return idItem;
    return '${idItem.substring(0, 8)}...';
  }
}

/// Consumer profile from konsumen table
class ConsumerProfile {
  final String walletAddress;
  final String? namaDisplay;
  final String? joinDate;
  final String? fotoProfile;

  ConsumerProfile({
    required this.walletAddress,
    this.namaDisplay,
    this.joinDate,
    this.fotoProfile,
  });

  factory ConsumerProfile.fromJson(Map<String, dynamic> json) {
    return ConsumerProfile(
      walletAddress: json['wallet_address'] ?? '',
      namaDisplay: json['nama_display'],
      joinDate: json['join_date']?.toString(),
      fotoProfile: json['foto_profile'],
    );
  }
}

/// Ownership stats from API response
class OwnershipStats {
  final int totalOwned;
  final int totalTransferred;
  final int totalTransactions;

  OwnershipStats({
    required this.totalOwned,
    required this.totalTransferred,
    required this.totalTransactions,
  });

  factory OwnershipStats.fromJson(Map<String, dynamic> json) {
    return OwnershipStats(
      totalOwned: json['total_owned'] ?? 0,
      totalTransferred: json['total_transferred'] ?? 0,
      totalTransactions: json['total_transactions'] ?? 0,
    );
  }
}

/// Full ownership response from GET /api/ownership/:wallet
class OwnershipResponse {
  final ConsumerProfile? consumer;
  final List<OwnershipRecord> owned;
  final List<OwnershipRecord> transferred;
  final OwnershipStats stats;

  OwnershipResponse({
    this.consumer,
    required this.owned,
    required this.transferred,
    required this.stats,
  });

  factory OwnershipResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? json;

    return OwnershipResponse(
      consumer: data['consumer'] != null
          ? ConsumerProfile.fromJson(data['consumer'])
          : null,
      owned: (data['owned'] as List<dynamic>? ?? [])
          .map((e) => OwnershipRecord.fromJson(e as Map<String, dynamic>))
          .toList(),
      transferred: (data['transferred'] as List<dynamic>? ?? [])
          .map((e) => OwnershipRecord.fromJson(e as Map<String, dynamic>))
          .toList(),
      stats: data['stats'] != null
          ? OwnershipStats.fromJson(data['stats'])
          : OwnershipStats(
              totalOwned: 0, totalTransferred: 0, totalTransactions: 0),
    );
  }
}
