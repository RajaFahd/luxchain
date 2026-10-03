// ============================================================
// App Provider — Global State Management (ChangeNotifier)
// ============================================================
// Holds wallet state, owned items, and provides actions
// for login, fetch data, claim, transfer, etc.
// ============================================================

import 'dart:io';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/wallet_service.dart';
import '../models/ownership.dart';
import '../models/product_item.dart';

class AppProvider extends ChangeNotifier {
  static const String _themeKey = 'luxchain_is_dark_mode';

  final ApiService _api = ApiService();
  final WalletService _wallet = WalletService();

  // ─── State ───
  String? _walletAddress;
  String? _privateKey;
  String? _displayName;
  OwnershipResponse? _ownership;
  bool _isLoading = false;
  String? _error;
  ThemeMode _themeMode;

  AppProvider({ThemeMode initialThemeMode = ThemeMode.light})
      : _themeMode = initialThemeMode {
    _loadThemeMode();
  }

  Future<void> _loadThemeMode() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isDark = prefs.getBool(_themeKey);
      if (isDark != null) {
        final loadedMode = isDark ? ThemeMode.dark : ThemeMode.light;
        if (_themeMode != loadedMode) {
          _themeMode = loadedMode;
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  // ─── Getters ───
  String? get walletAddress => _walletAddress;
  String? get privateKey => _privateKey;
  String? get displayName => _displayName;
  OwnershipResponse? get ownership => _ownership;
  List<OwnershipRecord> get ownedItems => _ownership?.owned ?? [];
  List<OwnershipRecord> get transferredItems => _ownership?.transferred ?? [];
  OwnershipStats? get stats => _ownership?.stats;
  ConsumerProfile? get consumer => _ownership?.consumer;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _walletAddress != null && _walletAddress!.isNotEmpty;
  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  String get truncatedAddress =>
      _walletAddress != null ? WalletService.truncateAddress(_walletAddress!) : '';

  // ═════════════════════════════════════════════════════════════
  //  THEME & UI
  // ═════════════════════════════════════════════════════════════
  Future<void> toggleTheme() async {
    _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_themeKey, _themeMode == ThemeMode.dark);
    } catch (_) {}
  }

  // ═════════════════════════════════════════════════════════════
  //  AUTH / WALLET
  // ═════════════════════════════════════════════════════════════

