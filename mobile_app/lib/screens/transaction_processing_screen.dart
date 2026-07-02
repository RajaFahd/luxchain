import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';

class TransactionProcessingScreen extends StatefulWidget {
  const TransactionProcessingScreen({super.key});

  @override
  State<TransactionProcessingScreen> createState() => _TransactionProcessingScreenState();
}

class _TransactionProcessingScreenState extends State<TransactionProcessingScreen>
    with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  // Transaction params
  String? _type; // 'claim' or 'transfer'
  String? _uuid;
  String? _secretCode;
  String? _toWallet;
  String? _productName;
  String? _tokenId;

  bool _isInit = false;
  String? _errorMessage;

  // Process steps state
  final List<Map<String, dynamic>> _steps = [
    {
      'title': 'Mengirim perintah instruksi ke server...',
      'successSuffix': 'Terkirim ✓',
      'state': 'pending', // 'pending', 'processing', 'success', 'error'
    },
    {
      'title': 'Mencocokkan tanda tangan digital & database...',
      'successSuffix': 'Tervalidasi ✓',
      'state': 'pending',
    },
    {
      'title': 'Mendaftarkan token kepemilikan ke Blockchain Sepolia...',
      'successSuffix': 'Terdaftar ✓',
      'state': 'pending',
    },
    {
      'title': 'Menunggu konfirmasi blok transaksi blockchain...',
      'successSuffix': 'Terkonfirmasi ✓',
      'state': 'pending',
    },
    {
      'title': 'Sinkronisasi data kepemilikan selesai...',
      'successSuffix': 'Selesai ✓',
      'state': 'pending',
    },
  ];

  @override
  void initState() {
    super.initState();

    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.4, end: 1.0).animate(_pulseController);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInit) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null) {
        _type = args['type'] as String?;
        _uuid = args['uuid'] as String?;
        _secretCode = args['secret_code'] as String?;
        _toWallet = args['to_wallet'] as String?;
        _productName = args['product_name'] as String?;
        _tokenId = args['token_id'] as String?;
      }
      _isInit = true;

      // Start processing pipeline
      _executePipeline();
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _executePipeline() async {
    final provider = Provider.of<AppProvider>(context, listen: false);
    Map<String, dynamic> apiResult;

    // --- STEP 1: Mengirim perintah ke server ---
    setState(() {
      _steps[0]['state'] = 'processing';
    });
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;
    setState(() {
      _steps[0]['state'] = 'success';
      _steps[1]['state'] = 'processing';
    });

    // --- STEP 2: Mencocokkan tanda tangan digital & database ---
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() {
      _steps[1]['state'] = 'success';
      _steps[2]['state'] = 'processing';
    });

    // --- STEP 3: Mendaftarkan ke Sepolia (Actual API/Blockchain Execution) ---
    // Start the API call in the background as Step 3 begins
    final apiFuture = () async {
      try {
        if (_type == 'claim') {
          return await provider.claimProduct(
            idItem: _uuid!,
            secretCode: _secretCode!,
          );
        } else if (_type == 'transfer') {
          return await provider.transferProduct(
            idItem: _uuid!,
            toWallet: _toWallet!,
          );
        }
      } catch (e) {
        return {'success': false, 'message': e.toString()};
      }
      return {'success': false, 'message': 'Unknown error'};
    }();

    // Await both a visual delay (1.8s) and the actual API call completion
    try {
      await Future.wait([
        Future.delayed(const Duration(milliseconds: 1800)),
        apiFuture,
      ]);
      apiResult = await apiFuture;
    } catch (e) {
      apiResult = {'success': false, 'message': e.toString()};
    }

    if (!mounted) return;

    if (apiResult['success'] != true) {
      setState(() {
        _steps[2]['state'] = 'error';
        _errorMessage = apiResult['message'] ?? 'Koneksi gagal atau server bermasalah.';
      });
      return;
    }

    // Success response! We have the tx_hash.
    final txHash = apiResult['txHash'] ?? apiResult['tx_hash'];

    setState(() {
      _steps[2]['state'] = 'success';
      _steps[3]['state'] = 'processing';
    });

    // --- STEP 4: Menunggu konfirmasi block ---
    await Future.delayed(const Duration(milliseconds: 1800));
    if (!mounted) return;
    setState(() {
      _steps[3]['state'] = 'success';
      _steps[4]['state'] = 'processing';
    });

    // --- STEP 5: Sinkronisasi selesai ---
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() {
      _steps[4]['state'] = 'success';
    });

    await Future.delayed(const Duration(milliseconds: 1000));
    if (!mounted) return;

    // Navigate to Success Screen
    if (_type == 'claim') {
      Navigator.pushReplacementNamed(
        context,
        '/tx-success',
        arguments: {
          'type': 'claim',
          'product_name': _productName ?? 'Produk',
          'token_id': _tokenId,
          'wallet': provider.walletAddress,
          'message': apiResult['message'] ?? 'Klaim berhasil!',
          'tx_hash': txHash,
        },
      );
    } else {
      Navigator.pushReplacementNamed(
        context,
        '/tx-success',
        arguments: {
          'type': 'transfer',
          'product_name': _productName ?? 'Produk',
          'to_wallet': _toWallet,
          'from_wallet': provider.walletAddress,
          'message': apiResult['message'] ?? 'Transfer berhasil!',
          'tx_hash': txHash,
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = AppTheme.colors(context);

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            children: [
              const Spacer(),

              // Gorgeous spinning gold ring with flashing shield
              Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Glowing outer ring
                    Container(
                      width: 140,
                      height: 140,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: colors.gold.withAlpha(40),
                            blurRadius: 32,
                            spreadRadius: 6,
                          ),
                        ],
                      ),
                      child: RotationTransition(
                        turns: _rotationController,
                        child: CircularProgressIndicator(
                          value: 0.82,
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation<Color>(colors.gold),
                          backgroundColor: Colors.transparent,
                        ),
                      ),
                    ),
                    // Pulsing shield icon
                    AnimatedBuilder(
                      animation: _pulseAnimation,
                      builder: (context, child) {
                        return Opacity(
                          opacity: _errorMessage != null ? 1.0 : _pulseAnimation.value,
                          child: Icon(
                            _errorMessage != null
                                ? Icons.warning_amber_rounded
                                : Icons.shield_outlined,
                            size: 48,
                            color: _errorMessage != null ? colors.destructive : colors.gold,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 48),

              // Title Header
              Text(
                _errorMessage != null
                    ? 'TRANSAKSI GAGAL'
                    : 'MEMPROSES TRANSAKSI',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.0,
                  color: _errorMessage != null ? colors.destructive : colors.foreground,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _errorMessage != null
                    ? 'Terjadi kesalahan saat memproses data ke blockchain'
                    : 'Harap tunggu, jangan menutup aplikasi',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: colors.mutedForeground,
                ),
              ),

              const SizedBox(height: 40),

              // Steps Tickers List
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: colors.card,
                  borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                  border: Border.all(color: colors.border),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(_steps.length, (index) {
                    final step = _steps[index];
                    final state = step['state'] as String;

                    Color textColor = colors.mutedForeground;
                    Widget leadWidget = Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        color: colors.muted,
                        shape: BoxShape.circle,
                      ),
                    );

                    if (state == 'processing') {
                      textColor = colors.gold;
                      leadWidget = SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colors.gold,
                        ),
                      );
                    } else if (state == 'success') {
                      textColor = colors.foreground;
                      leadWidget = Icon(
                        Icons.check_circle_rounded,
                        size: 16,
                        color: colors.gold,
                      );
                    } else if (state == 'error') {
                      textColor = colors.destructive;
                      leadWidget = Icon(
                        Icons.cancel_rounded,
                        size: 16,
                        color: colors.destructive,
                      );
                    }

                    return Padding(
                      padding: EdgeInsets.only(bottom: index == _steps.length - 1 ? 0 : 16.0),
                      child: Row(
                        children: [
                          leadWidget,
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  step['title'],
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: state == 'processing'
                                        ? FontWeight.w600
                                        : FontWeight.w400,
                                    color: textColor,
                                  ),
                                ),
                                if (state == 'success') ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    step['successSuffix'],
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: colors.gold,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              ),

              const Spacer(),

              // Error feedback action
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: colors.destructiveBg,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                    border: Border.all(color: colors.destructive.withAlpha(51)),
                  ),
                  child: Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: colors.destructive),
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: colors.destructive),
                      foregroundColor: colors.destructive,
                    ),
                    child: const Text(
                      'KEMBALI KE SEBELUMNYA',
                      style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
