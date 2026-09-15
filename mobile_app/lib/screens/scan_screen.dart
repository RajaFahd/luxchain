import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme/app_theme.dart';
import '../services/nfc_service.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _isQrMode = true;
  bool _hasScanned = false;
  MobileScannerController? _cameraController;

  // NFC Scanner State
  final NfcService _nfcService = NfcService();
  bool _isNfcListening = false;
  String _nfcMessage = 'Siap memindai. Tempelkan bagian belakang ponsel ke cip NFC produk.';
  String? _nfcError;
  bool _isNfcProcessing = false;

  @override
  void initState() {
    super.initState();
    _cameraController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _stopNfc();
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_hasScanned) return; // Prevent double scan

    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    final scannedValue = barcode.rawValue!.trim();
    if (scannedValue.isEmpty) return;

    setState(() => _hasScanned = true);

    // Navigate to verification with the scanned UUID
    Navigator.pushNamed(
      context,
      '/verification',
      arguments: {'uuid': scannedValue},
    ).then((_) {
      if (mounted) {
        setState(() => _hasScanned = false);
      }
    });
  }

  // ─── Dual NFC Scanner Logic ───
  Future<void> _startNfc() async {
    final available = await _nfcService.isNfcAvailable();
    if (!available) {
      setState(() {
        _isNfcListening = false;
        _nfcError = 'NFC tidak aktif atau tidak didukung pada perangkat ini.';
      });
      return;
    }

    setState(() {
      _isNfcListening = true;
      _isNfcProcessing = false;
      _nfcError = null;
      _nfcMessage = 'Mendengarkan cip... Dekatkan bagian belakang ponsel ke tag NFC produk.';
    });

    await _nfcService.startDualScanSession(
      onDiscovered: (NfcDualScanResult result) {
        if (_hasScanned || _isNfcProcessing) return;

        setState(() {
          _isNfcProcessing = true;
          _hasScanned = true;
          _nfcMessage = 'Cip terdeteksi! Membaca NDEF & Hardware UID...';
        });

        // Haptic feedback / vibrate if possible
        // Navigate to verification with both parameters extracted in one tap
        Navigator.pushNamed(
          context,
          '/verification',
          arguments: {
            'hash': result.hash,
            'uid_fisik': result.uidFisik,
          },
        ).then((_) {
          if (mounted) {
            setState(() {
              _hasScanned = false;
              _isNfcProcessing = false;
              _nfcMessage = 'Siap memindai cip berikutnya.';
            });
            _startNfc(); // Restart listener for next scan
          }
        });
      },
      onError: (String err) {
        if (mounted) {
          setState(() {
            _isNfcProcessing = false;
            _nfcError = err;
          });
        }
      },
    );
  }

  Future<void> _stopNfc() async {
    await _nfcService.stopSession();
    if (mounted) {
      setState(() {
        _isNfcListening = false;
        _isNfcProcessing = false;
      });
    }
  }

  void _switchMode(bool isQr) {
    if (_isQrMode == isQr) return;

    setState(() {
      _isQrMode = isQr;
      _hasScanned = false;
      _nfcError = null;
    });

    if (!isQr) {
      _startNfc();
    } else {
      _stopNfc();
    }
  }

  // Manual input fallback (for testing without camera or physical NFC)
  void _showManualInput() {
    if (_isQrMode) {
      final controller = TextEditingController();
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Input UUID Manual (QR)'),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: 'Paste UUID produk...',
              hintStyle: TextStyle(color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
            ),
            style: const TextStyle(fontFamily: 'RobotoMono', fontSize: 13),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            TextButton(
              onPressed: () {
                final uuid = controller.text.trim();
                Navigator.pop(ctx);
                if (uuid.isNotEmpty) {
                  Navigator.pushNamed(context, '/verification', arguments: {'uuid': uuid});
                }
              },
              child: const Text('Verifikasi'),
            ),
          ],
        ),
      );
    } else {
      // Manual NFC Dual Input (Hash + UID Fisik)
      final hashController = TextEditingController();
      final uidController = TextEditingController();
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Simulasi Input NFC Ganda'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: hashController,
                decoration: InputDecoration(
                  labelText: 'Hash Sertifikat NDEF',
                  hintText: 'SHA-256 hash...',
                  hintStyle: TextStyle(color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
                ),
                style: const TextStyle(fontFamily: 'RobotoMono', fontSize: 12),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: uidController,
                decoration: InputDecoration(
                  labelText: 'UID Fisik Pabrik',
                  hintText: 'e.g. 04:a2:3b:4f:c1:80:2a',
                  hintStyle: TextStyle(color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
                ),
                style: const TextStyle(fontFamily: 'RobotoMono', fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
            TextButton(
              onPressed: () {
                final hash = hashController.text.trim();
                final uid = uidController.text.trim();
                Navigator.pop(ctx);
                if (hash.isNotEmpty && uid.isNotEmpty) {
                  Navigator.pushNamed(
                    context,
                    '/verification',
                    arguments: {
                      'hash': hash,
                      'uid_fisik': uid,
                    },
                  );
                }
              },
              child: const Text('Verifikasi NFC'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SCAN QR / NFC'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_note, size: 22),
            tooltip: _isQrMode ? 'Input UUID Manual' : 'Simulasi Input NFC',
            onPressed: _showManualInput,
          ),
        ],
      ),
      body: Column(
        children: [
          // Viewport (Camera or NFC Sensor Visualizer)
          Expanded(
            flex: 3,
            child: Container(
              margin: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.colors(context).muted,
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                border: Border.all(color: AppTheme.colors(context).border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppTheme.radiusLg - 1),
                child: _isQrMode
                    ? Stack(
                        alignment: Alignment.center,
                        children: [
                          // Live camera feed
                          MobileScanner(
                            controller: _cameraController!,
                            onDetect: _onBarcodeDetected,
                          ),
                          // Scan frame overlay
                          Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: CustomPaint(
                              painter: _ScanFramePainter(),
                            ),
                          ),
                          // Scanned indicator
                          if (_hasScanned)
                            Container(
                              color: Colors.black54,
                              child: Center(
                                child: Icon(Icons.check_circle, size: 64, color: AppTheme.colors(context).success),
                              ),
                            ),
                          // Instructions
                          Positioned(
                            bottom: 24,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Arahkan kamera ke QR Code',
                                style: TextStyle(fontSize: 13, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      )
                    : // NFC Mode Active Visualizer
                    Container(
                        color: AppTheme.colors(context).card,
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Pulsing radar icon
                            Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isNfcProcessing
                                    ? AppTheme.colors(context).success.withAlpha(40)
                                    : AppTheme.colors(context).accent.withAlpha(25),
                                border: Border.all(
                                  color: _isNfcProcessing
                                      ? AppTheme.colors(context).success
                                      : AppTheme.colors(context).accent,
                                  width: 2,
                                ),
                              ),
                              child: Center(
                                child: _isNfcProcessing
                                    ? CircularProgressIndicator(color: AppTheme.colors(context).success)
                                    : Icon(
                                        Icons.nfc,
                                        size: 54,
                                        color: AppTheme.colors(context).accent,
                                      ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            Text(
                              _isNfcProcessing
                                  ? 'MEMBACA DATA CIP...'
                                  : (_isNfcListening ? 'PEMINDAI NFC GANDA AKTIF' : 'PEMINDAI NFC SIAP'),
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0,
                                color: AppTheme.colors(context).foreground,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _nfcMessage,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.colors(context).mutedForeground,
                                height: 1.4,
                              ),
                            ),
                            if (_nfcError != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: AppTheme.colors(context).destructiveBg,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _nfcError!,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.colors(context).destructive,
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            Text(
                              'Ekstraksi 1x Tap: NDEF Hash Sertifikat + Factory Hardware UID',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.colors(context).accent,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
          ),

          // Manual input button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _showManualInput,
                icon: Icon(_isQrMode ? Icons.keyboard : Icons.tune, size: 18),
                label: Text(
                  _isQrMode ? 'INPUT UUID MANUAL' : 'SIMULASI SCAN NFC (INPUT MANUAL)',
                  style: const TextStyle(letterSpacing: 1.2, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // QR / NFC toggle
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _modeCard(Icons.qr_code, 'QR Code', 'Tag digital\nproduk', true),
                const SizedBox(width: 12),
                _modeCard(Icons.nfc, 'NFC Tag', 'Chip tertanam\nproduk (Ganda)', false),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _modeCard(IconData icon, String title, String sub, bool isQr) {
    final isSelected = _isQrMode == isQr;
    return Expanded(
      child: GestureDetector(
        onTap: () => _switchMode(isQr),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.colors(context).foreground : AppTheme.colors(context).card,
            border: Border.all(color: isSelected ? AppTheme.colors(context).foreground : AppTheme.colors(context).border),
            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: isSelected ? AppTheme.colors(context).background : AppTheme.colors(context).foreground),
              const SizedBox(height: 8),
              Text(title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isSelected ? AppTheme.colors(context).background : AppTheme.colors(context).foreground)),
              const SizedBox(height: 4),
              Text(sub, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: isSelected ? AppTheme.colors(context).background.withAlpha(179) : AppTheme.colors(context).mutedForeground)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ScanFramePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const cornerLen = 30.0;

    // Top-left
    canvas.drawLine(Offset.zero, Offset(cornerLen, 0), paint);
    canvas.drawLine(Offset.zero, Offset(0, cornerLen), paint);

    // Top-right
    canvas.drawLine(Offset(size.width, 0), Offset(size.width - cornerLen, 0), paint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, cornerLen), paint);

    // Bottom-left
    canvas.drawLine(Offset(0, size.height), Offset(cornerLen, size.height), paint);
    canvas.drawLine(Offset(0, size.height), Offset(0, size.height - cornerLen), paint);

    // Bottom-right
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width - cornerLen, size.height), paint);
    canvas.drawLine(Offset(size.width, size.height), Offset(size.width, size.height - cornerLen), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
