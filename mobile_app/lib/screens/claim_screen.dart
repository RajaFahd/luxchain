import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';
import '../services/wallet_service.dart';
import '../services/api_service.dart';

class ClaimScreen extends StatefulWidget {
  const ClaimScreen({super.key});

  @override
  State<ClaimScreen> createState() => _ClaimScreenState();
}

class _ClaimScreenState extends State<ClaimScreen> {
  final _secretCodeController = TextEditingController();
  String? _error;

  String? _uuid;
  String? _productName;
  String? _tokenId;
  String? _gambarUrl;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_uuid == null) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      _uuid = args?['uuid'] as String?;
      _productName = args?['product_name'] as String?;
      _tokenId = args?['token_id'] as String?;
      _gambarUrl = args?['gambar_url'] as String?;
    }
  }

  @override
  void dispose() {
    _secretCodeController.dispose();
    super.dispose();
  }

  void _claimProduct() {
    final secretCode = _secretCodeController.text.trim();

    if (secretCode.isEmpty) {
      setState(() => _error = 'Masukkan kode rahasia dari scratch card.');
      return;
    }

    if (_uuid == null) {
      setState(() => _error = 'UUID produk tidak ditemukan.');
      return;
    }

    setState(() => _error = null);

    final provider = Provider.of<AppProvider>(context, listen: false);

    _showConfirmationDialog(
      context: context,
      title: 'KONFIRMASI KLAIM NFT',
      productName: _productName ?? 'Unknown Product',
      destinationWallet: provider.walletAddress ?? 'Unknown Wallet',
      gasFee: '~0.0002 ETH',
      onConfirm: () {
        Navigator.pushNamed(
          context,
          '/processing',
          arguments: {
            'type': 'claim',
            'uuid': _uuid,
            'secret_code': secretCode,
            'product_name': _productName,
            'token_id': _tokenId,
            'gambar_url': _gambarUrl,
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: const Text('KLAIM PRODUK'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Product card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.colors(context).card,
                border: Border.all(color: AppTheme.colors(context).border),
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.colors(context).muted,
                      borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: _gambarUrl != null && _gambarUrl!.isNotEmpty
                      ? Image.network(
                          ApiService().getImageUrl(_gambarUrl),
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
                        Text(_productName ?? 'Unknown Product', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground)),
                        if (_tokenId != null)
                          Text('TOKEN #$_tokenId', style: TextStyle(fontSize: 12, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground)),
                        if (_uuid != null)
                          Text(WalletService.truncateAddress(_uuid!), style: TextStyle(fontSize: 11, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Secret code input
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
                  Text('KODE RAHASIA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground, letterSpacing: 1)),
                  const SizedBox(height: 4),
                  Text('Masukkan kode dari scratch card produk', style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _secretCodeController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(
                      hintText: 'Contoh: LUXC-XXXX-XXXX',
                      hintStyle: TextStyle(color: AppTheme.colors(context).mutedForeground.withAlpha(128), fontSize: 14),
                      prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                    ),
                    style: TextStyle(fontFamily: 'RobotoMono', fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: 2, color: AppTheme.colors(context).foreground),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Transaction details
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
                  _detailRow('Ke Wallet Anda', provider.truncatedAddress),
                  _divider(),
                  _detailRow('Network', 'Ethereum Sepolia'),
                  _divider(),
                  _detailRow('Gas Fee', '~0.0002 ETH'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Warning
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
                      'Klaim kepemilikan bersifat permanen. Pastikan Anda adalah pembeli sah dari produk ini.',
                      style: TextStyle(fontSize: 12, color: AppTheme.colors(context).warning, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),

            // Error message
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.colors(context).destructiveBg,
                  borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                ),
                child: Row(
                  children: [
                    Icon(Icons.error_outline, size: 16, color: AppTheme.colors(context).destructive),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: TextStyle(fontSize: 12, color: AppTheme.colors(context).destructive))),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),

            // Confirm button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _claimProduct,
                icon: const Icon(Icons.check, size: 20),
                label: const Text(
                  '✓ KONFIRMASI KLAIM',
                  style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: AppTheme.colors(context).mutedForeground)),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, fontFamily: 'RobotoMono', color: AppTheme.colors(context).foreground)),
        ],
      ),
    );
  }

  Widget _divider() {
    return Divider(color: AppTheme.colors(context).border, height: 1);
  }

  void _showConfirmationDialog({
    required BuildContext context,
    required String title,
    required String productName,
    required String destinationWallet,
    required String gasFee,
    required VoidCallback onConfirm,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext context) {
        final theme = AppTheme.colors(context);
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Container(
            decoration: BoxDecoration(
              color: theme.card,
              borderRadius: BorderRadius.circular(AppTheme.radiusLg),
              border: Border.all(color: theme.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(128),
                  blurRadius: 15,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Icon(Icons.security, color: theme.accent, size: 24),
                    const SizedBox(width: 10),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: theme.foreground,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Divider(color: theme.border, height: 1),
                const SizedBox(height: 16),
                
                // Warning text
                Text(
                  'Konfirmasi detail transaksi di bawah ini. Transaksi blockchain bersifat final dan tidak dapat dibatalkan.',
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.mutedForeground,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),
                
                // Information details
                _dialogRow(context, 'Produk', productName, isBold: true),
                const SizedBox(height: 10),
                _dialogRow(context, 'Penerima (Ke Wallet)', destinationWallet, isMono: true),
                const SizedBox(height: 10),
                _dialogRow(context, 'Estimasi Gas Fee', gasFee, isAccent: true),
                
                const SizedBox(height: 24),
                Divider(color: theme.border, height: 1),
                const SizedBox(height: 20),
                
                // Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: theme.border),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          ),
                        ),
                        onPressed: () => Navigator.pop(context),
                        child: Text(
                          'BATAL',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: theme.foreground,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.accent,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                          ),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          onConfirm();
                        },
                        child: const Text(
                          'KONFIRMASI',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _dialogRow(BuildContext context, String label, String value, {bool isMono = false, bool isBold = false, bool isAccent = false}) {
    final theme = AppTheme.colors(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: theme.mutedForeground,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            fontFamily: isMono ? 'RobotoMono' : null,
            color: isAccent ? theme.accent : theme.foreground,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
