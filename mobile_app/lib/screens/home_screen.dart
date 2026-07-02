import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';
import '../services/wallet_service.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch ownership data on first load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AppProvider>(context, listen: false).fetchOwnership();
    });
  }

  Future<void> _onRefresh() async {
    await Provider.of<AppProvider>(context, listen: false).fetchOwnership();
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

  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        final owned = provider.ownedItems;
        final transferred = provider.transferredItems;
        final stats = provider.stats;

        return Scaffold(
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: _onRefresh,
              color: AppTheme.colors(context).accent,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ─── Header ───
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('SELAMAT DATANG /', style: TextStyle(fontSize: 11, color: AppTheme.colors(context).mutedForeground, letterSpacing: 1)),
                            const SizedBox(height: 2),
                            Text(
                              provider.displayName?.toUpperCase() ?? 'USER',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.colors(context).foreground),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => provider.toggleTheme(),
                              icon: Icon(
                                provider.isDarkMode ? Icons.light_mode : Icons.dark_mode,
                                color: AppTheme.colors(context).mutedForeground,
                              ),
                            ),
                            const SizedBox(width: 4),
                            GestureDetector(
                              onTap: () => Navigator.pushNamed(context, '/profile'),
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: AppTheme.colors(context).accent,
                                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                                  border: Border.all(
                                    color: AppTheme.colors(context).gold.withAlpha(100),
                                    width: 1.5,
                                  ),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusMd - 1.5),
                                  child: provider.consumer?.fotoProfile != null &&
                                          provider.consumer!.fotoProfile!.isNotEmpty
                                      ? Image.network(
                                          ApiService().getImageUrl(provider.consumer!.fotoProfile!),
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return const Icon(Icons.person_outline, size: 20, color: Colors.white);
                                          },
                                          loadingBuilder: (context, child, loadingProgress) {
                                            if (loadingProgress == null) return child;
                                            return Center(
                                              child: SizedBox(
                                                width: 14,
                                                height: 14,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 1.5,
                                                  valueColor: AlwaysStoppedAnimation<Color>(
                                                    AppTheme.colors(context).gold,
                                                  ),
                                                ),
                                              ),
                                            );
                                          },
                                        )
                                      : const Icon(Icons.person_outline, size: 20, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // ─── Wallet Card ───
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
                          Text('WALLET ADDRESS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.colors(context).mutedForeground, letterSpacing: 1)),
                          const SizedBox(height: 4),
                          Text(
                            provider.truncatedAddress,
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, fontFamily: 'RobotoMono', color: AppTheme.colors(context).foreground),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _statChip('NFT DIMILIKI', '${stats?.totalOwned ?? 0}'),
                              const SizedBox(width: 12),
                              _statChip('TOTAL TX', '${stats?.totalTransactions ?? 0}'),
                              const SizedBox(width: 12),
                              _statChip('SEPOLIA', '✓'),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ─── Scan Button ───
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pushNamed(context, '/scan'),
                        icon: const Icon(Icons.qr_code_scanner, size: 20),
                        label: const Text('SCAN PRODUK', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // ─── Loading state ───
                    if (provider.isLoading)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: CircularProgressIndicator(color: AppTheme.colors(context).accent),
                        ),
                      ),

                    // ─── Error state ───
                    if (provider.error != null && !provider.isLoading)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppTheme.colors(context).warningBg,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          border: Border.all(color: AppTheme.colors(context).warning.withAlpha(51)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.wifi_off, size: 18, color: AppTheme.colors(context).warning),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                provider.error!,
                                style: TextStyle(fontSize: 12, color: AppTheme.colors(context).warning),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // ─── Koleksi Saya ───
                    if (!provider.isLoading) ...[
                      Text('KOLEKSI SAYA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground, letterSpacing: 1)),
                      Text('${owned.length} item', style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
                      const SizedBox(height: 12),

                      if (owned.isEmpty)
                        _emptyState('Belum ada NFT', 'Scan QR produk untuk memulai klaim kepemilikan.')
                      else
                        ...owned.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _collectionItem(
                            item.namaProduk,
                            item.tipeArtikel ?? WalletService.truncateAddress(item.idItem),
                            item.statusKepemilikan == 'active' ? 'OWNED' : 'TRANSFERRED',
                            item.gambarUrl,
                            item.txHash,
                          ),
                        )),

                      const SizedBox(height: 28),

                      // ─── Transaksi Terbaru ───
                      Text('TRANSAKSI TERBARU', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground, letterSpacing: 1)),
                      const SizedBox(height: 12),

                      if (owned.isEmpty && transferred.isEmpty)
                        _emptyState('Belum ada transaksi', 'Riwayat klaim dan transfer akan muncul di sini.')
                      else ...[
                        // Show all owned as "Claim" transactions
                        ...owned.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _txItem(
                            item.namaProduk,
                            item.idItem,
                            'Claim',
                            _formatDate(item.tanggalKlaim),
                            item.gambarUrl,
                            item.txHash,
                          ),
                        )),
                        // Show all transferred as "Transfer" transactions
                        ...transferred.map((item) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _txItem(
                            item.namaProduk,
                            item.idItem,
                            'Transfer',
                            _formatDate(item.tanggalKlaim),
                            item.gambarUrl,
                            item.txHash,
                          ),
                        )),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ─── Helpers ───

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '—';
    try {
      final date = DateTime.parse(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr;
    }
  }

  Widget _emptyState(String title, String subtitle) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
      decoration: BoxDecoration(
        color: AppTheme.colors(context).muted,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Column(
        children: [
          Icon(Icons.inventory_2_outlined, size: 32, color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
          const SizedBox(height: 10),
          Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
          const SizedBox(height: 4),
          Text(subtitle, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
        ],
      ),
    );
  }

  Widget _statChip(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: AppTheme.colors(context).muted,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.colors(context).foreground)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w500, color: AppTheme.colors(context).mutedForeground, letterSpacing: 0.5)),
          ],
        ),
      ),
    );
  }

  Widget _collectionItem(String name, String brand, String status, [String? gambarUrl, String? txHash]) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.colors(context).card,
        border: Border.all(color: AppTheme.colors(context).border),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.colors(context).muted,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            clipBehavior: Clip.hardEdge,
            child: gambarUrl != null && gambarUrl.isNotEmpty
                ? Image.network(
                    ApiService().getImageUrl(gambarUrl),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Icon(Icons.shopping_bag_outlined, size: 20, color: AppTheme.colors(context).mutedForeground),
                  )
                : Icon(Icons.shopping_bag_outlined, size: 20, color: AppTheme.colors(context).mutedForeground),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(brand, style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
                    if (txHash != null && txHash.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      Text('·', style: TextStyle(color: AppTheme.colors(context).mutedForeground)),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () => _launchEtherscan(txHash),
                        child: Row(
                          children: [
                            Text(
                              'Tx: ${WalletService.truncateAddress(txHash)}',
                              style: TextStyle(
                                fontSize: 11,
                                fontFamily: 'RobotoMono',
                                color: AppTheme.colors(context).gold,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Icon(Icons.open_in_new, size: 10, color: AppTheme.colors(context).gold),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.colors(context).successBg,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(status, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.colors(context).success)),
          ),
        ],
      ),
    );
  }

  Widget _txItem(String name, String itemId, String type, String date, [String? gambarUrl, String? txHash]) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.colors(context).card,
        border: Border.all(color: AppTheme.colors(context).border),
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: type == 'Claim' ? AppTheme.colors(context).infoBg : AppTheme.colors(context).successBg,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            clipBehavior: Clip.hardEdge,
            child: gambarUrl != null && gambarUrl.isNotEmpty
                ? Image.network(
                    ApiService().getImageUrl(gambarUrl),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Icon(
                      type == 'Claim' ? Icons.download_outlined : Icons.swap_horiz,
                      size: 18,
                      color: type == 'Claim' ? AppTheme.colors(context).info : AppTheme.colors(context).success,
                    ),
                  )
                : Icon(
                    type == 'Claim' ? Icons.download_outlined : Icons.swap_horiz,
                    size: 18,
                    color: type == 'Claim' ? AppTheme.colors(context).info : AppTheme.colors(context).success,
                  ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      WalletService.truncateAddress(itemId),
                      style: TextStyle(fontSize: 11, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground),
                    ),
                    if (txHash != null && txHash.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Text('·', style: TextStyle(color: AppTheme.colors(context).mutedForeground)),
                      const SizedBox(width: 6),
                      GestureDetector(
                        onTap: () => _launchEtherscan(txHash),
                        child: Row(
                          children: [
                            Text(
                              'Etherscan',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.colors(context).gold,
                              ),
                            ),
                            const SizedBox(width: 2),
                            Icon(Icons.open_in_new, size: 10, color: AppTheme.colors(context).gold),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: type == 'Claim' ? AppTheme.colors(context).infoBg : AppTheme.colors(context).successBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(type, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: type == 'Claim' ? AppTheme.colors(context).info : AppTheme.colors(context).success)),
              ),
              const SizedBox(height: 4),
              Text(date, style: TextStyle(fontSize: 10, color: AppTheme.colors(context).mutedForeground)),
            ],
          ),
        ],
      ),
    );
  }
}
