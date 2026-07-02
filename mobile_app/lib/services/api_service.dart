import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ApiService {
  // Base URL is resolved dynamically based on platform:
  // - Android Emulator: 10.0.2.2:3001
  // - Web / Windows Desktop / Other: localhost:3001
  static String get _baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3001/api';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://192.168.18.244:3001/api';
        // return 'http://192.168.137.1:3001/api';
        // return 'http://172.20.10.2:3001/api';
        // return 'http://10.0.2.2:3001/api';
      }
    } catch (_) {}
    return 'http://localhost:3001/api';
  }

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String get baseUrl => _baseUrl;

  /// Helper to get full image URL from relative path
  String getImageUrl(String? path) {
    if (path == null || path.isEmpty) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    final cleanBase = _baseUrl.replaceAll('/api', '').replaceAll(RegExp(r'/$'), '');
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return '$cleanBase$cleanPath';
  }

  // ─── Generic HTTP helpers ───

  Map<String, String> _headers() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  Future<Map<String, dynamic>> _handleResponse(http.Response response) async {
    try {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      return body;
    } catch (e) {
      return {
        'success': false,
        'message': 'Failed to parse response: ${e.toString()}',
      };
    }
  }

  // ─── GET request ───
  Future<Map<String, dynamic>> get(String endpoint,
      {Map<String, String>? queryParams}) async {
    try {
      final uri = Uri.parse('$_baseUrl$endpoint').replace(
        queryParameters: queryParams,
      );
      final response = await http
          .get(uri, headers: _headers())
          .timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } on SocketException {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    } on http.ClientException {
      return {'success': false, 'message': 'Koneksi gagal.'};
    } catch (e) {
      return {'success': false, 'message': 'Error: ${e.toString()}'};
    }
  }

  // ─── POST request ───
  Future<Map<String, dynamic>> post(String endpoint,
      {Map<String, dynamic>? body}) async {
    try {
      final uri = Uri.parse('$_baseUrl$endpoint');
      final response = await http
          .post(uri, headers: _headers(), body: jsonEncode(body ?? {}))
          .timeout(const Duration(seconds: 45));
      return _handleResponse(response);
    } on SocketException {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    } on http.ClientException {
      return {'success': false, 'message': 'Koneksi gagal.'};
    } catch (e) {
      return {'success': false, 'message': 'Error: ${e.toString()}'};
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  ITEM ENDPOINTS (Public — no auth required)
  // ═════════════════════════════════════════════════════════════

  /// GET /api/items/:uuid — Get item details by UUID (QR scan result)
  Future<Map<String, dynamic>> getItemByUUID(String uuid) async {
    return get('/items/$uuid');
  }

  /// POST /api/items/:uuid/verify — Cross-check with blockchain
  Future<Map<String, dynamic>> verifyItem(String uuid) async {
    return post('/items/$uuid/verify');
  }

  // ═════════════════════════════════════════════════════════════
  //  OWNERSHIP ENDPOINTS (Public — consumer actions)
  // ═════════════════════════════════════════════════════════════

  /// GET /api/ownership/:wallet — Get all products owned by wallet
  Future<Map<String, dynamic>> getOwnership(String walletAddress) async {
    return get('/ownership/$walletAddress');
  }

  /// POST /api/ownership/claim — Claim product ownership
  /// Requires: id_item, wallet_address, secret_code
  Future<Map<String, dynamic>> claimProduct({
    required String idItem,
    required String walletAddress,
    required String secretCode,
    String? txHash,
    String? privateKey,
  }) async {
    final body = <String, dynamic>{
      'id_item': idItem,
      'wallet_address': walletAddress,
      'secret_code': secretCode,
    };
    if (txHash != null) body['tx_hash'] = txHash;
    if (privateKey != null) body['private_key'] = privateKey;
    return post('/ownership/claim', body: body);
  }

  /// POST /api/ownership/transfer — Transfer ownership to new wallet
  /// Requires: id_item, from_wallet, to_wallet
  Future<Map<String, dynamic>> transferProduct({
    required String idItem,
    required String fromWallet,
    required String toWallet,
    String? txHash,
    String? privateKey,
  }) async {
    final body = <String, dynamic>{
      'id_item': idItem,
      'from_wallet': fromWallet,
      'to_wallet': toWallet,
    };
    if (txHash != null) body['tx_hash'] = txHash;
    if (privateKey != null) body['private_key'] = privateKey;
    return post('/ownership/transfer', body: body);
  }

  // ═════════════════════════════════════════════════════════════
  //  TRANSACTION ENDPOINTS (Public read)
  // ═════════════════════════════════════════════════════════════

  /// GET /api/transactions — List all transactions (with optional filters)
  Future<Map<String, dynamic>> getTransactions({
    String? search,
    String? type,
    int? page,
    int? limit,
  }) async {
    final params = <String, String>{};
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (type != null && type.isNotEmpty) params['type'] = type;
    if (page != null) params['page'] = page.toString();
    if (limit != null) params['limit'] = limit.toString();

    return get('/transactions', queryParams: params.isNotEmpty ? params : null);
  }

  /// POST /api/customers/verify-wallet — Verify that the private key matches the wallet address
  Future<Map<String, dynamic>> verifyWallet({
    required String walletAddress,
    required String privateKey,
  }) async {
    return post('/customers/verify-wallet', body: {
      'wallet_address': walletAddress,
      'private_key': privateKey,
    });
  }

  /// POST /api/customers/update — Update customer display name
  Future<Map<String, dynamic>> updateDisplayName(
      String walletAddress, String namaDisplay) async {
    return post('/customers/update', body: {
      'wallet_address': walletAddress,
      'nama_display': namaDisplay,
    });
  }

  /// POST /api/customers/update-avatar — Upload customer's profile photo
  Future<Map<String, dynamic>> uploadProfilePicture(
      String walletAddress, File imageFile) async {
    try {
      final uri = Uri.parse('$_baseUrl/customers/update-avatar');
      final request = http.MultipartRequest('POST', uri);

      request.fields['wallet_address'] = walletAddress;

      final pathStr = imageFile.path;
      final fileName = pathStr.split('/').last;
      String ext = pathStr.split('.').last.toLowerCase();
      if (ext != 'png' && ext != 'jpg' && ext != 'jpeg' && ext != 'webp') {
        ext = 'jpeg'; // Default fallback
      }
      final subType = ext == 'jpg' ? 'jpeg' : ext;

      request.files.add(
        await http.MultipartFile.fromPath(
          'foto_profile',
          pathStr,
          filename: fileName.contains('.') ? fileName : '$fileName.$ext',
          contentType: MediaType('image', subType),
        ),
      );

      final streamedResponse =
          await request.send().timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } on SocketException {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    } on http.ClientException {
      return {'success': false, 'message': 'Koneksi gagal.'};
    } catch (e) {
      return {'success': false, 'message': 'Error: ${e.toString()}'};
    }
  }
}
