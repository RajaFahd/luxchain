import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme/app_theme.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _isQrMode = true;
  bool _hasScanned = false;
  MobileScannerController? _cameraController;

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
    super.dispose();
  }

  void _onBarcodeDetected(BarcodeCapture capture) {
    if (_hasScanned) return; // Prevent double scan

    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    final scannedValue = barcode.rawValue!.trim();

    // Validate it looks like a UUID (basic check)
    if (scannedValue.isEmpty) return;

    setState(() => _hasScanned = true);

    // Navigate to verification with the scanned UUID
    Navigator.pushNamed(
      context,
      '/verification',
      arguments: {'uuid': scannedValue},
    ).then((_) {
      // Reset scan state when coming back
      if (mounted) {
        setState(() => _hasScanned = false);
      }
    });
  }

  // Manual UUID input fallback (for testing without camera)
  void _showManualInput() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Input UUID Manual'),
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
          // Manual input button (for testing)
          IconButton(
            icon: const Icon(Icons.edit_note, size: 22),
            tooltip: 'Input UUID Manual',
            onPressed: _showManualInput,
          ),
        ],
      ),
      body: Column(
        children: [
          // Camera viewport
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
                    : // NFC mode placeholder
                    Stack(
                        alignment: Alignment.center,
                        children: [
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.nfc, size: 64, color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
                              const SizedBox(height: 16),
                              Text(
                                'Tempelkan perangkat ke NFC Tag',
                                style: TextStyle(fontSize: 13, color: AppTheme.colors(context).mutedForeground),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Fitur NFC belum tersedia',
                                style: TextStyle(fontSize: 11, color: AppTheme.colors(context).mutedForeground.withAlpha(128)),
                              ),
                            ],
                          ),
                        ],
                      ),
              ),
            ),
          ),

          // Manual UUID / Scan button area
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _showManualInput,
                icon: const Icon(Icons.keyboard, size: 18),
                label: const Text(
                  'INPUT UUID MANUAL',
                  style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600),
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
                _modeCard(Icons.nfc, 'NFC Tag', 'Chip tertanam\nproduk', false),
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
        onTap: () => setState(() => _isQrMode = isQr),
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
