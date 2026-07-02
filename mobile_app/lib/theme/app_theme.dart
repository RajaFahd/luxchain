import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:provider/provider.dart';
import '../providers/app_provider.dart';

class AppTheme {
  // ===== LIGHT MODE — Luxury Gold (Warm Cream) =====
  static const Color background = Color(0xFFFAF8F4);     // warm cream
  static const Color foreground = Color(0xFF2A2520);      // dark brown
  static const Color card = Color(0xFFFFFFFF);            // white
  static const Color muted = Color(0xFFF0EBE0);           // cream panel
  static const Color mutedForeground = Color(0xFF8A8078); // warm grey
  static const Color accent = Color(0xFFB8963E);          // gold
  static const Color border = Color(0x2EB4965A);          // rgba(180,150,90,0.18)
  static const Color inputBg = Color(0xFFF5F2ED);         // light cream
  static const Color destructive = Color(0xFFD44040);     // red
  static const Color destructiveBg = Color(0x14D44040);    // red 8%
  static const Color success = Color(0xFF3A9E94);         // teal
  static const Color successBg = Color(0x143A9E94);       // teal 8%
  static const Color warning = Color(0xFFC86A4F);         // coral
  static const Color warningBg = Color(0x14C86A4F);       // coral 8%
  static const Color info = Color(0xFF7B5FC4);            // purple
  static const Color infoBg = Color(0x147B5FC4);          // purple 8%

  // Gold accent colors
  static const Color gold = Color(0xFFB8963E);            // light mode gold
  static const Color goldLight = Color(0xFFD4BE7E);       // lighter gold
  static const Color goldDark = Color(0xFF8A6F2E);        // darker gold

  // ===== DARK MODE — Luxury Gold (Deep Dark) =====
  static const Color darkBackground = Color(0xFF0A0A0F);      // deep dark
  static const Color darkForeground = Color(0xFFF0EDE8);      // warm white
  static const Color darkCard = Color(0xFF13131A);             // dark elevated
  static const Color darkMuted = Color(0xFF1A1A24);            // muted dark
  static const Color darkMutedForeground = Color(0xFF7A7A96);  // grey-purple
  static const Color darkAccent = Color(0xFFC8A96E);           // gold (dark)
  static const Color darkBorder = Color(0x26C8A96E);           // rgba(200,169,110,0.15)
  static const Color darkInputBg = Color(0xFF1E1E2A);          // dark panel
  static const Color darkDestructive = Color(0xFFE05C5C);      // coral red
  static const Color darkDestructiveBg = Color(0x1AE05C5C);    // coral red 10%
  static const Color darkSuccess = Color(0xFF5BBFB5);          // teal
  static const Color darkSuccessBg = Color(0x1A5BBFB5);       // teal 10%
  static const Color darkWarning = Color(0xFFE07A5F);          // warm coral
  static const Color darkWarningBg = Color(0x1AE07A5F);       // coral 10%
  static const Color darkInfo = Color(0xFF8B6FD4);             // purple
  static const Color darkInfoBg = Color(0x1A8B6FD4);          // purple 10%
  static const Color darkGold = Color(0xFFC8A96E);             // dark mode gold

  // ===== RADIUS (matching web: base 1rem = 16px) =====
  static const double radiusSm = 12;
  static const double radiusMd = 14;
  static const double radiusLg = 16;
  static const double radiusXl = 20;

  // ===== DYNAMIC COLORS =====
  static AppColors colors(BuildContext context) {
    try {
      final provider = Provider.of<AppProvider>(context, listen: false);
      return provider.isDarkMode ? _darkColors : _lightColors;
    } catch (_) {
      final isDark = Theme.of(context).brightness == Brightness.dark;
      return isDark ? _darkColors : _lightColors;
    }
  }

  static final AppColors _lightColors = AppColors(
    background: background,
    foreground: foreground,
    card: card,
    muted: muted,
    mutedForeground: mutedForeground,
    accent: accent,
    border: border,
    inputBg: inputBg,
    destructive: destructive,
    destructiveBg: destructiveBg,
    success: success,
    successBg: successBg,
    warning: warning,
    warningBg: warningBg,
    info: info,
    infoBg: infoBg,
    gold: gold,
    goldLight: goldLight,
    goldDark: goldDark,
  );

