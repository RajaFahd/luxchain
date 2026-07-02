import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/app_provider.dart';
import '../services/wallet_service.dart';
import '../services/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, provider, _) {
        final stats = provider.stats;

        return Scaffold(
          appBar: AppBar(
            title: const Text('PROFIL'),
            centerTitle: true,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.pop(context),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Profile Header with Avatar & Floating camera trigger
                Stack(
                  alignment: Alignment.center,
                  children: [
                    // Outer decorative luxury frame
                    Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.colors(context).gold.withAlpha(128),
                          width: 2,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.colors(context).gold.withAlpha(20),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4.0),
                        child: GestureDetector(
                          onTap: () => _showAvatarSourceBottomSheet(context, provider),
                          child: ClipOval(
                            child: Container(
                              color: AppTheme.colors(context).muted,
                              child: _buildAvatarImage(provider),
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    // Loading overlay
                    if (provider.isLoading)
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                AppTheme.colors(context).gold,
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Camera button trigger
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: () => _showAvatarSourceBottomSheet(context, provider),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.colors(context).gold,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.colors(context).card,
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.2),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.camera_alt_outlined,
                            size: 16,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      provider.displayName?.toUpperCase() ?? 'USER',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.colors(context).foreground),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () => _showEditNameDialog(context, provider),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppTheme.colors(context).gold.withAlpha(26),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.edit,
                          size: 14,
                          color: AppTheme.colors(context).gold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  provider.truncatedAddress,
                  style: TextStyle(fontSize: 13, fontFamily: 'RobotoMono', color: AppTheme.colors(context).mutedForeground),
                ),
                const SizedBox(height: 12),

                // Network Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: AppTheme.colors(context).success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text('ETHEREUM SEPOLIA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 1, color: AppTheme.colors(context).foreground)),
                  ],
                ),
                const SizedBox(height: 32),

                // Stats Grid
                Row(
                  children: [
                    _statCell('NFT DIMILIKI', '${stats?.totalOwned ?? 0}'),
                    _dividerVertical(),
                    _statCell('TOTAL TX', '${stats?.totalTransactions ?? 0}'),
                    _dividerVertical(),
                    _statCell('TRANSFERRED', '${stats?.totalTransferred ?? 0}'),
                  ],
                ),
                const SizedBox(height: 32),

                // Wallet Info
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('INFORMASI WALLET', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground, letterSpacing: 1)),
                ),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: AppTheme.colors(context).card,
                    borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                    border: Border.all(color: AppTheme.colors(context).border),
                  ),
                  child: Column(
                    children: [
                      _settingItem(Icons.account_balance_wallet_outlined, 'Wallet Address', WalletService.truncateAddress(provider.walletAddress ?? '')),
                      _dividerHorizontal(),
                      _settingItem(Icons.language, 'Network', 'Ethereum Sepolia Testnet'),
                      _dividerHorizontal(),
                      _settingItem(Icons.verified_outlined, 'Status', provider.isLoggedIn ? 'Connected' : 'Disconnected'),
                      if (provider.consumer?.joinDate != null) ...[
                        _dividerHorizontal(),
                        _settingItem(Icons.calendar_today_outlined, 'Bergabung', _formatJoinDate(provider.consumer!.joinDate!)),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Disconnect Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () async {
                      // Show confirmation dialog
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Disconnect Wallet?'),
                          content: const Text('Anda akan keluar dari aplikasi. Data kepemilikan tetap aman di blockchain.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              child: Text('Disconnect', style: TextStyle(color: AppTheme.colors(context).destructive)),
                            ),
                          ],
                        ),
                      );

                      if (confirm == true && context.mounted) {
                        await provider.disconnectWallet();
                        if (context.mounted) {
                          Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                        }
                      }
                    },
                    child: const Text('DISCONNECT WALLET', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatJoinDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]} ${date.year}';
    } catch (_) {
      return dateStr;
    }
  }

  Widget _statCell(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppTheme.colors(context).foreground, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.colors(context).foreground)),
        ],
      ),
    );
  }

  Widget _dividerVertical() {
    return Container(
      height: 40,
      width: 1,
      color: AppTheme.colors(context).border,
    );
  }

  Widget _dividerHorizontal() {
    return Divider(color: AppTheme.colors(context).border, height: 1);
  }

  Widget _settingItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppTheme.colors(context).muted,
              borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            ),
            child: Icon(icon, size: 20, color: AppTheme.colors(context).foreground),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppTheme.colors(context).foreground)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: AppTheme.colors(context).mutedForeground)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showEditNameDialog(BuildContext context, AppProvider provider) {
    final controller = TextEditingController(text: provider.displayName);
    bool isSaving = false;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: AppTheme.colors(ctx).card,
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppTheme.radiusLg),
                side: BorderSide(color: AppTheme.colors(ctx).border),
              ),
              title: Text(
                'EDIT NAMA DISPLAY',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                  color: AppTheme.colors(ctx).foreground,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Masukkan nama panggilan baru Anda.',
                    style: TextStyle(fontSize: 12, color: AppTheme.colors(ctx).mutedForeground),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: controller,
                    decoration: const InputDecoration(
                      hintText: 'Nama Baru...',
                      prefixIcon: Icon(Icons.person_outline, size: 20),
                    ),
                    style: TextStyle(fontSize: 14, color: AppTheme.colors(ctx).foreground),
                    maxLength: 30,
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isSaving ? null : () => Navigator.pop(ctx),
                  child: Text(
                    'BATAL',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.colors(ctx).mutedForeground),
                  ),
                ),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final name = controller.text.trim();
                          if (name.isEmpty) return;

                          setDialogState(() => isSaving = true);
                          final success = await provider.updateDisplayName(name);
                          if (ctx.mounted) {
                            Navigator.pop(ctx);
                            if (!success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(provider.error ?? 'Gagal memperbarui nama.'),
                                  backgroundColor: AppTheme.colors(context).destructive,
                                ),
                              );
                            }
                          }
                        },
                  child: isSaving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('SIMPAN'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildAvatarImage(AppProvider provider) {
    final fotoProfile = provider.consumer?.fotoProfile;
    if (fotoProfile != null && fotoProfile.isNotEmpty) {
      final imageUrl = ApiService().getImageUrl(fotoProfile);
      return Image.network(
        imageUrl,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Icon(
            Icons.person_outline,
            size: 44,
            color: AppTheme.colors(context).mutedForeground,
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Center(
            child: CircularProgressIndicator(
              strokeWidth: 2,
              value: loadingProgress.expectedTotalBytes != null
                  ? loadingProgress.cumulativeBytesLoaded /
                      loadingProgress.expectedTotalBytes!
                  : null,
              valueColor: AlwaysStoppedAnimation<Color>(
                AppTheme.colors(context).gold.withValues(alpha: 0.5),
              ),
            ),
          );
        },
      );
    }
    return Icon(
      Icons.person_outline,
      size: 44,
      color: AppTheme.colors(context).mutedForeground,
    );
  }

  void _showAvatarSourceBottomSheet(BuildContext context, AppProvider provider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.colors(context).card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
        side: BorderSide(color: AppTheme.colors(context).border, width: 1),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ATUR FOTO PROFIL',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.5,
                    color: AppTheme.colors(context).foreground,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Pilih sumber gambar untuk memperbarui foto profil Anda.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.colors(context).mutedForeground,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickAndUploadImage(context, provider, ImageSource.camera);
                        },
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.colors(context).border),
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            color: AppTheme.colors(context).muted.withAlpha(10),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.camera_alt_outlined,
                                size: 28,
                                color: AppTheme.colors(context).gold,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Kamera',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.colors(context).foreground,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          Navigator.pop(ctx);
                          _pickAndUploadImage(context, provider, ImageSource.gallery);
                        },
                        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            border: Border.all(color: AppTheme.colors(context).border),
                            borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                            color: AppTheme.colors(context).muted.withAlpha(10),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.photo_library_outlined,
                                size: 28,
                                color: AppTheme.colors(context).gold,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Galeri',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppTheme.colors(context).foreground,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickAndUploadImage(
      BuildContext context, AppProvider provider, ImageSource source) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? file = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (file == null) return;

      final success = await provider.updateProfilePicture(File(file.path));

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              success
                  ? 'Foto profil berhasil diperbarui.'
                  : (provider.error ?? 'Gagal mengunggah foto profil.'),
            ),
            backgroundColor: success
                ? AppTheme.colors(context).success
                : AppTheme.colors(context).destructive,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: AppTheme.colors(context).destructive,
          ),
        );
      }
    }
  }
}
