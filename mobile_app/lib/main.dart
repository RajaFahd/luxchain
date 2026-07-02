import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'providers/app_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/scan_screen.dart';
import 'screens/verification_result_screen.dart';
import 'screens/claim_screen.dart';
import 'screens/transfer_screen.dart';
import 'screens/tx_success_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/transaction_processing_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const LuxchainApp());
}

class LuxchainApp extends StatelessWidget {
  const LuxchainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppProvider(),
      child: Consumer<AppProvider>(
        builder: (context, provider, child) {
          // Dynamically adjust status bar icon/brightness matching the theme mode
          SystemChrome.setSystemUIOverlayStyle(
            SystemUiOverlayStyle(
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: provider.isDarkMode ? Brightness.light : Brightness.dark,
              statusBarBrightness: provider.isDarkMode ? Brightness.dark : Brightness.light,
              systemNavigationBarColor: provider.isDarkMode ? const Color(0xFF0A0A0F) : const Color(0xFFFAF8F4),
              systemNavigationBarIconBrightness: provider.isDarkMode ? Brightness.light : Brightness.dark,
            ),
          );

          return MaterialApp(
            title: 'Luxchain',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme(),
            darkTheme: AppTheme.darkTheme(),
            themeMode: provider.themeMode,
            initialRoute: '/',
            routes: {
              '/': (context) => const SplashScreen(),
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const HomeScreen(),
              '/scan': (context) => const ScanScreen(),
              '/verification': (context) => const VerificationResultScreen(),
              '/claim': (context) => const ClaimScreen(),
              '/transfer': (context) => const TransferScreen(),
              '/tx-success': (context) => const TxSuccessScreen(),
              '/profile': (context) => const ProfileScreen(),
              '/processing': (context) => const TransactionProcessingScreen(),
            },
          );
        },
      ),
    );
  }
}
