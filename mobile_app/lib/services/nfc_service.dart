import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:nfc_manager/nfc_manager.dart';

/// Result data holder from a dual NFC scan
class NfcDualScanResult {
  final String hash; // Text payload from NDEF record
  final String uidFisik; // Hardware factory UID
  final Map<String, dynamic> rawTagData;

  NfcDualScanResult({
    required this.hash,
    required this.uidFisik,
    required this.rawTagData,
  });
}

class NfcService {
  static final NfcService _instance = NfcService._internal();
  factory NfcService() => _instance;
  NfcService._internal();

  /// Check if device supports NFC and NFC is turned on
  Future<bool> isNfcAvailable() async {
    try {
      return await NfcManager.instance.isAvailable();
    } catch (e) {
      debugPrint('Error checking NFC availability: $e');
      return false;
    }
  }

  /// Convert byte array to hexadecimal string (e.g. 04:a2:3b:4f:c1:80:2a)
  String formatBytesToHex(List<int> bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join(':');
  }

  /// Extract physical factory hardware UID from NFC tag across all platforms
  String? extractPhysicalUid(NfcTag tag) {
    final data = tag.data;

    // Keys where identifier is stored in nfc_manager across Android & iOS
    const possibleKeys = [
      'nfca',
      'mifareultralight',
      'mifareclassic',
      'isodep',
      'nfcb',
      'nfcf',
      'nfcv',
      'mifare',
      'iso7816',
      'iso15693',
    ];

    for (final key in possibleKeys) {
      if (data.containsKey(key) && data[key] is Map) {
        final subMap = data[key] as Map;
        if (subMap['identifier'] != null) {
          final id = subMap['identifier'];
          if (id is List<int>) {
            return formatBytesToHex(id);
          } else if (id is Uint8List) {
            return formatBytesToHex(id.toList());
          }
        }
      }
    }

    return null;
  }

  /// Extract text payload (hash blockchain) from NDEF records
  String? extractNdefText(NfcTag tag) {
    try {
      final ndef = Ndef.from(tag);
      if (ndef == null || ndef.cachedMessage == null) {
        // Check raw tag data fallback
        if (tag.data.containsKey('ndef') && tag.data['ndef'] is Map) {
          final ndefMap = tag.data['ndef'] as Map;
          if (ndefMap['cachedMessage'] != null && ndefMap['cachedMessage']['records'] != null) {
            final records = ndefMap['cachedMessage']['records'] as List;
            for (final r in records) {
              if (r is Map && r['payload'] != null) {
                final payload = r['payload'];
                final bytes = payload is Uint8List ? payload.toList() : (payload as List<int>);
                final text = _decodeTextPayload(bytes);
                if (text != null && text.isNotEmpty) return text;
              }
            }
          }
        }
        return null;
      }

      for (final record in ndef.cachedMessage!.records) {
        final text = _decodeTextPayload(record.payload);
        if (text != null && text.isNotEmpty) {
          return text;
        }
      }
    } catch (e) {
      debugPrint('Error extracting NDEF text: $e');
    }
    return null;
  }

  /// Decode standard NDEF Text Record payload bytes
  String? _decodeTextPayload(List<int> payload) {
    if (payload.isEmpty) return null;

    try {
      // Byte 0: status byte (bit 7: 0=UTF-8, 1=UTF-16; bits 5-0: lang code length)
      final statusByte = payload[0];
      final isUtf16 = (statusByte & 0x80) != 0;
      final langLength = statusByte & 0x3F;

      if (payload.length > 1 + langLength) {
        final textBytes = payload.sublist(1 + langLength);
        if (!isUtf16) {
          final decoded = utf8.decode(textBytes, allowMalformed: true).trim();
          if (decoded.isNotEmpty) return decoded;
        }
      }

      // Fallback: decode direct UTF-8
      final directDecoded = utf8.decode(payload, allowMalformed: true).trim();
      // If it contains non-printable characters at start, strip them
      final clean = directDecoded.replaceAll(RegExp(r'^[\x00-\x1F]+'), '').trim();
      return clean.isNotEmpty ? clean : null;
    } catch (e) {
      debugPrint('Error decoding text payload: $e');
      return null;
    }
  }

  /// Start a dual scan session that extracts BOTH NDEF payload and hardware UID
  Future<void> startDualScanSession({
    required Function(NfcDualScanResult result) onDiscovered,
    required Function(String error) onError,
  }) async {
    final available = await isNfcAvailable();
    if (!available) {
      onError('NFC tidak tersedia atau tidak diaktifkan pada perangkat ini.');
      return;
    }

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            // 1. Ekstrak UID fisik perangkat keras bawaan pabrik
            final uidFisik = extractPhysicalUid(tag);

            // 2. Ekstrak payload teks dari memori NDEF (hash produk)
            final hash = extractNdefText(tag);

            if (uidFisik == null || uidFisik.isEmpty) {
              onError('Tidak dapat membaca UID fisik cip NFC. Pastikan menggunakan cip yang kompatibel.');
              return;
            }

            if (hash == null || hash.isEmpty) {
              onError('Cip NFC tidak memiliki sertifikat digital LuxChain (NDEF Text kosong).');
              return;
            }

            // Successfully extracted BOTH values in 1 single tap!
            onDiscovered(NfcDualScanResult(
              hash: hash,
              uidFisik: uidFisik,
              rawTagData: tag.data,
            ));
          } catch (e) {
            onError('Gagal memproses data cip NFC: ${e.toString()}');
          }
        },
        onError: (NfcError error) async {
          onError('Error pemindaian NFC: ${error.message}');
        },
      );
    } catch (e) {
      onError('Tidak dapat memulai sesi pemindaian NFC: ${e.toString()}');
    }
  }

  /// Stop current active NFC session
  Future<void> stopSession() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {}
  }
}