  /// Try to restore saved wallet on app start
  Future<bool> tryAutoLogin() async {
    final saved = await _wallet.getWallet();
    if (saved != null && saved.isNotEmpty) {
      _walletAddress = saved;
      _privateKey = await _wallet.getPrivateKey();
      _displayName = await _wallet.getDisplayName();
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Connect wallet (manual input with verification)
  Future<bool> connectWallet(String address, {required String privateKey}) async {
    if (!WalletService.isValidAddress(address)) {
      _error = 'Format wallet address tidak valid (harus 0x + 40 hex chars).';
      notifyListeners();
      return false;
    }

    final pk = privateKey.trim();
    if (pk.isEmpty) {
      _error = 'Private key wajib diisi.';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final verification = await _api.verifyWallet(
        walletAddress: address,
        privateKey: pk,
      );

      if (verification['success'] != true) {
        _error = verification['message'] ?? 'Private key tidak valid atau tidak cocok dengan alamat wallet.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      // If valid, save locally and update state
      _walletAddress = address.toLowerCase();
      _displayName = 'User_${address.substring(0, 8)}';
      _privateKey = pk;

      await _wallet.saveWallet(_walletAddress!);
      await _wallet.saveDisplayName(_displayName!);
      await _wallet.savePrivateKey(_privateKey!);

      _error = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Gagal memverifikasi wallet ke server: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Disconnect wallet (logout)
  Future<void> disconnectWallet() async {
    await _wallet.clearWallet();
    _walletAddress = null;
    _privateKey = null;
    _displayName = null;
    _ownership = null;
    _error = null;
    notifyListeners();
  }

  // ═════════════════════════════════════════════════════════════
  //  OWNERSHIP DATA
  // ═════════════════════════════════════════════════════════════

  /// Fetch owned items + stats from API
  Future<void> fetchOwnership() async {
    if (_walletAddress == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.getOwnership(_walletAddress!);

      if (res['success'] == true) {
        _ownership = OwnershipResponse.fromJson(res);

        // Update display name from consumer profile if available
        if (_ownership?.consumer?.namaDisplay != null) {
          _displayName = _ownership!.consumer!.namaDisplay;
          await _wallet.saveDisplayName(_displayName!);
        }
      } else {
        _error = res['message'] ?? 'Gagal memuat data kepemilikan.';
      }
    } catch (e) {
      _error = 'Gagal terhubung ke server: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  ITEM VERIFICATION
  // ═════════════════════════════════════════════════════════════

  /// Verify product by UUID (from QR scan)
  Future<VerificationResult?> verifyProduct(String uuid) async {
    try {
      final res = await _api.verifyItem(uuid);
      if (res['success'] == true) {
        return VerificationResult.fromJson(res);
      }
      return null;
    } catch (e) {
      _error = 'Error verifikasi: ${e.toString()}';
      return null;
    }
  }

  /// Verify product by NFC (dual scan: hash + uidFisik)
  Future<VerificationResult?> verifyProductNfc({
    required String hash,
    required String uidFisik,
  }) async {
    try {
      final res = await _api.verifyNfc(hash: hash, uidFisik: uidFisik);
      return VerificationResult.fromJson(res);
    } catch (e) {
      _error = 'Error verifikasi NFC: ${e.toString()}';
      return null;
    }
  }

  /// Get item details by UUID
  Future<ProductItem?> getItemDetails(String uuid) async {
    try {
      final res = await _api.getItemByUUID(uuid);
      if (res['success'] == true && res['data']?['item'] != null) {
        return ProductItem.fromJson(res['data']['item']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  CLAIM & TRANSFER
  // ═════════════════════════════════════════════════════════════

  /// Claim product ownership with secret code
  Future<Map<String, dynamic>> claimProduct({
    required String idItem,
    required String secretCode,
  }) async {
    if (_walletAddress == null) {
      return {'success': false, 'message': 'Wallet belum terhubung.'};
    }

    final res = await _api.claimProduct(
      idItem: idItem,
      walletAddress: _walletAddress!,
      secretCode: secretCode,
      privateKey: _privateKey,
    );

    // Refresh ownership data after successful claim
    if (res['success'] == true) {
      await fetchOwnership();
    }

    return res;
  }

  /// Transfer product to another wallet
  Future<Map<String, dynamic>> transferProduct({
    required String idItem,
    required String toWallet,
  }) async {
    if (_walletAddress == null) {
      return {'success': false, 'message': 'Wallet belum terhubung.'};
    }

    final res = await _api.transferProduct(
      idItem: idItem,
      fromWallet: _walletAddress!,
      toWallet: toWallet,
      privateKey: _privateKey,
    );

    // Refresh ownership data after successful transfer
    if (res['success'] == true) {
      await fetchOwnership();
    }

    return res;
  }

  /// Update display name via API & sync local state
  Future<bool> updateDisplayName(String newName) async {
    if (_walletAddress == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.updateDisplayName(_walletAddress!, newName);

      if (res['success'] == true) {
        _displayName = newName;
        await _wallet.saveDisplayName(newName);
        // Refresh ownership to update consumer profile datasets
        await fetchOwnership();
        _error = null;
        return true;
      } else {
        _error = res['message'] ?? 'Gagal memperbarui nama display.';
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update profile picture via API & sync local state
  Future<bool> updateProfilePicture(File imageFile) async {
    if (_walletAddress == null) return false;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _api.uploadProfilePicture(_walletAddress!, imageFile);

      if (res['success'] == true) {
        // Refresh ownership to update consumer profile datasets
        await fetchOwnership();
        _error = null;
        return true;
      } else {
        _error = res['message'] ?? 'Gagal mengunggah foto profil.';
        return false;
      }
    } catch (e) {
      _error = 'Error: ${e.toString()}';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
