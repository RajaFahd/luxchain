import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = CurvedAnimation(parent: _fadeController, curve: Curves.easeIn);
    _fadeController.forward();

    // Check for saved wallet after splash animation
    _checkAutoLogin();
  }

  Future<void> _checkAutoLogin() async {
    // Wait for splash to display
    await Future.delayed(const Duration(milliseconds: 1200));

    if (!mounted) return;

    final provider = Provider.of<AppProvider>(context, listen: false);
    final hasWallet = await provider.tryAutoLogin();

    if (!mounted) return;

    if (hasWallet) {
      // Auto-login: go straight to home
      Navigator.pushReplacementNamed(context, '/home');
    }
    // Otherwise stay on splash, user taps "MULAI" to go to login
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
            child: Column(
              children: [
                const Spacer(flex: 2),

                // Shield icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppTheme.colors(context).accent,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                  ),
                  child: const Icon(
                    Icons.shield_outlined,
                    size: 40,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),

                // Title
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
                  'FASHION · BLOCKCHAIN · VERIFY',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.colors(context).mutedForeground,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 32),

                // Description
                Text(
                  'Verifikasi keaslian produk fashion mewah menggunakan teknologi blockchain yang terpercaya.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.colors(context).mutedForeground,
                    height: 1.6,
                  ),
                ),

                const Spacer(flex: 3),

                // CTA Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('MULAI', style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.w600)),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward, size: 18),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
