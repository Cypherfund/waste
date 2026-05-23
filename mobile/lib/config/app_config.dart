import 'package:flutter/foundation.dart';

class AppConfig {
  // Android emulator uses 10.0.2.2 to reach host's localhost.
  // Web (and desktop) reach the dev server directly via localhost.
  static const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');
  static const String _wsBaseUrlOverride = String.fromEnvironment('WS_BASE_URL');

  static String get apiBaseUrl {
    if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
    if (kIsWeb) return 'http://10.12.1.172:3001/api/v1';
    return 'http://10.12.1.172:3001/api/v1';
  }

  static String get wsBaseUrl {
    debugPrint('[AppConfig] _wsBaseUrlOverride: "$_wsBaseUrlOverride"');
    debugPrint('[AppConfig] kIsWeb: $kIsWeb');
    if (_wsBaseUrlOverride.isNotEmpty) {
      // Keep only the host, remove any trailing slashes
      return _wsBaseUrlOverride
          .replaceAll('wss://', 'https://')
          .replaceAll('ws://', 'http://')
          .replaceAll(RegExp(r'/+$'), '');
    }
    if (kIsWeb) return 'http://10.12.1.172:3001';
    return 'http://10.12.1.172:3001';
  }

  static const String socketIoPath = '/waste/socket.io';
  static const String wsNamespace = '';
}
