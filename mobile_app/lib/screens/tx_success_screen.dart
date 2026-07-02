import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';
import '../services/wallet_service.dart';

class TxSuccessScreen extends StatefulWidget {
  const TxSuccessScreen({super.key});

  @override
  State<TxSuccessScreen> createState() => _TxSuccessScreenState();
}

class _TxSuccessScreenState extends State<TxSuccessScreen> {
  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>? ?? {};
    final type = args['type'] as String? ?? 'claim';
    final productName = args['product_name'] as String? ?? 'Produk';
    final tokenId = args['token_id'] as String?;
    final wallet = args['wallet'] as String?;
    final toWallet = args['to_wallet'] as String?;
    final fromWallet = args['from_wallet'] as String?;
    final message = args['message'] as String? ?? 'Operasi berhasil!';
    final txHash = args['tx_hash'] as String?;

    final isClaim = type == 'claim';

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Success icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.colors(context).successBg,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.check_circle, size: 48, color: AppTheme.colors(context).success),
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                isClaim ? 'KLAIM BERHASIL!' : 'TRANSFER BERHASIL!',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.colors(context).foreground, letterSpacing: 1),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: AppTheme.colors(context).mutedForeground, height: 1.5),
              ),
              const SizedBox(height: 32),

              // Transaction summary
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.colors(context).card,
                  border: Border.all(color: AppTheme.colors(context).border),
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                ),
                child: Column(
                  children: [
                    _summaryRow('Produk', productName),
                    if (tokenId != null) ...[
                      const SizedBox(height: 10),
                      _summaryRow('Token ID', '#$tokenId'),
                    ],
                    if (isClaim && wallet != null) ...[
                      const SizedBox(height: 10),
                      _summaryRow('Wallet', WalletService.truncateAddress(wallet)),
                    ],
                    if (!isClaim) ...[
                      if (fromWallet != null) ...[
                        const SizedBox(height: 10),
                        _summaryRow('Dari', WalletService.truncateAddress(fromWallet)),
                      ],
                      if (toWallet != null) ...[
                        const SizedBox(height: 10),
                        _summaryRow('Ke', WalletService.truncateAddress(toWallet)),
                      ],
                    ],
                    const SizedBox(height: 10),
                    _summaryRow('Status', 'Berhasil ✓'),
                    const SizedBox(height: 10),
                    _summaryRow('Network', 'Ethereum Sepolia'),
                    if (txHash != null && txHash.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _summaryRow('Tx Hash', WalletService.truncateAddress(txHash)),
                    ],
                  ],
                ),
              ),

              const Spacer(),

              // Etherscan verify button if tx_hash exists
              if (txHash != null && txHash.isNotEmpty) ...[
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse('https://sepolia.etherscan.io/tx/$txHash');
                      try {
                        if (await canLaunchUrl(url)) {
                          await launchUrl(url, mode: LaunchMode.externalApplication);
                        } else {
                          // Fallback: try to launch directly anyway in case canLaunchUrl is overly restrictive
                          try {
                            await launchUrl(url, mode: LaunchMode.externalApplication);
                          } catch (_) {
                            if (context.mounted) {
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
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Error saat membuka link Etherscan.'),
                              backgroundColor: AppTheme.colors(context).destructive,
                            ),
                          );
                        }
                      }
                    },
                    icon: Icon(Icons.verified_user_outlined, color: AppTheme.colors(context).gold, size: 20),
                    label: const Text('LIHAT DI SEPOLIA ETHERSCAN', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Back to home button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false),
                  icon: const Icon(Icons.home_outlined, size: 20),
                  label: const Text('KEMBALI KE HOME', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: AppTheme.colors(context).mutedForeground)),
        Flexible(
          child: Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
