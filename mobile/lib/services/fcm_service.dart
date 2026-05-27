import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api/api_client.dart';

/// Top-level handler for background/terminated push messages.
/// Must be a top-level function (not a class method).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('[FCM] Background message: ${message.messageId}');
  // Background messages are handled by the OS notification tray.
  // Deep-link routing happens when the user taps the notification (via
  // FirebaseMessaging.onMessageOpenedApp in the foreground service).
}

class FcmService {
  final ApiClient _apiClient;
  final FirebaseMessaging _messaging;

  FcmService({
    required ApiClient apiClient,
    FirebaseMessaging? messaging,
  })  : _apiClient = apiClient,
        _messaging = messaging ?? FirebaseMessaging.instance;

  /// Call once after Firebase.initializeApp() and after user logs in.
  /// Requests permission, fetches token, registers it with the backend.
  Future<void> init({
    required void Function(RemoteMessage message) onForegroundMessage,
  }) async {
    await _requestPermission();
    await _registerToken();
    _listenForTokenRefresh();
    _listenForForegroundMessages(onForegroundMessage);
  }

  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('[FCM] Permission: ${settings.authorizationStatus}');
  }

  Future<void> _registerToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        await _sendTokenToBackend(token);
      }
    } catch (e) {
      debugPrint('[FCM] Failed to get token: $e');
    }
  }

  void _listenForTokenRefresh() {
    _messaging.onTokenRefresh.listen((newToken) async {
      debugPrint('[FCM] Token refreshed');
      await _sendTokenToBackend(newToken);
    });
  }

  void _listenForForegroundMessages(
    void Function(RemoteMessage message) handler,
  ) {
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('[FCM] Foreground message: ${message.notification?.title}');
      handler(message);
    });
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await _apiClient.dio.put(
        '/users/me/fcm-token',
        data: {'fcmToken': token},
      );
      debugPrint('[FCM] Token registered with backend');
    } catch (e) {
      debugPrint('[FCM] Failed to register token: $e');
    }
  }

  /// Returns the current FCM token (may be null before permission granted).
  Future<String?> getToken() => _messaging.getToken();
}
