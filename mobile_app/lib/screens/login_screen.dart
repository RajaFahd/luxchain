import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';
import '../services/wallet_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _walletController = TextEditingController();
  final _privateKeyController = TextEditingController();
  bool _obscurePrivateKey = true;
  bool _isConnecting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _walletController.dispose();
    _privateKeyController.dispose();
    super.dispose();
  }

  Future<void> _connectWallet() async {
    final address = _walletController.text.trim();
    final privateKey = _privateKeyController.text.trim();

    if (address.isEmpty) {
      setState(() => _errorMessage = 'Masukkan wallet address.');
      return;
    }

    if (!WalletService.isValidAddress(address)) {
      setState(() => _errorMessage = 'Format tidak valid. Harus dimulai 0x diikuti 40 karakter hex.');
      return;
    }

    if (privateKey.isEmpty) {
      setState(() => _errorMessage = 'Masukkan private key untuk menandatangani transaksi.');
      return;
    }

    final cleanPk = privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey;
    if (cleanPk.length != 64 || !RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(cleanPk)) {
      setState(() => _errorMessage = 'Format private key tidak valid (harus 64 karakter hex).');
      return;
    }

    setState(() {
      _isConnecting = true;
      _errorMessage = null;
    });

    final provider = Provider.of<AppProvider>(context, listen: false);
    final success = await provider.connectWallet(address, privateKey: privateKey);

    if (!mounted) return;

    if (success) {
      Navigator.pushReplacementNamed(context, '/home');
    } else {
      setState(() {
        _isConnecting = false;
        _errorMessage = provider.error ?? 'Gagal menghubungkan wallet.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 60),

              // Logo
              Text(
                'LUXCHAIN',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.colors(context).foreground,
                  letterSpacing: 4,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'VERIFY · OWN · TRANSFER',
                style: TextStyle(
                  fontSize: 11,
                  color: AppTheme.colors(context).mutedForeground,
                  letterSpacing: 2,
                ),
              ),

              const SizedBox(height: 48),

              // Wallet icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.colors(context).muted,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                ),
                child: Icon(Icons.account_balance_wallet_outlined, size: 28, color: AppTheme.colors(context).accent),
              ),
              const SizedBox(height: 16),

              Text(
                'Connect Your Wallet',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.colors(context).foreground,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Masukkan alamat wallet Ethereum Anda\nuntuk mulai memverifikasi produk.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: AppTheme.colors(context).mutedForeground, height: 1.5),
              ),

              const SizedBox(height: 32),

              // Alamat Wallet Label
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
                  child: Text(
                    'ALAMAT WALLET ETHEREUM',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.colors(context).foreground.withAlpha(200),
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),

              // Wallet address input
              TextField(
                controller: _walletController,
                decoration: InputDecoration(
                  hintText: '0x...',
                  hintStyle: TextStyle(
                    color: AppTheme.colors(context).mutedForeground.withAlpha(128),
                    fontFamily: 'RobotoMono',
                    fontSize: 14,
                  ),
                  prefixIcon: const Icon(Icons.wallet, size: 20),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).accent, width: 1.5),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).destructive),
                  ),
                  filled: true,
                  fillColor: AppTheme.colors(context).card,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                style: TextStyle(fontFamily: 'RobotoMono', fontSize: 14, color: AppTheme.colors(context).foreground),
                autocorrect: false,
                enableSuggestions: false,
              ),

              const SizedBox(height: 20),

              // Private Key Label
              Align(
                alignment: Alignment.centerLeft,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
                  child: Text(
                    'PRIVATE KEY WALLET',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.colors(context).foreground.withAlpha(200),
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),

              // Private Key Input
              TextField(
                controller: _privateKeyController,
                obscureText: _obscurePrivateKey,
                decoration: InputDecoration(
                  hintText: 'Masukkan 64 karakter hex...',
                  hintStyle: TextStyle(
                    color: AppTheme.colors(context).mutedForeground.withAlpha(128),
                    fontFamily: 'RobotoMono',
                    fontSize: 14,
                  ),
                  prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePrivateKey ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      size: 20,
                      color: AppTheme.colors(context).mutedForeground,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePrivateKey = !_obscurePrivateKey;
                      });
                    },
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).accent, width: 1.5),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    borderSide: BorderSide(color: AppTheme.colors(context).destructive),
                  ),
                  filled: true,
                  fillColor: AppTheme.colors(context).card,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                style: TextStyle(fontFamily: 'RobotoMono', fontSize: 14, color: AppTheme.colors(context).foreground),
                autocorrect: false,
                enableSuggestions: false,
              ),

              const SizedBox(height: 8),

              // Security Disclaimer Note
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.security_outlined,
                      size: 14,
                      color: AppTheme.colors(context).gold.withAlpha(200),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Private key disimpan aman secara lokal di perangkat Anda hanya untuk menandatangani transaksi blockchain.',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.colors(context).mutedForeground,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Error message
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.colors(context).destructiveBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, size: 16, color: AppTheme.colors(context).destructive),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(fontSize: 12, color: AppTheme.colors(context).destructive),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Connect button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isConnecting ? null : _connectWallet,
                  icon: _isConnecting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.link, size: 20),
                  label: Text(
                    _isConnecting ? 'Connecting...' : 'CONNECT WALLET',
                    style: const TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Ethereum Sepolia Network',
                style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground),
              ),

              const SizedBox(height: 48),

              // Features
              _featureRow(Icons.verified_outlined, 'Verifikasi Produk', 'Scan QR untuk cek keaslian'),
              const SizedBox(height: 16),
              _featureRow(Icons.download_outlined, 'Klaim Kepemilikan', 'Klaim NFT dengan kode rahasia'),
              const SizedBox(height: 16),
              _featureRow(Icons.swap_horiz, 'Transfer NFT', 'Transfer ke wallet lain'),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _featureRow(IconData icon, String title, String sub) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.colors(context).muted,
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          child: Icon(icon, size: 20, color: AppTheme.colors(context).accent),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
              Text(sub, style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
            ],
          ),
        ),
      ],
    );
  }
}