  static final AppColors _darkColors = AppColors(
    background: darkBackground,
    foreground: darkForeground,
    card: darkCard,
    muted: darkMuted,
    mutedForeground: darkMutedForeground,
    accent: darkAccent,
    border: darkBorder,
    inputBg: darkInputBg,
    destructive: darkDestructive,
    destructiveBg: darkDestructiveBg,
    success: darkSuccess,
    successBg: darkSuccessBg,
    warning: darkWarning,
    warningBg: darkWarningBg,
    info: darkInfo,
    infoBg: darkInfoBg,
    gold: darkGold,
    goldLight: darkGold, // reuse
    goldDark: darkGold,  // reuse
  );

  // ===== LIGHT THEME =====
  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      brightness: Brightness.light,
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.light(
        surface: background,
        onSurface: foreground,
        primary: gold,
        onPrimary: Colors.white,
        secondary: muted,
        onSecondary: foreground,
        error: destructive,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: foreground,
        ),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: border),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputBg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: gold, width: 1.5),
        ),
        hintStyle: const TextStyle(color: mutedForeground, fontSize: 14),
        labelStyle: const TextStyle(color: mutedForeground, fontSize: 13, fontWeight: FontWeight.w500),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: gold,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: gold,
          side: const BorderSide(color: gold),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      dividerTheme: const DividerThemeData(color: border, thickness: 1, space: 0),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: foreground),
        headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: foreground),
        titleLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: foreground),
        titleMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: foreground),
        bodyLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: foreground),
        bodyMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: mutedForeground),
        bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: mutedForeground),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: mutedForeground, letterSpacing: 0.5),
      ),
    );
  }

  // ===== DARK THEME =====
  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      colorScheme: const ColorScheme.dark(
        surface: darkBackground,
        onSurface: darkForeground,
        primary: darkGold,
        onPrimary: darkBackground,
        secondary: darkMuted,
        onSecondary: darkForeground,
        error: darkDestructive,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkBackground,
        foregroundColor: darkForeground,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: darkForeground,
        ),
      ),
      cardTheme: CardThemeData(
        color: darkCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLg),
          side: const BorderSide(color: darkBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkInputBg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMd),
          borderSide: const BorderSide(color: darkGold, width: 1.5),
        ),
        hintStyle: const TextStyle(color: darkMutedForeground, fontSize: 14),
        labelStyle: const TextStyle(color: darkMutedForeground, fontSize: 13, fontWeight: FontWeight.w500),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: darkGold,
          foregroundColor: darkBackground,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: darkGold,
          side: const BorderSide(color: darkGold),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radiusMd)),
          textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      dividerTheme: const DividerThemeData(color: darkBorder, thickness: 1, space: 0),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: darkForeground),
        headlineMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: darkForeground),
        titleLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: darkForeground),
        titleMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: darkForeground),
        bodyLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: darkForeground),
        bodyMedium: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: darkMutedForeground),
        bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: darkMutedForeground),
        labelSmall: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: darkMutedForeground, letterSpacing: 0.5),
      ),
    );
  }
}

class AppColors {
  final Color background;
  final Color foreground;
  final Color card;
  final Color muted;
  final Color mutedForeground;
  final Color accent;
  final Color border;
  final Color inputBg;
  final Color destructive;
  final Color destructiveBg;
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color info;
  final Color infoBg;
  final Color gold;
  final Color goldLight;
  final Color goldDark;

  AppColors({
    required this.background,
    required this.foreground,
    required this.card,
    required this.muted,
    required this.mutedForeground,
    required this.accent,
    required this.border,
    required this.inputBg,
    required this.destructive,
    required this.destructiveBg,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.info,
    required this.infoBg,
    required this.gold,
    required this.goldLight,
    required this.goldDark,
  });
}

