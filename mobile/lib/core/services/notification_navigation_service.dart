import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class NotificationNavigationService {
  final GlobalKey<NavigatorState> navigatorKey;
  final Function() isAuthenticated;

  // Deduplication guard
  final Map<String, DateTime> _handledMessages = {};
  static const Duration _deduplicationWindow = Duration(seconds: 5);

  // Pending notification for logged-out users
  Map<String, dynamic>? _pendingNotificationData;

  NotificationNavigationService({
    required this.navigatorKey,
    required this.isAuthenticated,
  });

  /// Handle notification tap from foreground banner, background, or killed-app
  Future<void> handleNotificationTap(Map<String, dynamic> data) async {
    final messageId = data['messageId'] ?? data['google.message_id'];
    
    // Deduplication check
    if (messageId != null) {
      final lastHandled = _handledMessages[messageId];
      if (lastHandled != null) {
        final elapsed = DateTime.now().difference(lastHandled);
        if (elapsed < _deduplicationWindow) {
          debugPrint('[NotificationNavigation] Duplicate message ignored: $messageId');
          return;
        }
      }
      _handledMessages[messageId] = DateTime.now();
    }

    // Check auth state
    if (!isAuthenticated()) {
      _pendingNotificationData = data;
      navigatorKey.currentState?.pushNamed('/login');
      debugPrint('[NotificationNavigation] User not logged in, stored pending notification');
      return;
    }

    await _navigate(data);
  }

  /// Process pending notification after successful login
  Future<void> processPendingAfterLogin() async {
    if (_pendingNotificationData == null) return;

    final data = _pendingNotificationData!;
    _pendingNotificationData = null;

    debugPrint('[NotificationNavigation] Processing pending notification after login');
    await _navigate(data);
  }

  Future<void> _navigate(Map<String, dynamic> data) async {
    final type = data['type'];
    final targetScreen = data['targetScreen'];

    debugPrint('[NotificationNavigation] Navigating: type=$type, targetScreen=$targetScreen');

    // Special case: app update
    if (type == 'APP_UPDATE_AVAILABLE') {
      debugPrint('[NotificationNavigation] APP_UPDATE_AVAILABLE - handled by AppUpdateProvider');
      return;
    }

    switch (targetScreen) {
      case 'booking_details':
        final jobId = data['jobId'];
        if (jobId == null) {
          debugPrint('[NotificationNavigation] Missing jobId, falling back to notifications');
          _fallbackToNotifications();
          return;
        }
        navigatorKey.currentState?.pushNamed(
          '/booking-details',
          arguments: jobId,
        );
        break;

      case 'subscription':
        navigatorKey.currentState?.pushNamed('/subscription-plans');
        break;

      case 'earnings':
        // Navigate to marketer earnings screen (MarketerShell with earnings tab)
        navigatorKey.currentState?.pushNamed(
          '/earnings',
          arguments: {'tab': 'earnings'},
        );
        break;

      default:
        debugPrint('[NotificationNavigation] Unknown targetScreen: $targetScreen, falling back to notifications');
        _fallbackToNotifications();
    }
  }

  void _fallbackToNotifications() {
    navigatorKey.currentState?.pushNamed('/notifications');
  }

  /// Clean up old handled messages to prevent memory leak
  void cleanup() {
    final now = DateTime.now();
    _handledMessages.removeWhere((key, value) {
      return now.difference(value) > const Duration(minutes: 5);
    });
  }
}
