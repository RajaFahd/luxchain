import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';
import '../models/product_item.dart';
import '../services/wallet_service.dart';
import '../services/api_service.dart';

class VerificationResultScreen extends StatefulWidget {
  const VerificationResultScreen({super.key});

  @override
  State<VerificationResultScreen> createState() => _VerificationResultScreenState();
}

class _VerificationResultScreenState extends State<VerificationResultScreen> {
  bool _isLoading = true;
  VerificationResult? _result;
  ProductItem? _itemDetails;
  String? _error;
  String? _uuid;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_uuid == null) {
      // Get UUID from route arguments
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      _uuid = args?['uuid'] as String?;

      if (_uuid != null) {
        _fetchVerification();
      } else {
        setState(() {
          _isLoading = false;
          _error = 'UUID produk tidak ditemukan.';
        });
      }
    }
  }

  Future<void> _fetchVerification() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final provider = Provider.of<AppProvider>(context, listen: false);

    // Fetch both verification and item details in parallel
    final results = await Future.wait([
      provider.verifyProduct(_uuid!),
      provider.getItemDetails(_uuid!),
    ]);

    if (!mounted) return;

    final verifyResult = results[0] as VerificationResult?;
    final itemDetail = results[1] as ProductItem?;

    setState(() {
      _isLoading = false;
      _result = verifyResult;
      _itemDetails = itemDetail;
      if (verifyResult == null && itemDetail == null) {
        _error = 'Produk tidak ditemukan atau server tidak tersedia.';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HASIL VERIFIKASI'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: AppTheme.colors(context).accent))
          : _error != null
              ? _buildError()
              : _buildResult(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 64, color: AppTheme.colors(context).mutedForeground),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: AppTheme.colors(context).foreground)),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('Kembali')),
          ],
        ),
      ),
    );
  }

  Widget _buildResult() {
    final verified = _result?.verified ?? false;
    final product = _result?.product;
    final hashes = _result?.hashes;
    final blockchain = _result?.blockchain;
    final item = _itemDetails;
    final provider = Provider.of<AppProvider>(context, listen: false);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // ─── Status Banner ───
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: verified ? AppTheme.colors(context).successBg : AppTheme.colors(context).destructiveBg,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: (verified ? AppTheme.colors(context).success : AppTheme.colors(context).destructive).withAlpha(51)),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: verified ? AppTheme.colors(context).success : AppTheme.colors(context).destructive,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: Icon(
                    verified ? Icons.verified : Icons.warning_amber,
                    size: 18,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        verified ? 'PRODUK TERVERIFIKASI · BLOCKCHAIN' : 'PRODUK TIDAK TERVERIFIKASI',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: verified ? AppTheme.colors(context).success : AppTheme.colors(context).destructive, letterSpacing: 0.5),
                      ),
                      Text(
                        _result?.status ?? 'UNKNOWN',
                        style: TextStyle(fontSize: 10, color: (verified ? AppTheme.colors(context).success : AppTheme.colors(context).destructive).withAlpha(179)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Product Info Card ───
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.colors(context).card,
              border: Border.all(color: AppTheme.colors(context).border),
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppTheme.colors(context).muted,
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                      ),
                      clipBehavior: Clip.hardEdge,
                      child: item?.gambarUrl != null && item!.gambarUrl!.isNotEmpty
                          ? Image.network(
                              ApiService().getImageUrl(item.gambarUrl),
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Icon(Icons.shopping_bag_outlined, size: 24, color: AppTheme.colors(context).mutedForeground),
                            )
                          : Icon(Icons.shopping_bag_outlined, size: 24, color: AppTheme.colors(context).mutedForeground),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product?.namaProduk ?? item?.namaProduk ?? 'Unknown',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground),
                          ),
                          Text(
                            'TOKEN #${blockchain?.tokenId ?? '—'}',
                            style: TextStyle(fontSize: 12, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground),
                          ),
                          if (blockchain != null)
                            Text(
                              'owner: ${WalletService.truncateAddress(blockchain.currentOwner)}',
                              style: TextStyle(fontSize: 11, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Metadata grid
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.colors(context).muted,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          _metaCell('ARTIKEL', product?.tipeArtikel ?? item?.tipeArtikel ?? '—'),
                          _metaCell('WARNA', product?.warna ?? item?.warna ?? '—'),
                          _metaCell('STATUS', product?.status ?? item?.status ?? '—'),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _metaCell('HARGA', 'Rp ${_formatPrice(product?.harga ?? item?.harga ?? 0)}'),
                          _metaCell('PRODUKSI', _formatDateShort(product?.tanggalProduksi ?? item?.tanggalProduksi)),
                          _metaCell('HASH', hashes?.match == true ? '✓ Match' : '✗ Mismatch'),
                        ],
                      ),
                    ],
                  ),
                ),

                if (_uuid != null) ...[
                  const SizedBox(height: 14),
                  Text('PRODUCT UUID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.colors(context).mutedForeground, letterSpacing: 0.5)),
                  const SizedBox(height: 4),
                  Text(
                    _uuid!,
                    style: TextStyle(fontSize: 11, fontFamily: 'RobotoMono', color: AppTheme.colors(context).foreground),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ─── Network Info ───
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.colors(context).card,
              border: Border.all(color: AppTheme.colors(context).border),
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
            ),
            child: Column(
              children: [
                if (blockchain != null) ...[
                  _infoRow('Minted By', WalletService.truncateAddress(blockchain.mintedBy)),
                  const SizedBox(height: 8),
                  _infoRow('Current Owner', WalletService.truncateAddress(blockchain.currentOwner)),
                  const SizedBox(height: 8),
                ],
                _infoRow('Network', 'Ethereum Sepolia'),
                const SizedBox(height: 8),
                _infoRow('Blockchain', blockchain != null ? 'On-chain ✓' : 'Offline mode'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ─── Warning ───
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.colors(context).warningBg,
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(color: AppTheme.colors(context).warning.withAlpha(51)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber, size: 18, color: AppTheme.colors(context).warning),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Pastikan produk ini adalah barang yang Anda beli. Klaim kepemilikan bersifat permanen di blockchain.',
                    style: TextStyle(fontSize: 12, color: AppTheme.colors(context).warning, height: 1.5),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Timeline / Riwayat Kepemilikan Button ───
          if (_result?.ownershipHistory != null && _result!.ownershipHistory.isNotEmpty) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: () => _showOwnershipHistoryBottomSheet(context),
                icon: Icon(Icons.history, color: AppTheme.colors(context).gold, size: 20),
                label: const Text('RIWAYAT KEPEMILIKAN', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
          const SizedBox(height: 20),

          // ─── Action Buttons ───
          if (verified) ...[
            () {
              final userWallet = provider.walletAddress?.toLowerCase();
              final isClaimed = item?.isClaimed ?? false;

              // Determine current owner
              String? currentOwnerWallet;
              if (blockchain != null &&
                  blockchain.currentOwner.isNotEmpty &&
                  blockchain.currentOwner != '0x0000000000000000000000000000000000000000') {
                currentOwnerWallet = blockchain.currentOwner.toLowerCase();
              } else if (_result?.ownershipHistory != null && _result!.ownershipHistory.isNotEmpty) {
                final activeRecords = _result!.ownershipHistory.where((e) => e.statusKepemilikan == 'active').toList();
                if (activeRecords.isNotEmpty) {
                  currentOwnerWallet = activeRecords.last.walletAddress.toLowerCase();
                }
              }

              final showClaim = !isClaimed || currentOwnerWallet == null;
              final showTransfer = isClaimed && currentOwnerWallet == userWallet;
              final showWarning = isClaimed && currentOwnerWallet != null && currentOwnerWallet != userWallet;

              if (showClaim) {
                return SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(
                      context,
                      '/claim',
                      arguments: {
                        'uuid': _uuid,
                        'product_name': product?.namaProduk ?? item?.namaProduk ?? 'Unknown',
                        'token_id': blockchain?.tokenId,
                        'gambar_url': item?.gambarUrl,
                      },
                    ),
                    child: const Text('KLAIM KEPEMILIKAN', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                );
              } else if (showTransfer) {
                return SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushNamed(
                      context,
                      '/transfer',
                      arguments: {
                        'uuid': _uuid,
                        'product_name': product?.namaProduk ?? item?.namaProduk ?? 'Unknown',
                        'from_wallet': provider.walletAddress,
                        'gambar_url': item?.gambarUrl,
                      },
                    ),
                    child: const Text('TRANSFER KEPEMILIKAN', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                );
              } else if (showWarning) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppTheme.colors(context).destructiveBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(color: AppTheme.colors(context).destructive.withAlpha(51), width: 1),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.lock_outline, color: AppTheme.colors(context).destructive, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'PRODUK SUDAH DIKLAIM',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.colors(context).destructive,
                              letterSpacing: 1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Produk ini telah terdaftar atas kepemilikan kolektor lain secara permanen di blockchain.',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.5,
                          color: AppTheme.colors(context).destructive.withAlpha(204),
                        ),
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            }(),
          ],
        ],
      ),
    );
  }

  // ─── Helpers ───

  String _formatPrice(double price) {
    if (price == 0) return '—';
    final str = price.toStringAsFixed(0);
    final buf = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buf.write('.');
      buf.write(str[i]);
    }
    return buf.toString();
  }

  String _formatDateShort(String? dateStr) {
    if (dateStr == null) return '—';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.year}-${date.month.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr.length > 7 ? dateStr.substring(0, 7) : dateStr;
    }
  }

  Widget _metaCell(String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppTheme.colors(context).mutedForeground, letterSpacing: 0.5)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: AppTheme.colors(context).mutedForeground)),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: 'RobotoMono', color: AppTheme.colors(context).foreground)),
      ],
    );
  }

  String _formatClaimDate(String? dateStr) {
    if (dateStr == null) return '—';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return '${date.day} ${months[date.month - 1]} ${date.year}, ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return dateStr;
    }
  }

  Future<void> _launchEtherscan(String txHash) async {
    final url = Uri.parse('https://sepolia.etherscan.io/tx/$txHash');
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        // Fallback: try to launch directly anyway in case canLaunchUrl is overly restrictive
        try {
          await launchUrl(url, mode: LaunchMode.externalApplication);
        } catch (_) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Tidak dapat membuka link Etherscan.'),
                backgroundColor: AppTheme.colors(context).destructive,
              ),
            );
          }
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Error saat membuka link Etherscan.'),
            backgroundColor: AppTheme.colors(context).destructive,
          ),
        );
      }
    }
  }

  void _showOwnershipHistoryBottomSheet(BuildContext context) {
    final history = _result?.ownershipHistory ?? [];
    if (history.isEmpty) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.colors(context).card,
      isScrollControlled: true,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppTheme.radiusXl)),
        side: BorderSide(color: AppTheme.colors(context).border, width: 1),
      ),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.75,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Pull Bar
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12, bottom: 20),
                decoration: BoxDecoration(
                  color: AppTheme.colors(context).gold.withAlpha(80),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Title
              Row(
                children: [
                  Icon(Icons.history, color: AppTheme.colors(context).gold, size: 24),
                  const SizedBox(width: 12),
                  Text(
                    'RIWAYAT KEPEMILIKAN',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.5,
                      color: AppTheme.colors(context).foreground,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Urutan kepemilikan item ini dari pertama kali diklaim hingga kepemilikan aktif saat ini.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.colors(context).mutedForeground,
                    height: 1.4,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // List of History
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.only(bottom: 32),
                  child: ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: history.length,
                    itemBuilder: (context, index) {
                      final item = history[index];
                      final isLast = index == history.length - 1;

                      return IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Left indicator (vertical line + dot)
                            Column(
                              children: [
                                Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    color: item.statusKepemilikan == 'active'
                                        ? AppTheme.colors(context).gold
                                        : Colors.transparent,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: AppTheme.colors(context).gold,
                                      width: 2,
                                    ),
                                    boxShadow: item.statusKepemilikan == 'active'
                                        ? [
                                            BoxShadow(
                                              color: AppTheme.colors(context).gold.withAlpha(100),
                                              blurRadius: 8,
                                              spreadRadius: 2,
                                            )
                                          ]
                                        : null,
                                  ),
                                  child: item.statusKepemilikan == 'active'
                                      ? Icon(
                                          Icons.check,
                                          size: 12,
                                          color: AppTheme.colors(context).background,
                                        )
                                      : null,
                                ),
                                if (!isLast)
                                  Expanded(
                                    child: Container(
                                      width: 2,
                                      color: AppTheme.colors(context).gold.withAlpha(50),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(width: 16),
                            // Right content
                            Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(bottom: isLast ? 0 : 24.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          item.statusKepemilikan == 'active'
                                              ? 'PEMILIK AKTIF'
                                              : 'DITRANSFER (HISTORIS)',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w700,
                                            color: item.statusKepemilikan == 'active'
                                                ? AppTheme.colors(context).gold
                                                : AppTheme.colors(context).mutedForeground,
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                        if (item.statusKepemilikan == 'active') ...[
                                          const SizedBox(width: 8),
                                          Container(
                                            width: 6,
                                            height: 6,
                                            decoration: BoxDecoration(
                                              color: AppTheme.colors(context).success,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item.namaDisplay?.toUpperCase() ?? 'KOLEKTOR',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.colors(context).foreground,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      WalletService.truncateAddress(item.walletAddress),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontFamily: 'RobotoMono',
                                        color: AppTheme.colors(context).mutedForeground,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Tanggal: ${_formatClaimDate(item.tanggalKlaim)}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: AppTheme.colors(context).mutedForeground.withAlpha(180),
                                      ),
                                    ),
                                    if (item.txHash != null && item.txHash!.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      GestureDetector(
                                        onTap: () => _launchEtherscan(item.txHash!),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: AppTheme.colors(context).gold.withAlpha(20),
                                            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                                            border: Border.all(
                                              color: AppTheme.colors(context).gold.withAlpha(80),
                                              width: 0.5,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                Icons.verified_user_outlined,
                                                size: 12,
                                                color: AppTheme.colors(context).gold,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Cek Transaksi di Etherscan',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppTheme.colors(context).gold,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              Icon(
                                                Icons.open_in_new,
                                                size: 10,
                                                color: AppTheme.colors(context).gold,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
