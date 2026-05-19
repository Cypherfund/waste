import 'package:flutter/foundation.dart';
import '../services/api/notifications_api.dart';
import '../services/api/api_client.dart';

class NotificationsProvider extends ChangeNotifier {
  final NotificationsApi _api;

  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  String? _error;

  NotificationsProvider({required NotificationsApi api}) : _api = api;

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      _notifications = await _api.getNotifications();
    } catch (e) {
      _error = ApiClient.extractErrorMessage(e);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _api.markAsRead(id);
      final idx = _notifications.indexWhere((n) => n.id == id);
      if (idx != -1) {
        final old = _notifications[idx];
        _notifications[idx] = AppNotification(
          id: old.id,
          type: old.type,
          title: old.title,
          body: old.body,
          data: old.data,
          isRead: true,
          sentAt: old.sentAt,
          readAt: DateTime.now(),
          createdAt: old.createdAt,
        );
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> markAllAsRead() async {
    try {
      await _api.markAllAsRead();
      _notifications = _notifications.map((n) => AppNotification(
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            data: n.data,
            isRead: true,
            sentAt: n.sentAt,
            readAt: n.readAt ?? DateTime.now(),
            createdAt: n.createdAt,
          )).toList();
      notifyListeners();
    } catch (_) {}
  }

  void reset() {
    _notifications = [];
    _isLoading = false;
    _error = null;
    notifyListeners();
  }
}
