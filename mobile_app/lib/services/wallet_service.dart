// ============================================================
// Wallet Service — SharedPreferences Storage
// ============================================================
// Manages wallet address persistence across app sessions.
// Consumer "logs in" by entering their wallet address.
// ============================================================

import 'package:shared_preferences/shared_preferences.dart';

class WalletService {
  static const String _walletKey = 'luxchain_wallet_address';
  static const String _displayNameKey = 'luxchain_display_name';

  static const String _privateKeyKey = 'luxchain_private_key';

  // Singleton
  static final WalletService _instance = WalletService._internal();
  factory WalletService() => _instance;
  WalletService._internal();

  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // ─── Wallet address ───

  /// Save wallet address to local storage
  Future<void> saveWallet(String address) async {
    final prefs = await _getPrefs();
    await prefs.setString(_walletKey, address.toLowerCase());
  }

  /// Get saved wallet address (null if not logged in)
  Future<String?> getWallet() async {
    final prefs = await _getPrefs();
    return prefs.getString(_walletKey);
  }

  // ─── Private key ───

  /// Save private key to local storage
  Future<void> savePrivateKey(String privateKey) async {
    final prefs = await _getPrefs();
    await prefs.setString(_privateKeyKey, privateKey.trim());
  }

  /// Get saved private key (null if not set)
  Future<String?> getPrivateKey() async {
    final prefs = await _getPrefs();
    return prefs.getString(_privateKeyKey);
  }

  /// Check if user has a saved wallet (= is "logged in")
  Future<bool> isLoggedIn() async {
    final wallet = await getWallet();
    return wallet != null && wallet.isNotEmpty;
  }

  /// Clear wallet (logout / disconnect)
  Future<void> clearWallet() async {
    final prefs = await _getPrefs();
    await prefs.remove(_walletKey);
    await prefs.remove(_displayNameKey);
    await prefs.remove(_privateKeyKey);
  }

  // ─── Display name ───

  Future<void> saveDisplayName(String name) async {
    final prefs = await _getPrefs();
    await prefs.setString(_displayNameKey, name);
  }

  Future<String?> getDisplayName() async {
    final prefs = await _getPrefs();
    return prefs.getString(_displayNameKey);
  }

  // ─── Helpers ───

  /// Validate Ethereum wallet address format (0x + 40 hex chars).
  ///
  /// Note: Di Ethereum, semua address yang match format ini secara teknis
  /// valid — address dibuat secara offline dari private key. Tidak ada cara
  /// untuk "verify" apakah address punya saldo/aktivitas tanpa query blockchain.
  /// Validasi ini memastikan format benar untuk mencegah typo.
  static bool isValidAddress(String address) {
    // Must start with 0x and be exactly 42 chars (0x + 40 hex)
    if (!RegExp(r'^0x[a-fA-F0-9]{40}$').hasMatch(address)) {
      return false;
    }

    // Reject obvious dummy/test addresses
    final lower = address.toLowerCase();
    if (lower == '0x${'0' * 40}') return false; // all zeros
    if (lower == '0x${'f' * 40}') return false; // all f's
    if (lower == '0x${'dead' * 10}') return false; // dead address

    return true;
  }

  /// Truncate address for display: 0xAbCd...eF12
  static String truncateAddress(String address) {
    if (address.length < 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }
}
