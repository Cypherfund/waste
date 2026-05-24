import 'package:flutter/foundation.dart';

class AppConfig {
  // Android emulator uses 10.0.2.2 to reach host's localhost.
  // Web (and desktop) reach the dev server directly via localhost.
  static const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');
  static const String _wsBaseUrlOverride = String.fromEnvironment('WS_BASE_URL');

  static String get apiBaseUrl {
    if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
    return 'https://om-combined.onrender.com/waste/api/v1';
  }

  static String get wsBaseUrl {
    debugPrint('[AppConfig] _wsBaseUrlOverride: "$_wsBaseUrlOverride"');
    debugPrint('[AppConfig] kIsWeb: $kIsWeb');
    if (_wsBaseUrlOverride.isNotEmpty) {
      return _wsBaseUrlOverride
          .replaceAll('wss://', 'https://')
          .replaceAll('ws://', 'http://')
          .replaceAll(RegExp(r'/+$'), '');
    }
    return 'https://om-combined.onrender.com';
  }

  static const String socketIoPath = '/waste/socket.io';
  static const String wsNamespace = '';
}
