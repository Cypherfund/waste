import 'package:flutter/foundation.dart';

class AppConfig {
  // Android emulator uses 10.0.2.2 to reach host's localhost.
  // Web (and desktop) reach the dev server directly via localhost.
  static const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');
  static const String _wsBaseUrlOverride = String.fromEnvironment('WS_BASE_URL');

  static String get apiBaseUrl {
    if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
    if (kIsWeb) return 'http://localhost:3001/api/v1';
    return 'http://10.0.2.2:3001/api/v1';
  }

  static String get wsBaseUrl {
    if (_wsBaseUrlOverride.isNotEmpty) return _wsBaseUrlOverride;
    if (kIsWeb) return 'http://localhost:3001';
    return 'http://10.0.2.2:3001';
  }

  static const String wsNamespace = '/ws';
}
